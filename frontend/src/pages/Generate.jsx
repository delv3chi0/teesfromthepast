// frontend/src/pages/Generate.jsx
import {
  Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, Icon,
  Alert, AlertIcon, HStack, Slider, SliderTrack, SliderFilledTrack, SliderThumb,
  useBoolean, Tooltip, Badge, Select, Tag, TagLabel, TagCloseButton
} from "@chakra-ui/react";
import { useState, useCallback, useMemo, useRef } from "react";
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { FaMagic, FaSave, FaPowerOff, FaPlay, FaFastForward, FaBackward, FaEject } from 'react-icons/fa';
import { cld } from '../utils/cloudinary';

const ART_STYLES = ["Classic Art", "Stencil Art", "Embroidery Style"];
const DECADES = ["1960s", "1970s", "1980s", "1990s"];
const ARS = ["1:1","3:2","2:3","16:9","9:16"]; // T2I only
const clamp01 = (n) => Math.max(0, Math.min(1, n));

/** map resemblance slider (0..100) → Stability i2i strength (0.15..0.85) */
const strengthFromResemblance = (resVal) => {
  const v = Math.max(0, Math.min(100, Number(resVal) || 0));
  return 0.15 + (v / 100) * 0.70;
};
const resemblanceFromStrength = (s) => {
  const v = ((Math.max(0.15, Math.min(0.85, s)) - 0.15) / 0.70) * 100;
  return Math.round(v);
};

const PRESETS = {
  fun:       { label: 'Fun Mode',     strength: 0.65, cfg: 12, steps: 40, extra: 'whimsical, fantasy, vibrant colors' },
  photoreal: { label: 'Photoreal',    strength: 0.25, cfg: 7,  steps: 30, extra: 'realistic, natural lighting, high detail' },
  bold:      { label: 'Bold Style',   strength: 0.50, cfg: 10, steps: 35, extra: 'bold colors, stylized, dynamic composition' },
};

export default function Generate() {
  const [powerOn, setPowerOn] = useBoolean(true);
  const [styleIx, setStyleIx] = useState(0);
  const [decadeIx, setDecadeIx] = useState(2);

  const [aspectRatio, setAspectRatio] = useState("1:1"); // T2I only
  const [cfgScale, setCfgScale] = useState(7);
  const [steps, setSteps] = useState(30);
  const [negativePrompt, setNegativePrompt] = useState("");

  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [userPrompt, setUserPrompt] = useState("");

  const [activePreset, setActivePreset] = useState(null);
  const [presetExtra, setPresetExtra] = useState("");

  const [initFile, setInitFile] = useState(null);
  const [initPreview, setInitPreview] = useState("");
  const [resemblance, setResemblance] = useState(35);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const toast = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const artStyle = ART_STYLES[styleIx];
  const decade = DECADES[decadeIx];

  const constructedPrompt = useMemo(() => {
    let p = userPrompt || "";
    if (artStyle === "Stencil Art") {
      p = `monochromatic stencil art, high contrast, clean crisp outlines, vector friendly, ${p}`;
    } else if (artStyle === "Embroidery Style") {
      p = `embroidery pattern, satin stitch, limited color palette, crisp borders, vector-friendly, ${p}`;
    }
    if (presetExtra) p = `${p}, ${presetExtra}`;
    p = `${p}, photographed in the ${decade}, vintage film grain, era-accurate styling, era-specific color palette, authentic wardrobe and objects`;
    return p.trim();
  }, [userPrompt, artStyle, decade, presetExtra]);

  const handleApiError = (err, defaultMessage, actionType = "operation") => {
    const message = err.response?.data?.message || defaultMessage;
    if (err.response?.status === 401) {
      toast({ title: 'Session Expired', status: 'error', isClosable: true });
      logout(); navigate('/login');
    } else {
      toast({ title: `${actionType} Failed`, description: message, status: 'error', isClosable: true });
    }
    setError(message);
  };

  const handleFile = useCallback((file) => {
    setInitFile(file || null);
    if (!file) { setInitPreview(""); return; }
    const reader = new FileReader();
    reader.onloadend = () => setInitPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  }, []);

  const openFilePicker = () => fileInputRef.current?.click();

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  const applyPreset = (key) => {
    const p = PRESETS[key];
    if (!p) return;
    setActivePreset(key);
    setPresetExtra(p.extra);
    setCfgScale(p.cfg);
    setSteps(p.steps);
    setResemblance(resemblanceFromStrength(p.strength));
    toast({
      title: `${p.label} preset applied`,
      description: `Resemblance, CFG and Steps tuned for ${p.label.toLowerCase()}.`,
      status: 'info',
      isClosable: true
    });
  };
  const clearPreset = () => { setActivePreset(null); setPresetExtra(""); };

  const handleGenerate = async () => {
    if (!powerOn) { toast({ title: "TV is off", description: "Turn power on to generate.", status: "info" }); return; }
    if (!constructedPrompt) { toast({ title: "Describe your image first", status: "info" }); return; }

    setLoading(true); setError(""); setImageUrl("");
    try {
      const payload = {
        prompt: constructedPrompt,
        negativePrompt: negativePrompt || undefined,
        cfgScale,
        steps
      };
      if (!initPreview) payload.aspectRatio = aspectRatio || '1:1';
      if (initPreview) {
        const strength = strengthFromResemblance(resemblance);
        payload.initImageBase64 = initPreview;
        payload.imageStrength = clamp01(strength);
      }

      const resp = await client.post('/designs/create', payload);
      const { imageDataUrl, previewUrl, masterUrl, thumbUrl, publicId, meta } = resp.data || {};

      // Prefer Cloudinary preview with f_auto/q_auto if present
      const bestForScreen =
        cld.preview(previewUrl || masterUrl || "") ||
        cld.preview(thumbUrl || "") ||
        imageDataUrl ||
        "";
      setImageUrl(bestForScreen);

      (window).__lastGen = {
        prompt: userPrompt || '',
        negativePrompt: negativePrompt || '',
        imageDataUrl: imageDataUrl || '',
        masterUrl: masterUrl || '',
        previewUrl: previewUrl || '',
        thumbUrl: thumbUrl || '',
        publicId: publicId || '',
        settings: {
          mode: initPreview ? 'i2i' : 't2i',
          cfgScale,
          steps,
          aspectRatio: initPreview ? undefined : aspectRatio,
          imageStrength: initPreview ? clamp01(strengthFromResemblance(resemblance)) : undefined,
          preset: activePreset || undefined,
          ...meta
        }
      };
    } catch (err) {
      handleApiError(err, 'Failed to generate image.', 'Generation');
    } finally { setLoading(false); }
  };

  const handleSaveDesign = async () => {
    const gen = (window).__lastGen;
    if (!gen || (!gen.imageDataUrl && !gen.masterUrl)) {
      toast({ title: 'Nothing to save yet', status: 'info' });
      return;
    }
    setIsSaving(true);
    try {
      await client.post('/mydesigns', {
        prompt: gen.prompt || userPrompt || '(untitled)',
        negativePrompt: gen.negativePrompt || negativePrompt || '',
        imageDataUrl: gen.imageDataUrl || undefined,
        masterUrl: gen.masterUrl || undefined,
        previewUrl: gen.previewUrl || undefined,
        thumbUrl: gen.thumbUrl || undefined,
        publicId: gen.publicId || undefined,
        settings: gen.settings || {
          mode: initPreview ? 'i2i' : 't2i',
          cfgScale,
          steps,
          aspectRatio: initPreview ? undefined : aspectRatio,
          imageStrength: initPreview ? clamp01(strengthFromResemblance(resemblance)) : undefined
        }
      });
      toast({ title: 'Design Saved!', description: "Check “My Designs”.", status: 'success', isClosable: true });
    } catch (err) {
      handleApiError(err, 'Failed to save design.', 'Save');
    } finally { setIsSaving(false); }
  };

  const Dial = ({ valueIx, setValueIx, labels }) => {
    const n = labels.length;
    const angle = -120 + (240 * (valueIx / (n - 1)));
    return (
      <VStack spacing={1} minW="84px">
        <Box
          w="64px" h="64px" borderRadius="50%"
          bgGradient="radial(gray.700 20%, gray.800 60%)"
          position="relative"
          boxShadow="inset 0 6px 18px rgba(0,0,0,.6), 0 2px 6px rgba(0,0,0,.6)"
          border="2px solid #1a1a1a"
          cursor="pointer"
          onClick={() => setValueIx((valueIx + 1) % n)}
          _active={{ transform: "scale(0.98)" }}
        >
          {[...Array(12)].map((_, i) => (
            <Box key={i} position="absolute" left="50%" top="50%"
              w="2px" h="8px" bg="gray.500"
              transform={`translate(-1px,-32px) rotate(${i * 30}deg)`}
              transformOrigin="1px 32px" borderRadius="1px" opacity={0.7} />
          ))}
          <Box position="absolute" left="50%" top="50%"
            w="54px" h="54px" borderRadius="50%"
            transform="translate(-27px,-27px)"
            bgGradient="linear(to-b, gray.900, gray.700)"
            boxShadow="inset 0 10px 20px rgba(255,255,255,.05), inset 0 -8px 18px rgba(0,0,0,.6)" />
          <Box position="absolute" left="50%" top="50%"
            transform={`translate(-2px,-30px) rotate(${angle}deg)`}
            transformOrigin="2px 30px"
            w="4px" h="30px" bg="yellow.300" borderRadius="2px"
            boxShadow="0 0 6px rgba(255,255,0,.6)" />
        </Box>
        <Text fontSize="xs" color="gray.300">{labels[valueIx]}</Text>
      </VStack>
    );
  };

  return (
    <VStack spacing={8} w="100%">
      <Heading as="h1" size="2xl" color="brand.textLight">AI IMAGE GENERATOR</Heading>

      {/* ... UI omitted for brevity; unchanged layout ... */}

      <Box
        w="min(1040px, 92vw)"
        borderRadius="14px"
        p={0} position="relative"
        boxShadow="0 12px 60px rgba(0,0,0,.6)"
        bgGradient="linear(to-b, #6b4423, #5a391c)"
        border="10px solid #3f2a16"
        _before={{ content: '""', position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 8px #8b5a2b, inset 0 0 60px rgba(0,0,0,.6)' }}
      >
        {/* ... antenna & VCR controls unchanged ... */}

        <HStack align="stretch" spacing={0} px="16px" pb="16px">
          {/* speaker left */}
          <Box w={{ base:'0', md:'120px' }} display={{ base:'none', md:'block' }}
            bgGradient="linear(to-b, #5a3a1f, #4a2f19)" borderRight="6px solid #2d1d0f">
            <Box m="12px" h="calc(100% - 24px)" bgGradient="linear(to-b, #3b2716, #301e11)" border="1px solid #1f140b" />
          </Box>

          {/* screen */}
          <VStack flex="1" spacing={0} bg="#0b111a" border="8px solid #a1a5ad" borderRadius="10px" p="10px" mx="16px"
            boxShadow="inset 0 0 80px rgba(0,0,0,.8), 0 6px 20px rgba(0,0,0,.6)">
            <Box position="relative" w="100%" h={{ base:'360px', md:'520px' }}
              bgGradient={powerOn ? "linear(to-b, #0f1825, #0a111c)" : "linear(to-b, #090909, #060606)"}
              borderRadius="6px" overflow="hidden">
              {!imageUrl && powerOn && (
                <Box position="absolute" inset={0}
                  backgroundImage="repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0px, rgba(255,255,255,.06) 1px, transparent 2px, transparent 3px)"
                  opacity={0.25}/>
              )}
              {imageUrl ? (
                <Image src={imageUrl} alt="Generated" w="100%" h="100%" objectFit="contain" />
              ) : (
                <VStack w="100%" h="100%" align="center" justify="center" color="gray.300">
                  {loading ? <Spinner size="xl" /> : (<><Icon as={FaMagic} boxSize="10" opacity={0.7}/><Text>Your Generated Image Will Appear Here</Text></>)}
                </VStack>
              )}
              <Text position="absolute" bottom="8px" w="100%" textAlign="center" fontSize="xs" color="gray.400">
                Tune your image or disable the retro-renderer.
              </Text>
            </Box>

            {/* ... rest of panel unchanged ... */}
          </VStack>

          {/* speaker right */}
          <Box w={{ base:'0', md:'120px' }} display={{ base:'none', md:'block' }}
            bgGradient="linear(to-b, #5a3a1f, #4a2f19)" borderLeft="6px solid #2d1d0f">
            <Box m="12px" h="calc(100% - 24px)" bgGradient="linear(to-b, #3b2716, #301e11)" border="1px solid #1f140b" />
          </Box>
        </HStack>

        {/* prompt + advanced controls unchanged */}
      </Box>

      {error && (
        <Alert status="error" colorScheme="red" borderRadius="md" p={4} borderWidth="1px">
          <AlertIcon /><Text>{error}</Text>
        </Alert>
      )}

      <HStack>
        <Button onClick={handleGenerate} colorScheme="brandAccentOrange" isLoading={loading} leftIcon={<Icon as={FaMagic} />}>
          Generate Image
        </Button>
        <Button onClick={handleSaveDesign} colorScheme="brandAccentYellow" isLoading={isSaving} leftIcon={<Icon as={FaSave} />}>
          Save This Design
        </Button>
      </HStack>
    </VStack>
  );
}
