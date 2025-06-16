import { Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, Icon, Alert, AlertIcon, SimpleGrid, FormControl, FormLabel, Select, Switch, Flex, Collapse, Link as ChakraLink, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Tooltip as ChakraTooltip, IconButton, Input as ChakraInput } from "@chakra-ui/react"; // <--- ADDED Slider, SliderTrack, SliderFilledTrack, SliderThumb IMPORTS HERE
import { useState, useCallback } from "react";
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { FaMagic, FaSave, FaUpload, FaChevronCircleRight, FaChevronCircleLeft } from 'react-icons/fa';

// Utility for mapping slider values to string options and vice-versa
const ART_STYLES_MAP = ["Classic Art", "Stencil Art", "Embroidery Style"];
const DECADES_MAP = ["1960s", "1970s", "1980s", "1990s"];

const getMappedValue = (map, index) => map[index];
const getMappedIndex = (map, value) => map.indexOf(value);

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

// NEW: Custom Knob Slider Component
const KnobSlider = ({ label, value, onChange, optionsMap, isDisabled }) => {
    const currentIndex = getMappedIndex(optionsMap, value);
    const displayValue = optionsMap[currentIndex];

    // Handle slider change (number to string)
    const handleSliderChange = (newIndex) => {
        onChange(getMappedValue(optionsMap, newIndex));
    };

    return (
        <FormControl>
            <FormLabel mb={1} textAlign="center" fontSize={{ base: "sm", md: "md" }} fontWeight="bold">{label}</FormLabel>
            <VStack spacing={2}>
                <Slider
                    value={currentIndex}
                    min={0}
                    max={optionsMap.length - 1}
                    step={1}
                    onChange={handleSliderChange}
                    isDisabled={isDisabled}
                    colorScheme="yellow"
                    width="100%"
                    p={2}
                >
                    <SliderTrack bg="whiteAlpha.300" borderRadius="full">
                        <SliderFilledTrack bg="brand.accentYellow" />
                    </SliderTrack>
                    <ChakraTooltip
                        hasArrow
                        placement="top"
                        label={displayValue}
                        bg="brand.accentYellow"
                        color="brand.textDark"
                    >
                        {/* MODIFIED: SliderThumb is now used directly */}
                        <SliderThumb boxSize={6} bg="brand.accentOrange" border="2px solid" borderColor="brand.accentYellow" />
                    </ChakraTooltip>
                </Slider>
                <Text fontSize="md" color="brand.textLight" fontWeight="medium">{displayValue}</Text>
            </VStack>
        </FormControl>
    );
};

// NEW: VCR Component for Image Upload (Visual only for now)
const VcrUpload = ({ onFileChange, isDisabled }) => {
    const [fileName, setFileName] = useState("No file chosen");

    const handleInternalFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFileName(file.name);
            onFileChange(file); // Pass file up to parent handler
        } else {
            setFileName("No file chosen");
            onFileChange(null);
        }
    };

    return (
        <Box
            bg="gray.800"
            p={4}
            borderRadius="md"
            border="2px solid"
            borderColor="whiteAlpha.300"
            shadow="inner"
            w="100%"
            textAlign="center"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minH="100px"
            position="relative"
            overflow="hidden"
        >
            <FormLabel
                htmlFor="vcr-file-upload"
                cursor={isDisabled ? "not-allowed" : "pointer"}
                width="100%"
                height="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
                m={0}
            >
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
                onChange={handleInternalFileChange}
                isDisabled={isDisabled}
                display="none"
            />
        </Box>
    );
};

const GeneratorControls = ({ prompt, setPrompt, loading, isSaving, artStyle, setArtStyle, isRetro, setIsRetro, decade, setDecade, handleGenerate, handleImageUploadFileChange }) => (
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
            <KnobSlider
                label="Art Style"
                value={artStyle}
                onChange={setArtStyle}
                optionsMap={ART_STYLES_MAP}
                isDisabled={loading || isSaving}
            />
            <FormControl>
                <FormLabel textAlign="center" mb={1} fontSize={{ base: "sm", md: "md" }} fontWeight="bold">Retro Mode</FormLabel>
                <Flex align="center" h="100%" pl={2} pt={2} justifyContent="center">
                   <Switch isChecked={isRetro} onChange={e => setIsRetro(e.target.checked)} colorScheme="yellow" size="lg" isDisabled={loading || isSaving}/>
                </Flex>
            </FormControl>
            <Collapse in={isRetro} animateOpacity style={{width: '100%'}}>
                <KnobSlider
                    label="Decade"
                    value={decade}
                    onChange={setDecade}
                    optionsMap={DECADES_MAP}
                    isDisabled={!isRetro || loading || isSaving}
                />
            </Collapse>
        </SimpleGrid>

        <VcrUpload onFileChange={handleImageUploadFileChange} isDisabled={loading || isSaving} />

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
    const [uploadedImageFile, setUploadedImageFile] = useState(null);

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

    const constructFinalPrompt = useCallback(() => {
        let finalPrompt = prompt;
        if (artStyle === 'Stencil Art') {
            finalPrompt = `monochromatic stencil art, high contrast, clean lines, vector, ${prompt}`;
        } else if (artStyle === 'Embroidery Style') {
            finalPrompt = `detailed embroidery pattern, satin stitch, clean edges, vector art, limited color palette, ${prompt}`;
        }

        if (isRetro) {
            finalPrompt = `${finalPrompt}, ${getMappedValue(DECADES_MAP, getMappedIndex(DECADES_MAP, decade)) || ''}`;
        }
        return finalPrompt.trim();
    }, [prompt, artStyle, isRetro, decade]);

    const handleGenerate = async () => {
        setLoading(true);
        setError("");
        setImageUrl("");
        try {
            const finalPrompt = constructFinalPrompt();
            let requestBody = { prompt: finalPrompt };

            if (uploadedImageFile) {
                const reader = new FileReader();
                const base64Image = await new Promise((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(uploadedImageFile);
                });
                requestBody.initImageBase64 = base64Image;
            }

            const response = await client.post('/designs/create', requestBody);

            setImageUrl(response.data.imageDataUrl);
        } catch (err) {
            handleApiError(err, 'Failed to generate image.', 'Generation');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDesign = async () => {
        setIsSaving(true);
        try {
            await client.post('/mydesigns', { prompt, imageDataUrl: imageUrl });
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
            reader.onloadend = () => {
                setImageUrl(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setImageUrl("");
        }
    }, []);

    return (
        <VStack spacing={8} w="100%">
            <Heading as="h1" size="2xl" color="brand.textLight">AI Image Generator</Heading>
            <Box
                bg="brand.secondary"
                borderRadius="3xl"
                p={{ base: 4, md: 8 }}
                w="100%"
                maxW="800px"
                shadow="dark-lg"
                border="8px solid"
                borderColor="gray.800"
                position="relative"
            >
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
                    overflow="hidden"
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
                    handleImageUploadFileChange={handleImageUploadFileChange}
                />
            </Box>

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
