// frontend/src/pages/Generate.jsx
import {
  Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, Icon,
  Alert, AlertIcon, HStack, Slider, SliderTrack, SliderFilledTrack, SliderThumb,
  useBoolean, Tooltip, Badge
} from "@chakra-ui/react";
import { useState, useCallback, useMemo } from "react";
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { FaMagic, FaSave, FaPowerOff, FaPlay, FaFastForward, FaBackward, FaEject } from 'react-icons/fa';

// --- Controls
const ART_STYLES = ["Classic Art", "Stencil Art", "Embroidery Style"];
const DECADES = ["1960s", "1970s", "1980s", "1990s"];

const clamp01 = (n) => Math.max(0, Math.min(1, n));

export default function Generate() {
  const [powerOn, setPowerOn] = useBoolean(true);
  const [styleIx, setStyleIx] = useState(0);
  const [decadeIx, setDecadeIx] = useState(2);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [userPrompt, setUserPrompt] = useState("");

  // VCR/i2i inputs
  const [initFile, setInitFile] = useState(null);
  const [initPreview, setInitPreview] = useState("");
  const [imageInfluence, setImageInfluence] = useState(0.35); // 0..1

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
    // Heavier “retro-renderer” seasoning:
    p = `${p}, photographed in the ${decade}, vintage film grain, era-accurate styling, era-specific color palette, authentic wardrobe and objects`;
    return p.trim();
  }, [userPrompt, artStyle, decade]);

  const handleApiError = (err, defaultMessage, actionType = "operation") => {
    const message = err.response?.data?.message || defaultMessage;
    if (err.response?.status === 401) {
      toast({ title: 'Session Expired', status: 'error', isClosable: true });
      logout();
      navigate('/login');
    } else {
      toast({ title: `${actionType} Failed`, description: message, status: 'error', isClosable: true });
    }
    setError(message);
  };

  const handleFile = useCallback((file) => {
    setInitFile(file || null);
    if (!file) {
      setInitPreview("");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setInitPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  }, []);

  const handleGenerate = async () => {
    if (!powerOn) {
      toast({ title: "TV is off", description: "Turn power on to generate.", status: "info" });
      return;
    }
    if (!constructedPrompt) {
      toast({ title: "Describe your image first", status: "info" });
      return;
    }

    setLoading(true);
    setError("");
    setImageUrl("");

    try {
      const payload = {
        prompt: constructedPrompt,
        aspectRatio: '1:1',
      };

      if (initPreview) {
        payload.initImageBase64 = initPreview;             // i2i path
        payload.imageStrength = clamp01(imageInfluence);   // 0..1
      }

      const resp = await client.post('/designs/create', payload);
      const { imageDataUrl } = resp.data || {};
      setImageUrl(imageDataUrl || "");
      (window).__lastGen = {
        imageDataUrl: imageDataUrl || "",
        // store what user typed (not the long engineered prompt)
        prompt: userPrompt || '',
      };
    } catch (err) {
      handleApiError(err, 'Failed to generate image.', 'Generation');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDesign = async () => {
    const gen = (window).__lastGen;
    if (!gen?.imageDataUrl) {
      toast({ title: 'Nothing to save yet', status: 'info' });
      return;
    }
    setIsSaving(true);
    try {
      await client.post('/mydesigns', {
        prompt: gen.prompt || userPrompt || '(untitled)',
        imageDataUrl: gen.imageDataUrl,
      });
      toast({ title: 'Design Saved!', description: "Check “My Designs”.", status: 'success', isClosable: true });
    } catch (err) {
      handleApiError(err, 'Failed to save design.', 'Save');
    } finally {
      setIsSaving(false);
    }
  };

  // --- UI building blocks (console TV look is mostly CSS-in-JS below)
  const Dial = ({ valueIx, setValueIx, labels }) => {
    // Map [0..n-1] to an angle span (-120deg .. +120deg)
    const n = labels.length;
    const angle = -120 + (240 * (valueIx / (n - 1)));
    return (
      <VStack spacing={1} minW="84px">
        <Box
          aria-label="dial"
          w="64px" h="64px" borderRadius="50%"
          bgGradient="radial(gray.700 20%, gray.800 60%)"
          position="relative"
          boxShadow="inset 0 6px 18px rgba(0,0,0,.6), 0 2px 6px rgba(0,0,0,.6)"
          border="2px solid #1a1a1a"
          cursor="pointer"
          onClick={() => setValueIx((valueIx + 1) % n)}
          _active={{ transform: "scale(0.98)" }}
        >
          {/* tick marks */}
          {[...Array(12)].map((_, i) => (
            <Box key={i}
              position="absolute" left="50%" top="50%"
              w="2px" h="8px" bg="gray.500"
              transform={`translate(-1px,-32px) rotate(${i * 30}deg)`}
              transformOrigin="1px 32px"
              borderRadius="1px"
              opacity={0.7}
            />
          ))}
          {/* knob cap */}
          <Box
            position="absolute" left="50%" top="50%"
            w="54px" h="54px" borderRadius="50%"
            transform="translate(-27px,-27px)"
            bgGradient="linear(to-b, gray.900, gray.700)"
            boxShadow="inset 0 10px 20px rgba(255,255,255,.05), inset 0 -8px 18px rgba(0,0,0,.6)"
          />
          {/* pointer */}
          <Box position="absolute" left="50%" top="50%"
            transform={`translate(-2px,-30px) rotate(${angle}deg)`}
            transformOrigin="2px 30px"
            w="4px" h="30px" bg="yellow.300" borderRadius="2px"
            boxShadow="0 0 6px rgba(255,255,0,.6)"
          />
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
        p={0}
        position="relative"
        boxShadow="0 12px 60px rgba(0,0,0,.6)"
        bgGradient="linear(to-b, #6b4423, #5a391c)"
        border="10px solid #3f2a16"
        _before={{
          content: '""',
          position: 'absolute',
          inset: 0,
          boxShadow: 'inset 0 0 0 8px #8b5a2b, inset 0 0 60px rgba(0,0,0,.6)'
        }}
      >

        {/* Antenna (decor) */}
        <Box position="absolute" left="50%" top="-40px" transform="translateX(-50%)" zIndex={2}>
          <Box w="2px" h="38px" bg="gray.500" mx="auto" />
          <HStack spacing={8} justify="center" mt="-6px">
            <Box w="90px" h="2px" bg="gray.500" transform="rotate(-18deg)" />
            <Box w="90px" h="2px" bg="gray.500" transform="rotate(18deg)" />
          </HStack>
        </Box>

        {/* Badge sticker */}
        <Badge colorScheme="yellow" position="absolute" top="6px" left="16px" fontFamily="monospace">TeesFromThePast</Badge>

        {/* VCR deck */}
        <Box
          mx="16px" mt="10px" mb={2} p={3}
          bgGradient="linear(to-b, #141922, #0f141c)"
          border="2px solid #2b3442"
          borderRadius="8px"
          boxShadow="inset 0 0 30px rgba(0,0,0,.6)"
        >
          <HStack spacing={4} align="center">
            {/* Thumbnail window */}
            <Box w="64px" h="48px" bg="black" border="2px solid #333" borderRadius="4px" overflow="hidden">
              {initPreview ? (
                <Image src={initPreview} alt="VCR tape preview" w="100%" h="100%" objectFit="cover" />
              ) : (
                <Box w="100%" h="100%" bgGradient="linear(to-b, #222, #111)"/>
              )}
            </Box>

            {/* Deck controls (decorative except Eject) */}
            <HStack spacing={2}>
              <Tooltip label="Rewind"><Button size="xs" leftIcon={<FaBackward/>} variant="outline" colorScheme="gray">Rew</Button></Tooltip>
              <Tooltip label="Play"><Button size="xs" leftIcon={<FaPlay/>} variant="outline" colorScheme="gray">Play</Button></Tooltip>
              <Tooltip label="Fast Forward"><Button size="xs" leftIcon={<FaFastForward/>} variant="outline" colorScheme="gray">FF</Button></Tooltip>
              <Tooltip label="Eject (clear image)">
                <Button size="xs" leftIcon={<FaEject/>} colorScheme="pink"
                  onClick={() => { handleFile(null); }}>
                  Eject
                </Button>
              </Tooltip>
            </HStack>

            {/* file input + influence */}
            <Box flex="1">
              <HStack>
                <input
                  style={{ color: '#ddd' }}
                  type="file" accept="image/*"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />
              </HStack>
              <HStack mt={1} spacing={3}>
                <Text fontSize="xs" color="gray.300">Image Influence</Text>
                <Slider value={imageInfluence} min={0} max={1} step={0.01} onChange={setImageInfluence}>
                  <SliderTrack><SliderFilledTrack/></SliderTrack>
                  <SliderThumb />
                </Slider>
                <Text fontSize="xs" color="gray.300">{Math.round(imageInfluence * 100)}%</Text>
              </HStack>
            </Box>

            {/* little menu dot (decor) */}
            <Box ml="auto" color="gray.400">⋮</Box>
          </HStack>
        </Box>

        {/* Screen & controls row */}
        <HStack align="stretch" spacing={0} px="16px" pb="16px">
          {/* Speaker grill (left) */}
          <Box w={{ base:'0', md:'120px' }} display={{ base:'none', md:'block' }}
            bgGradient="linear(to-b, #5a3a1f, #4a2f19)"
            borderRight="6px solid #2d1d0f"
          >
            <Box m="12px" h="calc(100% - 24px)" bgGradient="linear(to-b, #3b2716, #301e11)" border="1px solid #1f140b" />
          </Box>

          {/* Screen */}
          <VStack flex="1" spacing={0} bg="#0b111a" border="8px solid #a1a5ad" borderRadius="10px" p="10px" mx="16px"
            boxShadow="inset 0 0 80px rgba(0,0,0,.8), 0 6px 20px rgba(0,0,0,.6)">
            <Box
              position="relative" w="100%" h={{ base:'360px', md:'520px' }}
              bgGradient={powerOn ? "linear(to-b, #0f1825, #0a111c)" : "linear(to-b, #090909, #060606)"}
              borderRadius="6px" overflow="hidden"
            >
              {/* static when no image */}
              {!imageUrl && powerOn && (
                <Box
                  position="absolute" inset={0}
                  backgroundImage="repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0px, rgba(255,255,255,.06) 1px, transparent 2px, transparent 3px)"
                  opacity={0.25}
                />
              )}
              {/* image */}
              {imageUrl ? (
                <Image src={imageUrl} alt="Generated" w="100%" h="100%" objectFit="contain" />
              ) : (
                <VStack w="100%" h="100%" align="center" justify="center" color="gray.300">
                  {loading ? <Spinner size="xl" /> :
                    <>
                      <Icon as={FaMagic} boxSize="10" opacity={0.7}/>
                      <Text>Your Generated Image Will Appear Here</Text>
                    </>
                  }
                </VStack>
              )}

              {/* tagline */}
              <Text position="absolute" bottom="8px" w="100%" textAlign="center" fontSize="xs" color="gray.400">
                Tune your image or disable the retro-renderer.
              </Text>
            </Box>

            {/* under-screen row: power + dials */}
            <HStack w="100%" justify="space-between" py={3}>
              <Button size="sm" leftIcon={<FaPowerOff/>} colorScheme={powerOn ? 'pink' : 'gray'} onClick={setPowerOn.toggle}>
                Power
              </Button>
              <HStack spacing={10}>
                <VStack spacing={1}>
                  <Text fontSize="xs" color="yellow.300">Art Style</Text>
                  <Dial valueIx={styleIx} setValueIx={setStyleIx} labels={ART_STYLES}/>
                </VStack>
                <VStack spacing={1}>
                  <Text fontSize="xs" color="yellow.300">Decade</Text>
                  <Dial valueIx={decadeIx} setValueIx={setDecadeIx} labels={DECADES}/>
                </VStack>
              </HStack>
            </HStack>
          </VStack>

          {/* Speaker grill (right) */}
          <Box w={{ base:'0', md:'120px' }} display={{ base:'none', md:'block' }}
            bgGradient="linear(to-b, #5a3a1f, #4a2f19)"
            borderLeft="6px solid #2d1d0f"
          >
            <Box m="12px" h="calc(100% - 24px)" bgGradient="linear(to-b, #3b2716, #301e11)" border="1px solid #1f140b" />
          </Box>
        </HStack>

        {/* Prompt area under the deck (cleaner) */}
        <Box mx="16px" mb="16px" bg="rgba(0,0,0,.35)" border="1px solid rgba(0,0,0,.6)" borderRadius="8px" p={3}>
          <Text fontSize="sm" color="yellow.200" mb={2}>Describe your image idea</Text>
          <Textarea
            placeholder="e.g. Make this cat a lion"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            bg="rgba(0,0,0,.5)"
            color="white"
            _placeholder={{ color: 'whiteAlpha.700' }}
          />
        </Box>
      </Box>

      {error && (
        <Alert status="error" colorScheme="red" borderRadius="md" p={4} borderWidth="1px">
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      )}

      <HStack>
        <Button
          onClick={handleGenerate}
          colorScheme="brandAccentOrange"
          isLoading={loading}
          leftIcon={<Icon as={FaMagic} />}
        >
          Generate Image
        </Button>
        <Button
          onClick={handleSaveDesign}
          colorScheme="brandAccentYellow"
          isLoading={isSaving}
          leftIcon={<Icon as={FaSave} />}
        >
          Save This Design
        </Button>
      </HStack>
    </VStack>
  );
}
