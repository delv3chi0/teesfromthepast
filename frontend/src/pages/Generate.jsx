// frontend/src/pages/Generate.jsx
import {
  Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, Icon,
  Alert, AlertIcon, FormControl, FormLabel, Flex, HStack, Slider, SliderTrack,
  SliderFilledTrack, SliderThumb, Tooltip as ChakraTooltip, Input as ChakraInput,
  VisuallyHidden, useBreakpointValue
} from "@chakra-ui/react";
import { useState, useMemo } from "react";
import { client } from "../api/client";
import { useAuth } from "../context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { FaMagic, FaSave, FaUpload, FaPowerOff } from "react-icons/fa";

// ----------------- Options & “secret sauce” phrases -----------------
const ART_STYLES = ["Classic Art", "Stencil Art", "Embroidery Style"];
const DECADES = ["1960s", "1970s", "1980s", "1990s"];

const STYLE_PHRASES = {
  "Classic Art": "",
  "Stencil Art": "monochrome stencil, crisp outlines, bold shapes, high contrast, cut-paper aesthetic, vector-safe edges",
  "Embroidery Style": "embroidery pattern, satin stitch, thread texture, limited color palette, digitizing-friendly, clean vector edges"
};
const DECADE_PHRASES = {
  "1960s": "1960s film look, vintage color cast, analog grain, period-correct style",
  "1970s": "1970s photo, warm film stock, soft halation, retro vibe",
  "1980s": "1980s snapshot, kodachrome tones, subtle noise, nostalgic palette",
  "1990s": "1990s print, slight matte finish, era-accurate style"
};

// ----------------- Antenna (pure CSS) -----------------
function Antenna() {
  return (
    <Box position="absolute" top="-54px" left="50%" transform="translateX(-50%)" w="160px" h="60px">
      <Box position="absolute" left="50%" bottom="0" transform="translateX(-50%)" w="18px" h="18px" bg="gray.600" rounded="full" boxShadow="inset 0 0 3px rgba(0,0,0,.7)" />
      <Box position="absolute" left="calc(50% - 6px)" bottom="10px" w="12px" h="24px" bg="gray.700" rounded="sm" />
      {/* ears */}
      <Box position="absolute" left="50%" bottom="22px" w="2px" h="70px" bg="gray.400" transformOrigin="bottom" transform="translateX(-50%) rotate(-25deg)" boxShadow="0 0 2px rgba(0,0,0,.6)"/>
      <Box position="absolute" left="50%" bottom="22px" w="2px" h="70px" bg="gray.400" transformOrigin="bottom" transform="translateX(-50%) rotate(25deg)" boxShadow="0 0 2px rgba(0,0,0,.6)"/>
    </Box>
  );
}

// ----------------- Power Switch -----------------
function PowerSwitch({ on, setOn }) {
  return (
    <Button
      onClick={() => setOn(!on)}
      size="md"
      leftIcon={<FaPowerOff />}
      bg={on ? "red.500" : "gray.700"}
      _hover={{ bg: on ? "red.400" : "gray.600" }}
      color="white"
      rounded="full"
      title="Power"
      aria-pressed={on}
    >
      Power
    </Button>
  );
}

// ----------------- Rotary Dial (TV-like) -----------------
function Dial({ label, value, options, onChange, ariaLabel }) {
  const idx = options.indexOf(value);
  const anglePerStop = 300 / (options.length - 1); // wide sweep
  const baseAngle = -150;
  const angle = baseAngle + idx * anglePerStop;

  const next = () => onChange(options[(idx + 1) % options.length]);
  const prev = () => onChange(options[(idx - 1 + options.length) % options.length]);

  return (
    <VStack minW="110px" spacing={2} userSelect="none">
      <Text fontWeight="bold" color="yellow.300">{label}</Text>
      <Box position="relative">
        {/* bezel plate */}
        <Box
          w="110px" h="110px" rounded="full"
          bgGradient="linear(to-b, #b2b2b2, #757575)"
          boxShadow="inset 0 1px 2px rgba(255,255,255,.5), inset 0 -2px 4px rgba(0,0,0,.4), 0 8px 18px rgba(0,0,0,.45)"
          border="2px solid #333"
        />
        {/* ticks */}
        {Array.from({ length: options.length }).map((_, i) => {
          const a = baseAngle + i * anglePerStop;
          const rad = (a * Math.PI) / 180;
          const R = 44;
          const x = 55 + Math.cos(rad) * R;
          const y = 55 + Math.sin(rad) * R;
          return (
            <Box key={i} position="absolute" left={`${x}px`} top={`${y}px`} w="4px" h="4px" rounded="full"
                 bg={i === idx ? "yellow.300" : "blackAlpha.800"} />
          );
        })}
        {/* dial */}
        <Box
          role="button"
          aria-label={ariaLabel}
          tabIndex={0}
          onClick={next}
          onContextMenu={(e)=>{ e.preventDefault(); prev(); }}
          onKeyDown={(e)=>{ if(e.key==='ArrowRight') next(); if(e.key==='ArrowLeft') prev(); if(e.key==='Enter') next(); }}
          position="absolute" left="50%" top="50%" transform={`translate(-50%,-50%) rotate(${angle}deg)`}
          w="84px" h="84px" rounded="full"
          bgGradient="radial(circle at 35% 35%, #eaeaea, #9a9a9a 50%, #5d5d5d 70%, #3c3c3c)"
          border="4px solid #1f1f1f"
          boxShadow="inset 0 1px 10px rgba(0,0,0,.6), 0 8px 18px rgba(0,0,0,.5)"
          cursor="pointer"
          transition="transform .15s ease"
        >
          {/* indicator ridge */}
          <Box position="absolute" top="6px" left="50%" transform="translateX(-50%)" w="5px" h="18px" bg="yellow.300" rounded="sm"/>
        </Box>
      </Box>
      <Text fontSize="sm" color="whiteAlpha.900">{value}</Text>
    </VStack>
  );
}

// ----------------- VCR with preview + image strength -----------------
function VCR({ file, setFile, strength, setStrength, disabled }) {
  const handleFile = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };
  return (
    <Box
      mt={4}
      bgGradient="linear(to-b, #151a22, #0f141c)"
      border="2px solid #0d1117"
      rounded="lg"
      p={4}
      boxShadow="inset 0 0 0 2px #1a2230, 0 10px 28px rgba(0,0,0,.5)"
    >
      {/* slot */}
      <Box h="16px" bgGradient="linear(to-b, #050709, #0c1118)" rounded="sm" />
      <Flex mt={3} align="center" justify="space-between" wrap="wrap" gap={4}>
        <HStack spacing={4} align="center">
          <Box
            w="72px" h="48px" bg="black"
            border="2px solid #202837" rounded="sm"
            display="grid" placeItems="center"
          >
            {file ? (
              <Image
                src={URL.createObjectURL(file)}
                alt="init preview"
                objectFit="cover"
                w="100%" h="100%"
              />
            ) : (
              <Text fontSize="xs" color="whiteAlpha.600">No Tape</Text>
            )}
          </Box>
          <Box>
            <Text fontWeight="semibold" color="whiteAlpha.900">VCR Tape</Text>
            <Text fontSize="xs" color="whiteAlpha.600">Optional: use your image for image-to-image</Text>
          </Box>
        </HStack>

        <HStack spacing={3} flex="1" minW="260px">
          <Text color="whiteAlpha.800" fontSize="sm" whiteSpace="nowrap">Image Influence</Text>
          <Slider
            value={strength}
            min={0} max={100} step={1}
            onChange={setStrength}
            isDisabled={disabled}
          >
            <SliderTrack><SliderFilledTrack /></SliderTrack>
            <SliderThumb />
          </Slider>
          <Text w="38px" textAlign="right" color="whiteAlpha.700" fontSize="sm">{strength}%</Text>
        </HStack>

        <ChakraInput
          type="file"
          accept="image/*"
          onChange={handleFile}
          disabled={disabled}
          w={useBreakpointValue({ base: "100%", md: "auto" })}
          sx={{
            bg: "blackAlpha.400",
            borderColor: "whiteAlpha.300",
            color: "whiteAlpha.900",
            _hover: { borderColor: "whiteAlpha.500" },
            _disabled: { opacity: .6 }
          }}
        />
      </Flex>
    </Box>
  );
}

// ----------------- Main Page -----------------
export default function Generate() {
  const [powerOn, setPowerOn] = useState(true);
  const [userPrompt, setUserPrompt] = useState("");
  const [artStyle, setArtStyle] = useState("Classic Art");
  const [decade, setDecade] = useState("1980s");
  const [initImageFile, setInitImageFile] = useState(null);
  const [imgStrength, setImgStrength] = useState(35); // % → sent as 0.0–0.75

  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const toast = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Build “seasoned” prompt (kept secret from UI/DB)
  const finalPrompt = useMemo(() => {
    const parts = [userPrompt];
    if (STYLE_PHRASES[artStyle]) parts.push(STYLE_PHRASES[artStyle]);
    if (DECADE_PHRASES[decade]) parts.push(DECADE_PHRASES[decade]);
    return parts.filter(Boolean).join(", ").trim();
  }, [userPrompt, artStyle, decade]);

  const handleError = (err, fallback) => {
    const msg = err?.response?.data?.message || fallback;
    if (err?.response?.status === 401) { toast({ title: "Session expired", status: "error" }); logout(); navigate("/login"); }
    else { toast({ title: "Error", description: msg, status: "error" }); }
    setError(msg);
  };

  const handleGenerate = async () => {
    if (!powerOn) { toast({ title: "Turn the TV on first 😉", status: "info" }); return; }
    if (!userPrompt.trim()) { toast({ title: "Please describe your image idea.", status: "info" }); return; }
    setLoading(true); setError(""); setImageUrl("");
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
        // Map 0–100 → 0.0–0.75 (stability good zone)
        body.imageStrength = Math.round((imgStrength / 100) * 75) / 100;
      }
      const { data } = await client.post("/designs/create", body);
      const { imageDataUrl, masterUrl, thumbUrl } = data;
      setImageUrl(imageDataUrl || masterUrl || "");
      // Save ONLY the user-entered prompt
      (window).__lastGen = { imageDataUrl, masterUrl, thumbUrl, prompt: userPrompt };
    } catch (e) {
      handleError(e, "Failed to generate image.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const gen = (window).__lastGen;
    if (!gen?.imageDataUrl && !gen?.masterUrl) { toast({ title: "Nothing to save yet", status: "info" }); return; }
    setIsSaving(true);
    try {
      await client.post("/mydesigns", {
        prompt: gen.prompt || userPrompt, // ONLY user text
        imageDataUrl: gen.imageDataUrl,
        masterUrl: gen.masterUrl,
        thumbUrl: gen.thumbUrl,
      });
      toast({ title: "Design saved!", status: "success" });
    } catch (e) {
      handleError(e, "Failed to save design.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <VStack spacing={8} w="100%" pb={10}>
      <Heading as="h1" size="2xl" color="brand.textLight">AI Image Generator</Heading>

      {/* CONSOLE TV SHELL */}
      <Box
        position="relative"
        w="100%" maxW="980px"
        rounded="2xl"
        p={{ base: 3, md: 5 }}
        bgGradient="
          linear(135deg, #432a1a, #2f1e13 55%, #3e2618),
          repeating-linear(90deg, rgba(255,255,255,.04) 0 2px, rgba(0,0,0,.06) 2px 4px)
        "
        border="8px solid rgba(0,0,0,.45)"
        boxShadow="0 18px 40px rgba(0,0,0,.6), inset 0 0 0 2px rgba(0,0,0,.35)"
      >
        <Antenna />

        {/* Brand plaque */}
        <Box
          position="absolute" top="-28px" left="20px"
          bgGradient="linear(to-b, #cbb67b, #8f7e4e)"
          color="#1f1408"
          fontWeight="bold"
          px={3} py={1}
          rounded="md"
          border="2px solid #4a3a22"
          boxShadow="0 6px 14px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.35)"
          fontFamily="'Trebuchet MS', system-ui, sans-serif"
        >
          TeesFromThePast
        </Box>

        {/* Bezel + Screen */}
        <Box
          bgGradient="linear(to-b, #d7d7d7, #999)"
          border="3px solid #2c2c2c"
          rounded="xl"
          p={{ base: 2, md: 3 }}
          boxShadow="inset 0 1px 3px rgba(255,255,255,.6), inset 0 -2px 4px rgba(0,0,0,.3)"
        >
          <Box
            rounded="lg"
            p={{ base: 2, md: 3 }}
            bg="#0b1720"
            border="1px solid rgba(255,255,255,.08)"
            boxShadow="inset 0 0 70px rgba(0,0,0,.85)"
          >
            <Box
              h={{ base: "260px", md: "440px" }}
              rounded="md"
              overflow="hidden"
              position="relative"
              bg={powerOn ? "linear-gradient(180deg, #0f2230, #0b1b26)" : "#000"}
              border="1px solid rgba(255,255,255,.06)"
              filter={powerOn ? "saturate(1) brightness(1)" : "saturate(.2) brightness(.4)"}
              transition="filter .2s ease, background .2s ease"
            >
              {/* light glare when on */}
              {powerOn && (
                <Box position="absolute" inset="0"
                     bg="linear-gradient(120deg, rgba(255,255,255,.08), transparent 40%)"
                     pointerEvents="none"/>
              )}
              {loading && (
                <Flex align="center" justify="center" h="100%">
                  <Spinner size="xl" />
                </Flex>
              )}
              {!loading && imageUrl && (
                <Image src={imageUrl} alt="Generated" objectFit="contain" w="100%" h="100%"/>
              )}
              {!loading && !imageUrl && (
                <Flex align="center" justify="center" h="100%" direction="column" color="whiteAlpha.700">
                  <Icon as={FaMagic} boxSize="56px" mb={3} />
                  <Text>Your Generated Image Will Appear Here</Text>
                </Flex>
              )}
            </Box>

            {/* control bar */}
            <Flex mt={4} align="center" justify="space-between" wrap="wrap" gap={4}>
              <PowerSwitch on={powerOn} setOn={setPowerOn} />
              <HStack spacing={8}>
                <Dial label="Art Style" value={artStyle} options={ART_STYLES} onChange={setArtStyle} ariaLabel="Art style dial"/>
                <Dial label="Decade" value={decade} options={DECADES} onChange={setDecade} ariaLabel="Decade dial"/>
              </HStack>
            </Flex>
          </Box>
        </Box>

        {/* VCR */}
        <VCR
          file={initImageFile}
          setFile={setInitImageFile}
          strength={imgStrength}
          setStrength={setImgStrength}
          disabled={loading || isSaving}
        />

        {/* USER PROMPT (moved here, higher contrast) */}
        <Box mt={5}>
          <FormControl>
            <FormLabel color="yellow.200" fontWeight="bold">Describe your image idea</FormLabel>
            <Textarea
              value={userPrompt}
              onChange={(e)=>setUserPrompt(e.target.value)}
              placeholder="Example: A yeti tossing snowballs at kids in the neighborhood"
              minH="110px"
              bg="rgba(0,0,0,.35)"
              color="whiteAlpha.900"
              _placeholder={{ color: "whiteAlpha.700" }}
              border="1px solid rgba(255,255,255,.25)"
              _hover={{ borderColor: "whiteAlpha.400" }}
              focusBorderColor="yellow.300"
              isDisabled={loading || isSaving}
            />
          </FormControl>
        </Box>

        {/* Actions */}
        <Flex mt={5} gap={4} wrap="wrap">
          <Button
            onClick={handleGenerate}
            colorScheme="orange"
            isLoading={loading}
            loadingText="Generating..."
            isDisabled={isSaving || loading || !userPrompt.trim() || !powerOn}
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
        <Alert status="error" colorScheme="red" borderRadius="md" p={4} borderWidth="1px" maxW="980px" w="100%">
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      )}
    </VStack>
  );
}
