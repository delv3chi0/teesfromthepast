import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Icon,
  useToast,
  Alert,
  AlertIcon,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  Tooltip as ChakraTooltip,
  FormControl,
  FormLabel,
  Input as ChakraInput,
} from '@chakra-ui/react';
import { FaMagic, FaSave, FaUpload, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';

/**
 * DROP‑IN REPLACEMENT — Generate.jsx
 * ------------------------------------------------------------
 * - Keeps existing routes/exports intact
 * - Calls the same backend endpoints:
 *   POST /api/designs/create  (body: { prompt, initImageBase64? })
 *   POST /api/mydesigns       (body: { prompt, imageDataUrl?, masterUrl?, thumbUrl? })
 * - New retro UI: CRT TV + VCR combo, style/year knobs, VCR image upload
 * - Heavier decade weighting in prompt construction
 */

// ====== Configurable UI options ======
const ART_STYLES = ['Classic Art', 'Stencil Art', 'Embroidery Style'];
const DECADES = ['1960s', '1970s', '1980s', '1990s'];

// Era descriptors added to the prompt for stronger conditioning
const ERA_HINTS = {
  '1960s': '1960s aesthetic, Kodachrome film look, vintage print, muted colors, retro typography, mid-century style',
  '1970s': '1970s aesthetic, film grain, warm tones, analog photography, vintage magazine style, airbrushed poster',
  '1980s': '1980s aesthetic, analog film, slight grain, bold colors, retro pop culture, glossy poster look, store shelf art',
  '1990s': '1990s aesthetic, early digital, disposable camera look, pop magazine style, retro print design',
};

// Style descriptors
const STYLE_HINTS = {
  'Classic Art': 'photo-real, clean lighting, detailed, balanced tones, professional grade composition',
  'Stencil Art': 'high-contrast stencil art, bold outlines, cut vinyl look, limited values, posterized shapes, vector-friendly, clean edges',
  'Embroidery Style': 'embroidery patch design, satin stitch, limited color palette (6 colors), simplified vector shapes, clean edges, applique texture, thread detail',
};

const knobSize = 84; // px visual size for knobs

function Knob({ label, valueIndex, setIndex, options }) {
  const onStep = (dir) => {
    const n = options.length;
    setIndex((prev) => (prev + (dir > 0 ? 1 : n - 1)) % n);
  };
  return (
    <VStack spacing={2} userSelect="none">
      <Box
        position="relative"
        w={`${knobSize}px`}
        h={`${knobSize}px`}
        borderRadius="full"
        bg="linear-gradient(145deg, rgba(14,19,21,0.9), rgba(32,44,48,0.9))"
        border="2px solid rgba(255,255,255,0.15)"
        boxShadow="inset 0 4px 10px rgba(0,0,0,.6), 0 10px 20px rgba(0,0,0,.35)"
      >
        {/* indicator */}
        <Box
          position="absolute"
          left="50%"
          top="50%"
          w="2px"
          h="32px"
          bg="yellow.300"
          transform={`rotate(${(valueIndex / options.length) * 300 - 150}deg) translate(-50%, -115%)`}
          transformOrigin="top left"
          borderRadius="md"
        />
        {/* center cap */}
        <Box
          position="absolute"
          left="50%"
          top="50%"
          transform="translate(-50%, -50%)"
          w="34px"
          h="34px"
          borderRadius="full"
          bg="radial-gradient(circle at 40% 40%, #6b7174, #2b2f31)"
          border="2px solid rgba(0,0,0,.6)"
        />
      </Box>
      <HStack spacing={3}>
        <Button size="xs" variant="outline" onClick={() => onStep(-1)} leftIcon={<FaChevronLeft />}>Prev</Button>
        <Text color="whiteAlpha.900" fontWeight="semibold" minW="120px" textAlign="center">{options[valueIndex]}</Text>
        <Button size="xs" variant="outline" onClick={() => onStep(1)} rightIcon={<FaChevronRight />}>Next</Button>
      </HStack>
      <Text fontSize="xs" color="whiteAlpha.700">{label}</Text>
    </VStack>
  );
}

function VcrDeck({ file, setFile, disabled }) {
  const inputRef = useRef(null);
  const [hover, setHover] = useState(false);

  const onPick = () => inputRef.current?.click();
  const onFile = (f) => {
    setFile(f || null);
  };

  const handleChange = (e) => onFile(e.target.files?.[0]);
  const onDrop = (e) => {
    e.preventDefault();
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
    setHover(false);
  };

  return (
    <Box
      bg="#0b1416"
      border="2px solid rgba(255,255,255,.15)"
      rounded="md"
      p={4}
      w="100%"
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={onDrop}
    >
      <HStack align="center" spacing={4}>
        <Box flex="1" bg="#0e0e12" border="1px solid #2a3033" rounded="sm" h="48px" position="relative">
          <Box position="absolute" left="8px" top="10px" w="calc(100% - 16px)" h="28px" bg="#1b2326" border="1px solid #344044" rounded="sm" />
          <Box position="absolute" left="12px" top="14px" w="calc(100% - 24px)" h="20px" bg={hover ? '#1f2f35' : '#121b1e'} border="1px solid #2d3a3e" rounded="sm" />
          <Text position="absolute" left="14px" top="14px" fontSize="xs" color="whiteAlpha.700">
            {file ? file.name : 'Insert Image into VCR (drag & drop or click)'}
          </Text>
        </Box>
        <Button onClick={onPick} leftIcon={<Icon as={FaUpload} />} isDisabled={disabled}>Load</Button>
        <ChakraInput ref={inputRef} display="none" type="file" accept="image/*" onChange={handleChange} />
      </HStack>
      <HStack mt={3} spacing={6}>
        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0" color="whiteAlpha.800">Use VCR image</FormLabel>
          {/* This switch is cosmetic; we always send the image if provided. Kept to match UI expectations. */}
          <Switch isChecked={!!file} onChange={(e)=>{ if (!e.target.checked) onFile(null); }} isDisabled={disabled} colorScheme="yellow"/>
        </FormControl>
        <Text fontSize="xs" color="whiteAlpha.600">(Optional) Provide a starting image for image‑to‑image</Text>
      </HStack>
    </Box>
  );
}

export default function Generate() {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);

  const [styleIndex, setStyleIndex] = useState(0);
  const [decadeIndex, setDecadeIndex] = useState(2); // default 1980s
  const [retroOn, setRetroOn] = useState(true);

  const toast = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const artStyle = ART_STYLES[styleIndex];
  const decade = DECADES[decadeIndex];

  // Build the final prompt, heavily weighting decade/style
  const finalPrompt = useMemo(() => {
    let p = prompt?.trim() || '';
    const parts = [];
    if (p) parts.push(p);
    if (artStyle) parts.push(STYLE_HINTS[artStyle]);
    if (retroOn && decade) parts.push(ERA_HINTS[decade]);

    // Bonus hints that tend to help print‑friendly results
    parts.push('clean composition, printable artwork');

    return parts.filter(Boolean).join(', ');
  }, [prompt, artStyle, retroOn, decade]);

  const handleApiError = (err, defaultMessage, actionType = 'operation') => {
    const message = err?.response?.data?.message || defaultMessage;
    if (err?.response?.status === 401) {
      toast({ title: 'Session Expired', status: 'error', isClosable: true });
      logout();
      navigate('/login');
    } else {
      toast({ title: `${actionType} Failed`, description: message, status: 'error', isClosable: true });
    }
    setError(message);
  };

  const readFileAsDataUrl = (f) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });

  const handleGenerate = useCallback(async () => {
    if (!finalPrompt) {
      toast({ title: 'Please enter a prompt first.', status: 'info' });
      return;
    }
    setLoading(true);
    setError('');
    setImageUrl('');

    try {
      const body = { prompt: finalPrompt };
      if (file) {
        body.initImageBase64 = await readFileAsDataUrl(file);
      }

      const res = await client.post('/designs/create', body);
      const { imageDataUrl, masterUrl, previewUrl, thumbUrl } = res.data || {};

      setImageUrl(imageDataUrl || masterUrl || previewUrl || '');
      // Stash for Save
      window.__lastGen = { imageDataUrl, masterUrl, thumbUrl, prompt: finalPrompt };
    } catch (err) {
      handleApiError(err, 'Failed to generate image.', 'Generation');
    } finally {
      setLoading(false);
    }
  }, [finalPrompt, file]);

  const handleSave = useCallback(async () => {
    const gen = window.__lastGen;
    if (!gen?.imageDataUrl && !gen?.masterUrl) {
      toast({ title: 'Nothing to save yet', status: 'info' });
      return;
    }
    setIsSaving(true);
    try {
      await client.post('/mydesigns', {
        prompt: gen.prompt || finalPrompt || prompt,
        imageDataUrl: gen.imageDataUrl,
        masterUrl: gen.masterUrl,
        thumbUrl: gen.thumbUrl,
      });
      toast({ title: 'Design Saved!', description: "Find it under ‘My Designs’.", status: 'success', isClosable: true });
    } catch (err) {
      handleApiError(err, 'Failed to save design.', 'Save');
    } finally {
      setIsSaving(false);
    }
  }, [finalPrompt, prompt]);

  return (
    <VStack spacing={8} w="100%" px={{ base: 3, md: 6 }}>
      <Heading as="h1" size="2xl" color="brand.textLight">AI Image Generator</Heading>

      {/* TV + VCR combo */}
      <Box
        w="100%"
        maxW="980px"
        bg="#0c1719"
        border="8px solid #0a0f10"
        rounded="2xl"
        boxShadow="0 18px 60px rgba(0,0,0,.55), inset 0 0 0 2px rgba(255,255,255,.06)"
        p={{ base: 3, md: 6 }}
      >
        <HStack align="stretch" spacing={{ base: 4, md: 8 }}>
          {/* CRT body */}
          <VStack flex="1" spacing={4}>
            {/* Screen */}
            <Box
              position="relative"
              w="100%"
              pt="60%" // aspect ratio 5:3ish
              bg="#071013"
              border="6px solid #0a0f10"
              rounded="lg"
              overflow="hidden"
              boxShadow="inset 0 0 35px rgba(0,0,0,.8), inset 0 0 240px rgba(18, 255, 196, .05)"
            >
              {/* image */}
              {imageUrl ? (
                <Box as="img" src={imageUrl} alt={prompt || 'Generated Art'}
                  position="absolute" inset={0} w="100%" h="100%" objectFit="contain" />
              ) : (
                <VStack position="absolute" inset={0} align="center" justify="center" spacing={3}>
                  <Icon as={FaMagic} boxSize={12} color="whiteAlpha.700" />
                  <Text color="whiteAlpha.800">Your Generated Image Will Appear Here</Text>
                </VStack>
              )}
              {/* scanline overlay */}
              <Box position="absolute" inset={0} pointerEvents="none" bg="repeating-linear-gradient(transparent, transparent 2px, rgba(255,255,255,.03) 2px, rgba(0,0,0,.03) 4px)" />
              {/* subtle curve highlight */}
              <Box position="absolute" inset={0} pointerEvents="none" bg="radial-gradient(120% 90% at 50% -20%, rgba(255,255,255,.14), transparent 60%)" />
            </Box>

            {/* VCR Deck */}
            <VcrDeck file={file} setFile={setFile} disabled={loading || isSaving} />
          </VStack>

          {/* Side controls / knobs */}
          <VStack w={{ base: 'auto', md: '240px' }} spacing={6} align="center" justify="flex-start">
            <Knob label="Art Style" valueIndex={styleIndex} setIndex={setStyleIndex} options={ART_STYLES} />

            <VStack spacing={3}>
              <HStack spacing={3}>
                <Switch isChecked={retroOn} onChange={(e)=>setRetroOn(e.target.checked)} colorScheme="yellow" />
                <Text color="whiteAlpha.900" fontWeight="semibold">Retro Mode</Text>
              </HStack>
              <Box opacity={retroOn ? 1 : .45} pointerEvents={retroOn ? 'auto' : 'none'}>
                <Knob label="Decade" valueIndex={decadeIndex} setIndex={setDecadeIndex} options={DECADES} />
              </Box>
            </VStack>

            {/* Prompt box */}
            <FormControl>
              <FormLabel color="whiteAlpha.800">Describe your image idea</FormLabel>
              <ChakraInput
                value={prompt}
                onChange={(e)=>setPrompt(e.target.value)}
                placeholder="e.g., A dolphin kicking a game winning field goal"
                bg="brand.secondary"
                borderColor="whiteAlpha.300"
                _hover={{ borderColor: 'whiteAlpha.400' }}
                focusBorderColor="brand.accentYellow"
              />
            </FormControl>

            <VStack w="100%" spacing={3}>
              <Button
                onClick={handleGenerate}
                colorScheme="brandAccentOrange"
                isLoading={loading}
                loadingText="Generating..."
                isDisabled={isSaving || loading || !prompt}
                leftIcon={<Icon as={FaMagic} />}
                w="100%"
              >
                Generate Image
              </Button>
              <Button
                onClick={handleSave}
                colorScheme="brandAccentYellow"
                isLoading={isSaving}
                loadingText="Saving..."
                isDisabled={loading}
                leftIcon={<Icon as={FaSave} />}
                w="100%"
              >
                Save This Design
              </Button>
            </VStack>

            {/* Live prompt preview (dev aid) */}
            <Box w="100%" p={3} bg="blackAlpha.500" border="1px solid" borderColor="whiteAlpha.300" rounded="md">
              <Text fontSize="xs" color="whiteAlpha.700">Prompt preview:</Text>
              <Text fontSize="xs" color="whiteAlpha.900">{finalPrompt || '(enter a prompt to see the final text)'}</Text>
            </Box>
          </VStack>
        </HStack>
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


