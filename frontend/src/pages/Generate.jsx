import { Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, Icon, Alert, AlertIcon, SimpleGrid, FormControl, FormLabel, Select, Switch, Flex, Collapse, Link as ChakraLink } from "@chakra-ui/react";
import { useState } from "react";
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { FaMagic, FaSave } from 'react-icons/fa';

const ThemedSelect = (props) => (
    <Select
        size="lg"
        bg="brand.secondary"
        color="brand.textLight"
        borderColor="whiteAlpha.300"
        _placeholder={{ color: "brand.textMuted" }}
        _hover={{ borderColor: "whiteAlpha.400" }}
        focusBorderColor="brand.accentYellow"
        {...props}
    />
);

const GeneratorControls = ({ prompt, setPrompt, loading, isSaving, artStyle, setArtStyle, isRetro, setIsRetro, decade, setDecade, handleGenerate }) => (
    <VStack spacing={6} w="100%" bg="brand.secondary" p={{base: 5, md: 8}} borderRadius="xl">
        <Textarea
            placeholder="Describe your image idea here..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            isDisabled={loading || isSaving}
            size="lg"
            minHeight="120px"
            resize="vertical"
        />
        <SimpleGrid columns={{base: 1, md: 3}} spacing={5} w="100%">
            <FormControl>
                <FormLabel>Art Style</FormLabel>
                <ThemedSelect value={artStyle} onChange={e => setArtStyle(e.target.value)} isDisabled={loading || isSaving}>
                    <option value="Classic Art">Classic Art</option>
                    <option value="Stencil Art">Stencil Art</option>
                    <option value="Embroidery Style">Embroidery</option>
                </ThemedSelect>
            </FormControl>
            <FormControl>
                <FormLabel>Retro Mode</FormLabel>
                <Flex align="center" h="100%" pl={2} pt={2}>
                   <Switch isChecked={isRetro} onChange={e => setIsRetro(e.target.checked)} colorScheme="yellow" size="lg" isDisabled={loading || isSaving}/>
                </Flex>
            </FormControl>
            <Collapse in={isRetro} animateOpacity style={{width: '100%'}}>
                <FormControl>
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
            colorScheme="brandAccentOrange"
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
            // MODIFIED: Changed API endpoint to match backend route
            const finalPrompt = constructFinalPrompt();
            const response = await client.post('/designs/create', { prompt: finalPrompt }); // <--- CRITICAL FIX HERE
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

    return (
        <VStack spacing={8} w="100%">
            <Heading as="h1" size="2xl" color="brand.textLight">AI Image Generator</Heading>
            <VStack spacing={8} bg="brand.secondary" p={{base: 4, md: 8}} borderRadius="2xl" w="100%" maxW="800px" shadow="2xl">
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
                    {loading && <Spinner size="xl" />}
                    {!loading && imageUrl && <Image src={imageUrl} alt={prompt || "Generated Art"} maxW="100%" maxH="100%" objectFit="contain" />}
                    {!loading && !imageUrl && (
                        <VStack color="brand.textLight" spacing={4}>
                            <Icon as={FaMagic} boxSize="60px" />
                            <Text fontSize="lg" fontWeight="medium">Your Generated Image Will Appear Here</Text>
                        </VStack>
                    )}
                </Box>
                <GeneratorControls
                    prompt={prompt}
                    setPrompt={setPrompt}
                    loading={loading}
                    isSaving={isSaving}
                    artStyle={artStyle}
                    setArtStyle={setArtStyle}
                    isRetro={isRetro}
                    setIsRetro={setIsRetro}
                    decade={decade}
                    setDecade={setDecade}
                    handleGenerate={handleGenerate}
                />
            </VStack>

            {error && (
                <Alert status="error" colorScheme="red" borderRadius="md" p={4} borderWidth="1px">
                    <AlertIcon />
                    <Text>{error}</Text>
                </Alert>
            )}

            {imageUrl && !error && (
                <Button
                    onClick={handleSaveDesign}
                    colorScheme="brandAccentYellow"
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
