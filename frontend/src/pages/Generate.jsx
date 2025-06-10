// frontend/src/pages/Generate.jsx
import { Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, Icon, Alert, AlertIcon, SimpleGrid, FormControl, FormLabel, Select, Switch, Flex } from "@chakra-ui/react";
import { useState } from "react";
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { FaMagic, FaSave } from 'react-icons/fa';

export default function Generate() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  
  // New state for the TV controls
  const [decade, setDecade] = useState("1980s");
  const [artStyle, setArtStyle] = useState("Classic Art");
  const [isRetro, setIsRetro] = useState(true);

  const toast = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleApiError = (err, defaultMessage, actionType = "operation") => {
    let message = err.response?.data?.message || defaultMessage;
    if (err.response?.status === 401) {
      toast({ title: 'Session Expired', status: 'error' });
      logout();
      navigate('/login');
    } else {
      toast({ title: `${actionType} Failed`, description: message, status: 'error' });
    }
    setError(message);
  };

  const constructFinalPrompt = () => {
    let finalPrompt = prompt;
    
    // Add style modifiers
    if (artStyle === 'Stencil Art') {
      finalPrompt = `monochromatic stencil art, high contrast, clean lines, vector, ${prompt}`;
    } else if (artStyle === 'Embroidery Style') {
      finalPrompt = `detailed embroidery pattern, satin stitch, clean edges, vector art, limited color palette, ${prompt}`;
    }

    // Add retro/decade modifiers only if the switch is on
    if (isRetro) {
      const decadeMap = {
        "1960s": "pop art style, vibrant colors, 1960s illustration",
        "1970s": "70s retro aesthetic, earthy tones, groovy, psychedelic art",
        "1980s": "80s synthwave sunset, neon colors, chrome, retro-futurism",
        "1990s": "90s grunge aesthetic, grainy, bold graphics, early internet style",
      };
      finalPrompt = `${finalPrompt}, ${decadeMap[decade] || ''}`;
    }

    return finalPrompt.trim();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: 'Prompt is empty', status: 'warning' });
      return;
    }
    setLoading(true);
    setImageUrl("");
    setError("");
    
    const finalPrompt = constructFinalPrompt();
    console.log("Final Generated Prompt:", finalPrompt); // For debugging

    try {
      const response = await client.post('/designs/create', { prompt: finalPrompt });
      if (response.data?.imageDataUrl) {
        setImageUrl(response.data.imageDataUrl);
        toast({ title: 'Image Generated!', status: 'success' });
      } else {
        throw new Error("No image data received from server.");
      }
    } catch (err) {
      handleApiError(err, 'Failed to generate image.', 'Image Generation');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDesign = async () => {
    if (!imageUrl) { toast({ title: 'No Image', status: 'warning' }); return; }
    setIsSaving(true);
    setError("");
    try {
      // We save the user's original prompt, not the modified one
      await client.post('/mydesigns', { prompt: prompt, imageDataUrl: imageUrl });
      toast({ title: 'Design Saved!', status: 'success' });
    } catch (err) {
      handleApiError(err, 'Failed to save design.', 'Save Design');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <VStack spacing={8} w="100%">
      <Heading as="h1" size="pageTitle" textAlign="left" w="100%">
        Retro AI Generator
      </Heading>
      
      {/* The "TV" Component */}
      <Box bg="brand.primaryDark" p={8} borderRadius="2xl" w="100%" maxW="800px" shadow="2xl">
        {/* The Screen */}
        <Box
          w="100%"
          h={{ base: "300px", md: "520px" }}
          bg="black"
          mb={6}
          borderRadius="lg"
          display="flex"
          alignItems="center"
          justifyContent="center"
          position="relative"
          border="4px solid"
          borderColor="gray.700"
          overflow="hidden"
        >
          {loading && <Spinner size="xl" color="brand.accentOrange" thickness="4px" />}
          {!loading && imageUrl && (
            <Image src={imageUrl} alt={prompt || "Generated Tee Art"} maxW="100%" maxH="100%" objectFit="contain" />
          )}
           {!loading && !imageUrl && (
            <VStack color="gray.600">
                <Icon as={FaMagic} boxSize="50px" />
                <Text>Your Generated Image Will Appear Here</Text>
            </VStack>
           )}
        </Box>

        {/* The Control Panel */}
        <VStack spacing={5} w="100%" bg="brand.secondary" p={6} borderRadius="xl">
            <Textarea 
                placeholder="Describe your retro shirt idea... e.g., 'a robot surfing on a synthesizer'"
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                isDisabled={loading || isSaving}
                size="lg" minHeight="120px" bg="brand.paper" color="brand.textDark"
            />
            <SimpleGrid columns={{base: 1, md: 3}} spacing={4} w="100%">
                <FormControl>
                    <FormLabel fontFamily="Bungee" color="brand.primaryDark">Decade</FormLabel>
                    <Select value={decade} onChange={e => setDecade(e.target.value)} isDisabled={!isRetro || loading || isSaving} bg="white" color="brand.textDark">
                        <option value="1960s">60s</option>
                        <option value="1970s">70s</option>
                        <option value="1980s">80s</option>
                        <option value="1990s">90s</option>
                    </Select>
                </FormControl>
                <FormControl>
                    <FormLabel fontFamily="Bungee" color="brand.primaryDark">Style</FormLabel>
                    <Select value={artStyle} onChange={e => setArtStyle(e.target.value)} isDisabled={loading || isSaving} bg="white" color="brand.textDark">
                        <option value="Classic Art">Classic Art</option>
                        <option value="Stencil Art">Stencil Art</option>
                        <option value="Embroidery Style">Embroidery Style</option>
                    </Select>
                </FormControl>
                <FormControl display="flex" flexDirection="column" alignItems="center">
                    <FormLabel fontFamily="Bungee" color="brand.primaryDark">Retro Mode</FormLabel>
                    <Switch isChecked={isRetro} onChange={e => setIsRetro(e.target.checked)} colorScheme="orange" size="lg" isDisabled={loading || isSaving}/>
                </FormControl>
            </SimpleGrid>
            <Flex w="100%" justify="center" pt={4} gap={4}>
                <Button 
                    onClick={handleGenerate} 
                    colorScheme="brandAccentOrange"
                    isLoading={loading} loadingText="Generating..."
                    isDisabled={isSaving || loading}
                    size="lg" leftIcon={<Icon as={FaMagic} />}
                >
                    Generate Image
                </Button>
                <Button
                    onClick={handleSaveDesign}
                    colorScheme="brandPrimary"
                    isLoading={isSaving} loadingText="Saving..."
                    isDisabled={loading || !imageUrl || isSaving}
                    size="lg" leftIcon={<Icon as={FaSave} />}
                >
                    Save This Design
                </Button>
            </Flex>
        </VStack>
      </Box>
      {error && ( <Alert status="error" mt={4} borderRadius="md"><AlertIcon />{error}</Alert> )}
    </VStack>
  );
}
