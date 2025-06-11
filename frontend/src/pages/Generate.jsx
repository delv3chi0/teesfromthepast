// frontend/src/pages/Generate.jsx

import { Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, Icon, Alert, AlertIcon, SimpleGrid, FormControl, FormLabel, Select, Switch, Flex, Collapse } from "@chakra-ui/react";
import { useState } from "react";
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { FaMagic, FaSave } from 'react-icons/fa';

/**
 * AI Image Generator Page
 * REFRACTORED:
 * - Merged 'Modern' and 'Retro' control panels into a single, cohesive 'GeneratorControls' component.
 * - The 'Decade' selector now smoothly appears/disappears based on the 'Retro Mode' switch.
 * - Fully restyled all form elements (Textarea, Select, Switch) for a consistent dark theme.
 * - Standardized all buttons to use the site's primary and secondary action colors.
 * - Polished the image display area and all feedback states (loading, error, placeholder).
 */

const ThemedSelect = (props) => (
    <Select
        size="lg"
        bg="brand.primaryDark"
        borderColor="whiteAlpha.300"
        _hover={{ borderColor: "whiteAlpha.400" }}
        focusBorderColor="brand.accentYellow"
        {...props}
    />
);

export default function Generate() {
    const [prompt, setPrompt] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    
    const [decade, setDecade] = useState("1980s");
    const [artStyle, setArtStyle] =useState("Classic Art");
    const [isRetro, setIsRetro] = useState(true);

    const toast = useToast();
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleApiError = (err, defaultMessage, actionType = "operation") => {
        let message = err.response?.data?.message || defaultMessage;
        if (err.response?.status === 401) {
            toast({ title: 'Session Expired', status: 'error', isClosable: true });
            logout();
            navigate('/login');
        } else {
            toast({ title: `${actionType} Failed`, description: message, status: 'error', isClosable: true });
        }
        setError(message);
    };

    const constructFinalPrompt = () => {
        let finalPrompt = prompt;
        if (artStyle === 'Stencil Art') {
            finalPrompt = `monochromatic stencil art, high contrast, clean lines, vector, ${prompt}`;
        } else if (artStyle === 'Embroidery Style') {
            finalPrompt = `detailed embroidery pattern, satin stitch, clean edges, vector art, limited color palette, ${prompt}`;
        }

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
        setLoading(true);
        setError("");
        setImageUrl("");
        try {
            const finalPrompt = constructFinalPrompt();
            const response = await client.post('/stability/generate', { prompt: finalPrompt });
            setImageUrl(response.data.imageUrl);
        } catch (err) {
            handleApiError(err, 'Failed to generate image.', 'Generation');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDesign = async () => {
        setIsSaving(true);
        try {
            await client.post('/mydesigns/save', { prompt, imageDataUrl: imageUrl });
            toast({ title: 'Design Saved!', description: "It's now available in 'My Designs'.", status: 'success', isClosable: true });
        } catch (err) {
            handleApiError(err, 'Failed to save design.', 'Save');
        } finally {
            setIsSaving(false);
        }
    };
    
    const GeneratorControls = () => (
        <VStack spacing={6} w="100%" bg="brand.primaryLight" p={{base: 5, md: 8}} borderRadius="xl">
            <Textarea
                placeholder="Describe your image idea here..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                isDisabled={loading || isSaving}
                size="lg"
                minHeight="120px"
                bg="brand.primaryDark"
                borderColor="whiteAlpha.300"
                _hover={{ borderColor: "whiteAlpha.400" }}
                focusBorderColor="brand.accentYellow"
            />
            <SimpleGrid columns={{base: 1, md: 3}} spacing={5} w="100%">
                <FormControl>
                    <FormLabel color="whiteAlpha.800">Art Style</FormLabel>
                    <ThemedSelect value={artStyle} onChange={e => setArtStyle(e.target.value)} isDisabled={loading || isSaving}>
                        <option value="Classic Art">Classic Art</option>
                        <option value="Stencil Art">Stencil Art</option>
                        <option value="Embroidery Style">Embroidery</option>
                    </ThemedSelect>
                </FormControl>
                <FormControl>
                    <FormLabel color="whiteAlpha.800">Retro Mode</FormLabel>
                    <Flex align="center" h="100%" pl={2} pt={2}>
                       <Switch isChecked={isRetro} onChange={e => setIsRetro(e.target.checked)} colorScheme="yellow" size="lg" isDisabled={loading || isSaving}/>
                    </Flex>
                </FormControl>
                <Collapse in={isRetro} animateOpacity style={{width: '100%'}}>
                    <FormControl>
                        <FormLabel color="whiteAlpha.800">Decade</FormLabel>
                        <ThemedSelect value={decade} onChange={e => setDecade(e.target.value)} isDisabled={!isRetro || loading || isSaving}>
                            <option value="1960s">60s</option>
                            <option value="1970s">70s</option>
                            <option value="1980s">80s</option>
                            <option value="1990s">90s</option>
                        </ThemedSelect>
                    </FormControl>
                </Collapse>
            </SimpleGrid>
            <Button
                onClick={handleGenerate}
                bg="brand.accentOrange"
                color="white"
                _hover={{bg: 'brand.accentOrangeHover'}}
                isLoading={loading}
                loadingText="Generating..."
                isDisabled={isSaving || loading || !prompt}
                size="lg"
                w="100%"
                leftIcon={<Icon as={FaMagic} />}
            >
                Generate Image
            </Button>
        </VStack>
    );

    return (
        <VStack spacing={8} w="100%">
            <Heading as="h1" size="2xl" color="brand.textLight">AI Image Generator</Heading>
            <VStack spacing={8} bg="brand.primaryDark" p={{base: 4, md: 8}} borderRadius="2xl" w="100%" maxW="800px" shadow="2xl">
                <Box
                    w="100%"
                    h={{ base: "300px", md: "520px" }}
                    bg="black"
                    mb={4}
                    borderRadius="lg"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    position="relative"
                    borderWidth="2px"
                    borderColor="whiteAlpha.300"
                >
                    {loading && <Spinner size="xl" color="brand.accentOrange" />}
                    {!loading && imageUrl && <Image src={imageUrl} alt={prompt || "Generated Art"} maxW="100%" maxH="100%" objectFit="contain" />}
                    {!loading && !imageUrl && (
                        <VStack color="whiteAlpha.600" spacing={4}>
                            <Icon as={FaMagic} boxSize="60px" />
                            <Text fontSize="lg" fontWeight="medium">Your Generated Image Will Appear Here</Text>
                        </VStack>
                    )}
                </Box>
                <GeneratorControls />
            </VStack>
            {error && (
                <Alert status="error" bg="red.900" borderRadius="md" p={4} borderWidth="1px" borderColor="red.500">
                    <AlertIcon color="red.300" />
                    <Text color="white">{error}</Text>
                </Alert>
            )}
            {imageUrl && !error && (
                <Button
                    onClick={handleSaveDesign}
                    bg="brand.accentYellow"
                    color="brand.textDark"
                    _hover={{ bg: "brand.accentYellowHover" }}
                    isLoading={isSaving}
                    loadingText="Saving..."
                    isDisabled={loading || !imageUrl || isSaving}
                    size="lg"
                    leftIcon={<Icon as={FaSave} />}
                >
                    Save This Design
                </Button>
            )}
        </VStack>
    );
}
