import { Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, Icon, Alert, AlertIcon, SimpleGrid, FormControl, FormLabel, Select, Switch, Flex, Collapse, Link as ChakraLink } from "@chakra-ui/react"; // Added ChakraLink
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

// MODIFIED: ThemedSelect now uses brand.secondary for background and brand.textLight for text
const ThemedSelect = (props) => (
    <Select
        size="lg"
        bg="brand.secondary" // Consistent dark background for select
        color="brand.textLight" // Ensure text is light
        borderColor="whiteAlpha.300"
        _hover={{ borderColor: "whiteAlpha.400" }}
        focusBorderColor="brand.accentYellow"
        // Ensure options also have correct text color (often handled by Select baseStyle)
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
        // MODIFIED: bg to brand.secondary for consistency
        <VStack spacing={6} w="100%" bg="brand.secondary" p={{base: 5, md: 8}} borderRadius="xl">
            <Textarea
                placeholder="Describe your image idea here..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                isDisabled={loading || isSaving}
                size="lg"
                minHeight="120px"
                // MODIFIED: Input/Textarea styling now relies on theme.js (bg, color, etc.)
                // Explicitly set resize property for better user experience
                resize="vertical" // <--- ADDED: Allows vertical resizing
            />
            <SimpleGrid columns={{base: 1, md: 3}} spacing={5} w="100%">
                <FormControl>
                    {/* MODIFIED: Removed explicit color, will inherit from theme.js (Modal body default is textLight) */}
                    <FormLabel>Art Style</FormLabel>
                    <ThemedSelect value={artStyle} onChange={e => setArtStyle(e.target.value)} isDisabled={loading || isSaving}>
                        <option value="Classic Art">Classic Art</option>
                        <option value="Stencil Art">Stencil Art</option>
                        <option value="Embroidery Style">Embroidery</option>
                    </ThemedSelect>
                </FormControl>
                <FormControl>
                    {/* MODIFIED: Removed explicit color */}
                    <FormLabel>Retro Mode</FormLabel>
                    <Flex align="center" h="100%" pl={2} pt={2}>
                       <Switch isChecked={isRetro} onChange={e => setIsRetro(e.target.checked)} colorScheme="yellow" size="lg" isDisabled={loading || isSaving}/>
                    </Flex>
                </FormControl>
                <Collapse in={isRetro} animateOpacity style={{width: '100%'}}>
                    <FormControl>
                        {/* MODIFIED: Removed explicit color */}
                        <FormLabel>Decade</FormLabel>
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
                colorScheme="brandAccentOrange" // Uses theme color scheme
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
            {/* Page Title */}
            <Heading as="h1" size="2xl" color="brand.textLight">AI Image Generator</Heading>

            {/* Main Content Card (Image Display + Controls) */}
            {/* MODIFIED: bg to brand.secondary for main card consistency */}
            <VStack spacing={8} bg="brand.secondary" p={{base: 4, md: 8}} borderRadius="2xl" w="100%" maxW="800px" shadow="2xl">
                {/* Image Display Area */}
                {/* MODIFIED: bg to brand.primary for deep contrast in image area */}
                <Box
                    w="100%"
                    h={{ base: "300px", md: "520px" }}
                    bg="brand.primary"
                    mb={4}
                    borderRadius="lg"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    position="relative"
                    borderWidth="2px"
                    borderColor="whiteAlpha.300"
                >
                    {/* MODIFIED: Spinner will now inherit default color from theme.js (brand.textLight) */}
                    {loading && <Spinner size="xl" />}
                    {!loading && imageUrl && <Image src={imageUrl} alt={prompt || "Generated Art"} maxW="100%" maxH="100%" objectFit="contain" />}
                    {!loading && !imageUrl && (
                        <VStack color="whiteAlpha.600" spacing={4}> {/* Placeholder text color, can leave or change to brand.textMuted */}
                            <Icon as={FaMagic} boxSize="60px" />
                            <Text fontSize="lg" fontWeight="medium">Your Generated Image Will Appear Here</Text>
                        </VStack>
                    )}
                </Box>
                <GeneratorControls />
            </VStack>

            {/* Error Message Alert */}
            {error && (
                // MODIFIED: Use colorScheme for Alert
                <Alert status="error" colorScheme="red" borderRadius="md" p={4} borderWidth="1px">
                    <AlertIcon />
                    {/* Text color inside alert will inherit from Alert colorScheme (usually white) */}
                    <Text>{error}</Text>
                </Alert>
            )}

            {/* Save Design Button */}
            {imageUrl && !error && (
                <Button
                    onClick={handleSaveDesign}
                    colorScheme="brandAccentYellow" // Uses theme color scheme
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
