// frontend/src/pages/Generate.jsx
import { Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, Icon, Alert, AlertIcon, SimpleGrid, FormControl, FormLabel, Select, Switch, Flex, Collapse, Tooltip as ChakraTooltip, Input as ChakraInput, Slider, SliderTrack, SliderFilledTrack, SliderThumb } from "@chakra-ui/react";
import { useState, useCallback } from "react";
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { FaMagic, FaSave, FaUpload } from 'react-icons/fa';

const ART_STYLES_MAP = ["Classic Art", "Stencil Art", "Embroidery Style"];
const DECADES_MAP = ["1960s", "1970s", "1980s", "1990s"];
const getMappedIndex = (map, value) => map.indexOf(value);

const KnobSlider = ({ label, value, onChange, optionsMap, isDisabled }) => {
  const currentIndex = getMappedIndex(optionsMap, value);
  const displayValue = optionsMap[currentIndex];
  return (
    <FormControl>
      <FormLabel mb={1} textAlign="center" fontSize={{ base: "sm", md: "md" }} fontWeight="bold">{label}</FormLabel>
      <VStack spacing={2}>
        <Slider value={currentIndex} min={0} max={optionsMap.length - 1} step={1} onChange={(i)=>onChange(optionsMap[i])} isDisabled={isDisabled} colorScheme="yellow" width="100%" p={2}>
          <SliderTrack bg="whiteAlpha.300" borderRadius="full"><SliderFilledTrack bg="brand.accentYellow" /></SliderTrack>
          <ChakraTooltip hasArrow placement="top" label={displayValue} bg="brand.accentYellow" color="brand.textDark">
            <SliderThumb boxSize={6} bg="brand.accentOrange" border="2px solid" borderColor="brand.accentYellow" />
          </ChakraTooltip>
        </Slider>
        <Text fontSize="md" color="brand.textLight" fontWeight="medium">{displayValue}</Text>
      </VStack>
    </FormControl>
  );
};

const VcrUpload = ({ onFileChange, isDisabled }) => {
  const [fileName, setFileName] = useState("No file chosen");
  return (
    <Box bg="gray.800" p={4} borderRadius="md" border="2px solid" borderColor="whiteAlpha.300" shadow="inner" w="100%" textAlign="center" display="flex" flexDirection="column" alignItems="center" justifyContent="center" minH="100px" position="relative" overflow="hidden">
      <FormLabel htmlFor="vcr-file-upload" cursor={isDisabled ? "not-allowed" : "pointer"} width="100%" height="100%" display="flex" alignItems="center" justifyContent="center" m={0}>
        <VStack spacing={2} color="whiteAlpha.700">
          <Icon as={FaUpload} boxSize={8} />
          <Text fontSize="sm">Insert Image into VCR</Text>
          <Text fontSize="xs" mt={1}>{fileName}</Text>
        </VStack>
      </FormLabel>
      <ChakraInput
        type="file"
        id="vcr-file-upload"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          setFileName(f ? f.name : "No file chosen");
          onFileChange(f);
        }}
        isDisabled={isDisabled}
        display="none"
      />
    </Box>
  );
};

export default function Generate() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadedImageFile, setUploadedImageFile] = useState(null);

  const [decade, setDecade] = useState("1980s");
  const [artStyle, setArtStyle] = useState("Classic Art");
  const [isRetro, setIsRetro] = useState(true);

  const toast = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

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

  const constructFinalPrompt = useCallback(() => {
    let finalPrompt = prompt;
    if (artStyle === 'Stencil Art') {
      finalPrompt = `monochromatic stencil art, high contrast, clean lines, vector, ${prompt}`;
    } else if (artStyle === 'Embroidery Style') {
      finalPrompt = `detailed embroidery pattern, satin stitch, clean edges, vector art, limited color palette, ${prompt}`;
    }
    if (isRetro) finalPrompt = `${finalPrompt}, ${decade}`;
    return finalPrompt.trim();
  }, [prompt, artStyle, isRetro, decade]);

  const handleGenerate = async () => {
    setLoading(true); setError(""); setImageUrl("");
    try {
      const finalPrompt = constructFinalPrompt();
      const payload = { prompt: finalPrompt };

      if (uploadedImageFile) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(uploadedImageFile);
        });
        payload.initImageBase64 = base64;
      }

      const { data } = await client.post('/designs/create', payload);
      const { imageDataUrl, masterUrl, previewUrl, thumbUrl } = data || {};

      setImageUrl(previewUrl || imageDataUrl || masterUrl || '');
      window.__lastGen = { imageDataUrl, masterUrl, thumbUrl, prompt: finalPrompt };
    } catch (err) {
      handleApiError(err, 'Failed to generate image.', 'Generation');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDesign = async () => {
    const gen = window.__lastGen;
    if (!gen?.imageDataUrl && !gen?.masterUrl) {
      toast({ title: 'Nothing to save yet', status: 'info' });
      return;
    }
    setIsSaving(true);
    try {
      await client.post('/mydesigns', {
        prompt: gen.prompt || prompt,
        imageDataUrl: gen.imageDataUrl || undefined,
        masterUrl: gen.masterUrl || undefined,   // saved as publicUrl in API
        thumbUrl: gen.thumbUrl || undefined,
      });
      toast({ title: 'Design Saved!', description: "It's now available in 'My Designs'.", status: 'success', isClosable: true });
    } catch (err) {
      handleApiError(err, 'Failed to save design.', 'Save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUploadFileChange = useCallback((file) => {
    setUploadedImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result);
      reader.readAsDataURL(file);
    } else {
      setImageUrl("");
    }
  }, []);

  return (
    <VStack spacing={8} w="100%">
      <Heading as="h1" size="2xl" color="brand.textLight">AI Image Generator</Heading>

      <Box bg="brand.secondary" borderRadius="3xl" p={{ base: 4, md: 8 }} w="100%" maxW="800px" shadow="dark-lg" border="8px solid" borderColor="gray.800" position="relative">
        <Box w="100%" h={{ base: "300px", md: "520px" }} bg="brand.primary" mb={4} borderRadius="lg" display="flex" alignItems="center" justifyContent="center" position="relative" borderWidth="2px" borderColor="whiteAlpha.300" overflow="hidden">
          {loading && <Spinner size="xl" />}
          {!loading && imageUrl && <Image src={imageUrl} alt={prompt || "Generated Art"} maxW="100%" maxH="100%" objectFit="contain" />}
          {!loading && !imageUrl && (
            <VStack color="brand.textLight" spacing={4}>
              <Icon as={FaMagic} boxSize="60px" />
              <Text fontSize="lg" fontWeight="medium">Your Generated Image Will Appear Here</Text>
            </VStack>
          )}
        </Box>

        {/* Controls */}
        <VStack spacing={6} w="100%" bg="brand.secondary" p={{base: 5, md: 8}} borderRadius="xl">
          <Textarea placeholder="Describe your image idea here..." value={prompt} onChange={(e) => setPrompt(e.target.value)} isDisabled={loading || isSaving} size="lg" minHeight="120px" resize="vertical" />
          <SimpleGrid columns={{base: 1, md: 3}} spacing={5} w="100%">
            <KnobSlider label="Art Style" value={artStyle} onChange={setArtStyle} optionsMap={ART_STYLES_MAP} isDisabled={loading || isSaving} />
            <FormControl>
              <FormLabel textAlign="center" mb={1} fontSize={{ base: "sm", md: "md" }} fontWeight="bold">Retro Mode</FormLabel>
              <Flex align="center" h="100%" pl={2} pt={2} justifyContent="center">
                <Switch isChecked={isRetro} onChange={e => setIsRetro(e.target.checked)} colorScheme="yellow" size="lg" isDisabled={loading || isSaving}/>
              </Flex>
            </FormControl>
            <Collapse in={isRetro} animateOpacity style={{width: '100%'}}>
              <KnobSlider label="Decade" value={decade} onChange={setDecade} optionsMap={DECADES_MAP} isDisabled={!isRetro || loading || isSaving} />
            </Collapse>
          </SimpleGrid>
          <VcrUpload onFileChange={handleImageUploadFileChange} isDisabled={loading || isSaving} />
          <Button onClick={handleGenerate} colorScheme="brandAccentOrange" isLoading={loading} loadingText="Generating..." isDisabled={isSaving || loading || !prompt} size="lg" w="100%">
            <Icon as={FaMagic} mr={2}/> Generate Image
          </Button>
        </VStack>
      </Box>

      {error && (
        <Alert status="error" colorScheme="red" borderRadius="md" p={4} borderWidth="1px">
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      )}

      <Button onClick={handleSaveDesign} colorScheme="brandAccentYellow" isLoading={isSaving} loadingText="Saving..." isDisabled={loading} size="lg">
        <Icon as={FaSave} mr={2}/> Save This Design
      </Button>
    </VStack>
  );
}
