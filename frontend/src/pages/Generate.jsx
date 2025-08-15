// frontend/src/pages/Generate.jsx
import {
  Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, Icon,
  Alert, AlertIcon, FormControl, FormLabel, Flex, Collapse, Tooltip as ChakraTooltip,
  Input as ChakraInput, HStack
} from "@chakra-ui/react";
import { useState, useCallback, useMemo } from "react";
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { FaMagic, FaSave, FaUpload } from 'react-icons/fa';

// ----------------- constants -----------------
const ART_STYLES = ["Classic Art", "Stencil Art", "Embroidery Style"];
const DECADES = ["1960s", "1970s", "1980s", "1990s"];

// stronger style language for each option (server stays secret)
const STYLE_PHRASES = {
  "Classic Art": "",
  "Stencil Art": "monochrome stencil, crisp outlines, high contrast, posterized, vector look",
  "Embroidery Style": "embroidery pattern, satin stitch, limited color palette, thread texture, vector-friendly"
};
const DECADE_PHRASES = {
  "1960s": "1960s film look, vintage color, analog grain",
  "1970s": "1970s photo, warm film stock, retro vibe",
  "1980s": "1980s snapshot, kodachrome, nostalgic tones",
  "1990s": "1990s print, subtle film grain, era-accurate style"
};

// ----------------- rotary dial -----------------
function Dial({
  label,
  value,            // string from options
  options,          // array of strings
  onChange,         // (nextString)
  ariaLabel,
}) {
  const idx = options.indexOf(value);
  const anglePerStop = 240 / (options.length - 1); // sweep across ~240°
  const baseAngle = -120; // start at -120° → +120°
  const angle = baseAngle + idx * anglePerStop;

  const next = () => onChange(options[(idx + 1) % options.length]);
  const prev = () => onChange(options[(idx - 1 + options.length) % options.length]);

  // drag to rotate
  const [dragging, setDragging] = useState(false);
  const onMouseDown = (e) => { e.preventDefault(); setDragging(true); };
  const onMouseUp = () => setDragging(false);
  const onMouseMove = (e) => {
    if (!dragging) return;
    // simple left/right motion to rotate
    if (e.movementX > 1) next();
    if (e.movementX < -1) prev();
  };

  return (
    <VStack spacing={2} userSelect="none" onMouseUp={onMouseUp} onMouseMove={onMouseMove}>
      <Text fontWeight="bold" color="brand.textLight">{label}</Text>
      <Box
        role="button"
        aria-label={ariaLabel}
        onClick={next}
        onContextMenu={(e)=>{e.preventDefault(); prev();}}
        onMouseDown={onMouseDown}
        tabIndex={0}
        onKeyDown={(e)=>{ if(e.key==='ArrowRight') next(); if(e.key==='ArrowLeft') prev(); if(e.key==='Enter') next(); }}
        w="84px" h="84px"
        rounded="full"
        position="relative"
        transition="transform .15s ease"
        transform={`rotate(${angle}deg)`}
        // knob skin
        bgGradient="radial(circle at 35% 35%, rgba(255,255,255,.25), rgba(0,0,0,.35)), radial(circle at 65% 65%, rgba(0,0,0,.25), rgba(0,0,0,.55))"
        border="4px solid"
        borderColor="blackAlpha.700"
        boxShadow="inset 0 1px 8px rgba(0,0,0,.6), 0 4px 18px rgba(0,0,0,.45)"
        cursor="pointer"
      >
        {/* marker */}
        <Box position="absolute" left="50%" top="8px" w="3px" h="16px" bg="yellow.300" rounded="sm" transform="translateX(-50%) rotate(-90deg)" />
      </Box>
      <Text fontSize="sm" color="yellow.300">{value}</Text>
      <HStack spacing={2} pt={1}>
        {options.map((opt, i) => (
          <Box key={opt} w="6px" h="6px" rounded="full"
               bg={i===idx ? "yellow.300" : "whiteAlpha.400"} />
        ))}
      </HStack>
    </VStack>
  );
}

// ----------------- VCR upload -----------------
function VcrUpload({ onFileChange, disabled }) {
  const [fileName, setFileName] = useState("No file chosen");
  const handle = (e) => {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : "No file chosen");
    onFileChange(file || null);
  };

  return (
    <Box
      bg="#12161d"
      border="3px solid #0d1016"
      rounded="lg"
      w="100%"
      p={4}
      position="relative"
      boxShadow="inset 0 0 0 2px #1d2430, 0 8px 24px rgba(0,0,0,.45)"
    >
      {/* faux slot */}
      <Box h="18px" bgGradient="linear(to-b, #0a0d12, #0f141c)" rounded="sm" />
      {/* bezel */}
      <Flex mt={4} justify="space-between" align="center">
        <Text color="whiteAlpha.800" fontWeight="semibold" fontSize="sm">VCR</Text>
        <Text color="whiteAlpha.600" fontSize="xs">{fileName}</Text>
      </Flex>

      <ChakraInput
        type="file"
        accept="image/*"
        onChange={handle}
        mt={3}
        disabled={disabled}
        sx={{
          bg: "blackAlpha.400",
          borderColor: "whiteAlpha.300",
          color: "whiteAlpha.900",
          _hover: { borderColor: "whiteAlpha.500" },
          _disabled: { opacity: 0.5, cursor: "not-allowed" }
        }}
      />
    </Box>
  );
}

// ----------------- main page -----------------
export default function Generate() {
  // secret sauce stays on server; we only show user prompt field
  const [userPrompt, setUserPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [artStyle, setArtStyle] = useState(ART_STYLES[0]);
  const [decade, setDecade] = useState("1980s");
  const [retroMode, setRetroMode] = useState(true);

  const [initImageFile, setInitImageFile] = useState(null);

  const toast = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleApiError = (err, fallback) => {
    const msg = err.response?.data?.message || fallback;
    if (err.response?.status === 401) {
      toast({ title: "Session expired", status: "error" });
      logout(); navigate("/login");
    } else {
      toast({ title: "Error", description: msg, status: "error" });
    }
    setError(msg);
  };

  // Build final prompt BUT DO NOT SHOW IT
  const finalPrompt = useMemo(() => {
    const parts = [userPrompt];
    if (STYLE_PHRASES[artStyle]) parts.push(STYLE_PHRASES[artStyle]);
    if (retroMode && DECADE_PHRASES[decade]) parts.push(DECADE_PHRASES[decade]);
    // keep flexible for future seasoning
    return parts.filter(Boolean).join(", ").trim();
  }, [userPrompt, artStyle, decade, retroMode]);

  const handleGenerate = async () => {
    if (!userPrompt.trim()) {
      toast({ title: "Please describe your image idea.", status: "info" });
      return;
    }
    setLoading(true);
    setError(""); setImageUrl("");

    try {
      const body = { prompt: finalPrompt };
      if (initImageFile) {
        const reader = new FileReader();
        const base64 = await new Promise((res, rej) => {
          reader.onloadend = () => res(reader.result);
          reader.onerror = rej;
          reader.readAsDataURL(initImageFile);
        });
        body.initImageBase64 = base64;
      }
      const { data } = await client.post("/designs/create", body);
      const { imageDataUrl, masterUrl, thumbUrl } = data;

      setImageUrl(imageDataUrl || masterUrl || "");
      // stash for Save
      (window).__lastGen = {
        imageDataUrl, masterUrl, thumbUrl,
        prompt: userPrompt    // store ONLY user-entered prompt (not our seasoning)
      };
    } catch (e) {
      handleApiError(e, "Failed to generate image.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const gen = (window).__lastGen;
    if (!gen?.imageDataUrl && !gen?.masterUrl) {
      toast({ title: "Nothing to save yet", status: "info" });
      return;
    }
    setIsSaving(true);
    try {
      await client.post("/mydesigns", {
        prompt: gen.prompt || userPrompt,     // ONLY user prompt is persisted
        imageDataUrl: gen.imageDataUrl,
        masterUrl: gen.masterUrl,
        thumbUrl: gen.thumbUrl
      });
      toast({ title: "Design saved!", status: "success" });
    } catch (e) {
      handleApiError(e, "Failed to save design.");
    } finally {
      setIsSaving(false);
    }
  };

  // ----------------- UI -----------------
  return (
    <VStack spacing={8} w="100%" pb={10}>
      <Heading as="h1" size="2xl" color="brand.textLight">AI Image Generator</Heading>

      {/* WOOD-TV WRAPPER */}
      <Box
        w="100%" maxW="900px"
        rounded="3xl"
        p={{ base: 4, md: 6 }}
        // woodgrain made from layered gradients
        bgGradient="
          linear(135deg, #3b2618, #2a1a11 55%, #3a2417),
          repeating-linear(90deg, rgba(255,255,255,.04) 0 2px, rgba(0,0,0,.06) 2px 4px)
        "
        boxShadow="0 18px 40px rgba(0,0,0,.55), inset 0 0 0 2px rgba(0,0,0,.25)"
        border="6px solid rgba(0,0,0,.35)"
      >
        {/* TV/SCREEN */}
        <Box
          bg="brand.secondary"
          rounded="xl"
          p={{ base: 3, md: 4 }}
          border="2px solid rgba(0,0,0,.45)"
          boxShadow="inset 0 0 0 2px rgba(255,255,255,.05)"
          position="relative"
        >
          {/* “glass” bezel */}
          <Box
            rounded="lg"
            bg="#0b1720"
            border="1px solid rgba(255,255,255,.06)"
            boxShadow="inset 0 0 60px rgba(0,0,0,.8)"
            p={{ base: 2, md: 3 }}
          >
            <Box
              h={{ base: "260px", md: "420px" }}
              rounded="md"
              overflow="hidden"
              position="relative"
              bg="linear-gradient(180deg, #0e2230, #0b1b26)"
              border="1px solid rgba(255,255,255,.06)"
            >
              {/* subtle glare */}
              <Box position="absolute" inset="0"
                   bg="linear-gradient(120deg, rgba(255,255,255,.08), transparent 40%)"
                   pointerEvents="none"/>
              {loading && (
                <Flex align="center" justify="center" h="100%">
                  <Spinner size="xl" />
                </Flex>
              )}
              {!loading && imageUrl && (
                <Image src={imageUrl} alt="Generated" objectFit="contain" w="100%" h="100%" />
              )}
              {!loading && !imageUrl && (
                <Flex align="center" justify="center" h="100%" direction="column" color="whiteAlpha.700">
                  <Icon as={FaMagic} boxSize="56px" mb={3} />
                  <Text>Your Generated Image Will Appear Here</Text>
                </Flex>
              )}
            </Box>
          </Box>

          {/* control cluster (dials) */}
          <Flex mt={4} gap={8} wrap="wrap" align="center" justify="space-between">
            <Dial
              label="Art Style"
              value={artStyle}
              options={ART_STYLES}
              onChange={setArtStyle}
              ariaLabel="Art style dial"
            />
            <Dial
              label="Decade"
              value={decade}
              options={DECADES}
              onChange={setDecade}
              ariaLabel="Decade dial"
            />
          </Flex>
        </Box>

        {/* VCR BELOW THE SCREEN */}
        <Box mt={5}>
          <VcrUpload onFileChange={setInitImageFile} disabled={loading || isSaving} />
        </Box>

        {/* (1) MOVED the user prompt BELOW the VCR, with better contrast */}
        <Box mt={5}>
          <FormControl>
            <FormLabel color="yellow.200" fontWeight="bold">Describe your image idea</FormLabel>
            <Textarea
              value={userPrompt}
              onChange={(e)=>setUserPrompt(e.target.value)}
              placeholder="Example: a Bigfoot blasting a boombox in a neon arcade"
              minH="110px"
              bg="rgba(0,0,0,.35)"
              color="whiteAlpha.900"                 // <-- brighter text
              _placeholder={{ color: "whiteAlpha.700" }}  // <-- brighter placeholder
              border="1px solid rgba(255,255,255,.25)"
              _hover={{ borderColor: "whiteAlpha.400" }}
              focusBorderColor="yellow.300"
              isDisabled={loading || isSaving}
            />
          </FormControl>
        </Box>

        <Flex mt={5} gap={4} wrap="wrap">
          <Button
            onClick={handleGenerate}
            colorScheme="orange"
            isLoading={loading}
            loadingText="Generating..."
            isDisabled={isSaving || loading || !userPrompt.trim()}
            leftIcon={<Icon as={FaMagic} />}
            size="lg"
          >
            Generate Image
          </Button>
          <Button
            onClick={handleSave}
            colorScheme="yellow"
            isLoading={isSaving}
            loadingText="Saving..."
            isDisabled={loading}
            size="lg"
            leftIcon={<Icon as={FaSave} />}
          >
            Save This Design
          </Button>
        </Flex>
      </Box>

      {error && (
        <Alert status="error" colorScheme="red" borderRadius="md" p={4} borderWidth="1px" maxW="900px" w="100%">
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      )}
    </VStack>
  );
}
