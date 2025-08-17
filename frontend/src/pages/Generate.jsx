// frontend/src/pages/Generate.jsx
import {
  Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, Icon,
  Alert, AlertIcon, HStack, Slider, SliderTrack, SliderFilledTrack, SliderThumb,
  useBoolean, Tooltip, Badge, Select, Collapse, Kbd
} from "@chakra-ui/react";
import { useState, useCallback, useMemo, useRef } from "react";
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import {
  FaMagic, FaSave, FaPowerOff, FaPlay, FaFastForward, FaBackward, FaEject,
  FaSlidersH
} from 'react-icons/fa';

const ART_STYLES = ["Classic Art", "Stencil Art", "Embroidery Style"];
const DECADES = ["1960s", "1970s", "1980s", "1990s"];
const ARS = ["1:1","3:2","2:3","16:9","9:16"]; // T2I only
const clamp01 = (n) => Math.max(0, Math.min(1, n));

/**
 * UX: "Resemblance to Photo" (0..100%)
 * Model: "strength" (0..1) — higher = change more, lower = preserve more
 * We map resemblance -> strength with a friendly bounded range.
 * - resemblance 100%  => strength ~ 0.15 (keep most of the photo)
 * - resemblance 0%    => strength ~ 0.85 (follow prompt, change a lot)
 */
function mapResemblanceToStrength(resemblance01) {
  const MIN = 0.15, MAX = 0.85; // sensible range for Stability I2I Ultra
  // resemblance01 1 -> MIN, 0 -> MAX
  return clamp01(MIN + (1 - resemblance01) * (MAX - MIN));
}

export default function Generate() {
  const [powerOn, setPowerOn] = useBoolean(true);
  const [styleIx, setStyleIx] = useState(0);
  const [decadeIx, setDecadeIx] = useState(2);

  // Advanced controls
  const [aspectRatio, setAspectRatio] = useState("1:1"); // T2I only
  const [cfgScale, setCfgScale] = useState(7);           // 1..20
  const [steps, setSteps] = useState(30);                // 10..50
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showAdvanced, setShowAdvanced] = useBoolean(false);

  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [userPrompt, setUserPrompt] = useState("");

  // VCR / image-to-image
  const [initFile, setInitFile] = useState(null);
  const [initPreview, setInitPreview] = useState("");
  // NEW: Resemblance (user-facing). 0..1 → show as 0..100% in UI
  const [resemblance, setResemblance] = useState(0.7); // start preserving most of the photo
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
    p = `${p}, photographed in the ${decade}, vintage film grain, era-accurate styling, era-specific color palette, authentic wardrobe and objects`;
    return p.trim();
  }, [userPrompt, artStyle, decade]);

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

      // Only pass aspect ratio for text-to-image
      if (!initPreview) payload.aspectRatio = aspectRatio || '1:1';

      // I2I attachments
      if (initPreview) {
        payload.initImageBase64 = initPreview;
        payload.imageStrength = mapResemblanceToStrength(clamp01(resemblance));
      }

      const resp = await client.post('/designs/create', payload);
      const { imageDataUrl, previewUrl, masterUrl, thumbUrl, publicId, meta } = resp.data || {};

      // Prefer Cloudinary preview if available
      setImageUrl(previewUrl || imageDataUrl || "");

      // Stash the last generation for "Save"
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
          imageStrength: initPreview ? mapResemblanceToStrength(clamp01(resemblance)) : undefined,
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
          imageStrength: initPreview ? mapResemblanceToStrength(clamp01(resemblance)) : undefined
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

      {/* TV console */}
      <Box
        w="min(1040px, 92vw)"
        borderRadius="14px"
        p={0} position="relative"
        boxShadow="0 12px 60px rgba(0,0,0,.6)"
        bgGradient="linear(to-b, #6b4423, #5a391c)"
        border="10px solid #3f2a16"
        _before={{ content: '""', position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 8px #8b5a2b, inset 0 0 60px rgba(0,0,0,.6)' }}
      >
        {/* Antenna */}
        <Box position="absolute" left="50%" top="-40px" transform="translateX(-50%)" zIndex={2}>
          <Box w="2px" h="38px" bg="gray.500" mx="auto" />
          <HStack spacing={8} justify="center" mt="-6px">
            <Box w="90px" h="2px" bg="gray.500" transform="rotate(-18deg)" />
            <Box w="90px" h="2px" bg="gray.500" transform="rotate(18deg)" />
          </HStack>
        </Box>

        <Badge colorScheme="yellow" position="absolute" top="6px" left="16px" fontFamily="monospace">TeesFromThePast</Badge>

        {/* VCR deck */}
        <Box mx="16px" mt="10px" mb={2} p={3}
          bgGradient="linear(to-b, #141922, #0f141c)"
          border="2px solid #2b3442" borderRadius="8px"
          boxShadow="inset 0 0 30px rgba(0,0,0,.6)"
        >
          <HStack spacing={4} align="center">
            {/* Thumbnail window */}
            <Box w="64px" h="48px" bg="black" border="2px solid #333" borderRadius="4px" overflow="hidden">
              {initPreview ? <Image src={initPreview} alt="VCR tape preview" w="100%" h="100%" objectFit="cover" /> : <Box w="100%" h="100%" bgGradient="linear(to-b, #222, #111)"/>}
            </Box>

            {/* Deck controls */}
            <HStack spacing={2}>
              <Tooltip label="Rewind"><Button size="xs" leftIcon={<FaBackward/>} variant="outline" colorScheme="gray">Rew</Button></Tooltip>
              <Tooltip label="Play"><Button size="xs" leftIcon={<FaPlay/>} variant="outline" colorScheme="gray">Play</Button></Tooltip>
              <Tooltip label="Fast Forward"><Button size="xs" leftIcon={<FaFastForward/>} variant="outline" colorScheme="gray">FF</Button></Tooltip>
              <Tooltip label="Eject (clear image)">
                <Button size="xs" leftIcon={<FaEject/>} colorScheme="pink" onClick={() => { handleFile(null); }}>
                  Eject
                </Button>
              </Tooltip>
            </HStack>

            {/* INSERT TAPE SLOT (click or drop) */}
            <Box flex="1">
              {/* Hidden input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
              />
              {/* Slot */}
              <Box
                role="button"
                aria-label="Insert Tape"
                onClick={openFilePicker}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openFilePicker()}
                tabIndex={0}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                h="46px"
                bgGradient={dragOver
                  ? "linear(to-b, #1b2431, #1a2433)"
                  : "linear(to-b, #111722, #0c121b)"
                }
                border="1px solid #3b4656"
                borderRadius="6px"
                boxShadow="inset 0 -6px 12px rgba(0,0,0,.6), inset 0 2px 8px rgba(255,255,255,.04)"
                display="flex" alignItems="center" justifyContent="center"
                cursor="pointer"
                position="relative"
              >
                <Box position="absolute" inset="4px" border="1px solid rgba(255,255,255,.08)" borderRadius="4px" />
                <Text fontSize="sm" color="gray.200" letterSpacing="widest">
                  {initPreview ? "TAPE LOADED – CLICK TO REPLACE" : "INSERT TAPE"}
                </Text>
              </Box>

              {/* Resemblance (I2I only) */}
              {initPreview && (
                <HStack mt={1} spacing={3} align="center">
                  <Tooltip
                    label="How much the final image should resemble your photo. Left: exact photo. Right: follow the prompt."
                    hasArrow
                  >
                    <Text fontSize="xs" color="gray.300">Resemblance</Text>
                  </Tooltip>
                  <Slider
                    value={resemblance}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={setResemblance}
                    aria-label="Resemblance to source photo"
                  >
                    <SliderTrack><SliderFilledTrack/></SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text fontSize="xs" color="gray.300">{Math.round(resemblance * 100)}%</Text>
                </HStack>
              )}
              {!initPreview && (
                <Text mt={1} fontSize="xs" color="gray.400">
                  Upload a photo to enable <em>Resemblance</em>.
                </Text>
              )}
              <HStack justify="space-between" mt={1}>
                <Text fontSize="xs" color="gray.400">← exact photo</Text>
                <Text fontSize="xs" color="gray.400">follow prompt →</Text>
              </HStack>
            </Box>

            <Box ml="auto" color="gray.400">⋮</Box>
          </HStack>
        </Box>

        {/* Speakers + Screen */}
        <HStack align="stretch" spacing={0} px="16px" pb="16px">
          <Box w={{ base:'0', md:'120px' }} display={{ base:'none', md:'block' }}
            bgGradient="linear(to-b, #5a3a1f, #4a2f19)" borderRight="6px solid #2d1d0f">
            <Box m="12px" h="calc(100% - 24px)" bgGradient="linear(to-b, #3b2716, #301e11)" border="1px solid #1f140b" />
          </Box>

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

            <HStack w="100%" justify="space-between" py={3} align="center" flexWrap="wrap" rowGap={3}>
              <Button size="sm" leftIcon={<FaPowerOff/>} colorScheme={powerOn ? 'pink' : 'gray'} onClick={setPowerOn.toggle}>
                Power
              </Button>
              <HStack spacing={10}>
                <VStack spacing={1}><Text fontSize="xs" color="yellow.300">Art Style</Text>
                  <Dial valueIx={styleIx} setValueIx={setStyleIx} labels={ART_STYLES}/></VStack>
                <VStack spacing={1}><Text fontSize="xs" color="yellow.300">Decade</Text>
                  <Dial valueIx={decadeIx} setValueIx={setDecadeIx} labels={DECADES}/></VStack>
              </HStack>

              {/* Aspect ratio (T2I only) */}
              {!initPreview && (
                <HStack spacing={2}>
                  <Text fontSize="xs" color="yellow.300">Aspect</Text>
                  <Select size="sm" value={aspectRatio} onChange={(e)=>setAspectRatio(e.target.value)} bg="brand.primaryDark" borderColor="whiteAlpha.300">
                    {ARS.map(ar => <option key={ar} value={ar}>{ar}</option>)}
                  </Select>
                </HStack>
              )}
            </HStack>
          </VStack>

          <Box w={{ base:'0', md:'120px' }} display={{ base:'none', md:'block' }}
            bgGradient="linear(to-b, #5a3a1f, #4a2f19)" borderLeft="6px solid #2d1d0f">
            <Box m="12px" h="calc(100% - 24px)" bgGradient="linear(to-b, #3b2716, #301e11)" border="1px solid #1f140b" />
          </Box>
        </HStack>

        {/* Prompt */}
        <Box mx="16px" mb="8px" bg="rgba(0,0,0,.35)" border="1px solid rgba(0,0,0,.6)" borderRadius="8px" p={3}>
          <Text fontSize="sm" color="yellow.200" mb={2}>Describe your image idea</Text>
          <Textarea
            placeholder="e.g. Turn this cat into a regal lion with a majestic mane"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            bg="rgba(0,0,0,.5)" color="white"
            _placeholder={{ color: 'whiteAlpha.700' }}
          />
        </Box>

        {/* Flip-down Advanced Panel Trigger (retro service panel) */}
        <Box mx="16px" mb="16px" position="relative">
          <Box
            as="button"
            onClick={setShowAdvanced.toggle}
            w="100%"
            borderRadius="8px"
            bgGradient="linear(to-b, #1a1f29, #0f141c)"
            border="1px solid #2b3442"
            boxShadow="inset 0 0 30px rgba(0,0,0,.6)"
            py={2}
            display="flex"
            alignItems="center"
            justifyContent="center"
            position="relative"
            _hover={{ filter: 'brightness(1.05)' }}
          >
            {/* decorative knobs */}
            <Box
              position="absolute" left="10px" top="50%" transform="translateY(-50%)"
              w="26px" h="26px" borderRadius="50%"
              bgGradient="linear(to-b, #2c3748, #1d2633)" border="2px solid #0d1118"
              boxShadow="inset 0 3px 8px rgba(255,255,255,.05), inset 0 -4px 8px rgba(0,0,0,.6)"
            />
            <Box
              position="absolute" right="10px" top="50%" transform="translateY(-50%)"
              w="26px" h="26px" borderRadius="50%"
              bgGradient="linear(to-b, #2c3748, #1d2633)" border="2px solid #0d1118"
              boxShadow="inset 0 3px 8px rgba(255,255,255,.05), inset 0 -4px 8px rgba(0,0,0,.6)"
            />
            <HStack spacing={2} color="yellow.200">
              <Icon as={FaSlidersH} />
              <Text fontWeight="semibold">
                {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
              </Text>
            </HStack>
          </Box>

          {/* Flip-down content */}
          <Collapse in={showAdvanced} animateOpacity>
            <Box
              mt={2} p={4}
              bg="rgba(0,0,0,.35)" border="1px solid rgba(0,0,0,.6)" borderRadius="8px"
            >
              {/* Negative prompt */}
              <Text fontSize="sm" color="yellow.200" mb={2}>Things to avoid</Text>
              <Textarea
                placeholder="e.g. cartoon, text, watermarks, extra limbs"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                bg="rgba(0,0,0,.5)" color="white"
                _placeholder={{ color: 'whiteAlpha.700' }}
              />

              {/* CFG & Steps */}
              <HStack mt={4} spacing={6} align="center" flexWrap="wrap">
                <HStack minW="280px" flex="1">
                  <Tooltip
                    label="Prompt strictness: higher = follows your words more exactly (but can look overcooked). Try 7–9."
                    hasArrow
                  >
                    <Text fontSize="sm" color="whiteAlpha.800" w="130px">CFG (Prompt Strictness)</Text>
                  </Tooltip>
                  <Slider value={cfgScale} min={1} max={20} step={1} onChange={setCfgScale}>
                    <SliderTrack><SliderFilledTrack/></SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text fontSize="sm" color="whiteAlpha.800" w="40px" textAlign="right">{cfgScale}</Text>
                </HStack>
                <HStack minW="280px" flex="1">
                  <Tooltip
                    label="Detail level: 25–40 is usually sharp and clean. Higher has diminishing returns."
                    hasArrow
                  >
                    <Text fontSize="sm" color="whiteAlpha.800" w="130px">Steps (Detail)</Text>
                  </Tooltip>
                  <Slider value={steps} min={10} max={50} step={1} onChange={setSteps}>
                    <SliderTrack><SliderFilledTrack/></SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text fontSize="sm" color="whiteAlpha.800" w="40px" textAlign="right">{steps}</Text>
                </HStack>
              </HStack>

              {/* Aspect hint */}
              {!initPreview && (
                <Text mt={3} fontSize="xs" color="whiteAlpha.700">
                  <Kbd>Aspect</Kbd> is only used for text-to-image. For image-to-image we match your photo and upscale.
                </Text>
              )}
            </Box>
          </Collapse>
        </Box>
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
