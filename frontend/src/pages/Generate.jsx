// frontend/src/pages/Generate.jsx
import { Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, Icon, Alert, AlertIcon } from "@chakra-ui/react";
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
  const toast = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleApiError = (err, defaultMessage, actionType = "operation") => {
    console.error(`[${actionType} Error]`, err.response?.data || err.message || err);
    let message = defaultMessage;
    if (err.response) {
      message = err.response.data?.message || err.response.data?.error?.message || err.response.data?.error || defaultMessage;
      if (err.response.status === 401) {
        toast({
          title: 'Session Expired',
          description: 'Please log in again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        logout();
        navigate('/login');
        return;
      }
    } else if (err.message) {
      message = err.message;
    }
    setError(message);
    toast({
      title: `${actionType} Failed`,
      description: message,
      status: 'error',
      duration: 7000,
      isClosable: true,
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: 'Prompt is empty', description: 'Please enter a prompt to generate an image.', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    setLoading(true);
    setImageUrl("");
    setError("");
    try {
      const response = await client.post('/designs/create', { prompt });
      if (response.data && response.data.imageDataUrl) {
        setImageUrl(response.data.imageDataUrl);
        toast({ title: 'Image Generated!', description: 'Your retro design is ready.', status: 'success', duration: 3000, isClosable: true });
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
    if (!imageUrl) {
      toast({ title: 'No Image', description: 'Generate an image first before saving.', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await client.post('/mydesigns', { prompt: prompt, imageDataUrl: imageUrl });
      toast({ title: 'Design Saved!', description: 'Your masterpiece is saved to "My Designs".', status: 'success', duration: 3000, isClosable: true });
    } catch (err) {
      handleApiError(err, 'Failed to save design.', 'Save Design');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <VStack spacing={8} w="100%" maxW="4xl" mx="auto" /*mt removed, MainLayout provides padding*/ px={{base:2, md:0}} pb={10}>
      {/* Page Title - UPDATED FOR CONSISTENCY */}
      <Heading
        as="h1"
        size="pageTitle" // Using the new custom size from theme.js
        color="brand.textLight"
        textAlign="left"
        w="100%"
        mb={{ base: 4, md: 6 }} // Consistent bottom margin
      >
        AI Image Generator
      </Heading>
      
      <VStack spacing={5} w="100%" bg="brand.paper" p={{base:4, md:6}} borderRadius="xl" shadow="lg">
        <Textarea
          placeholder="Describe your retro shirt idea... e.g., 'a vibrant 80s synthwave sunset with a chrome robot navigating a pixelated cityscape'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          isDisabled={loading || isSaving}
          size="lg"
          minHeight="120px"
          color="brand.textDark"
          borderColor="brand.secondary"
          focusBorderColor="brand.primaryDark"
          _placeholder={{ color: 'gray.500' }}
          borderRadius="md"
        />
        <Button
          onClick={handleGenerate}
          bg="brand.accentYellow"
          color="brand.textDark"
          _hover={{bg: "brand.accentYellowHover"}}
          isLoading={loading}
          loadingText="Generating..."
          isDisabled={isSaving || loading}
          size="lg"
          px={8}
          borderRadius="full"
          leftIcon={<Icon as={FaMagic} />}
          boxShadow="md"
          _active={{ boxShadow: "inner" }}
        >
          Generate Image
        </Button>
      </VStack>

      {error && (
        <Alert status="error" mt={4} borderRadius="md" bg="red.100" borderColor="red.200" w="100%" variant="subtle">
            <AlertIcon color="red.600"/>
            <Text color="red.800" wordBreak="break-word">{error}</Text>
        </Alert>
      )}
      
      {/* Display loading spinner centrally below the generate button if loading */}
      {loading && (
        <VStack justifyContent="center" alignItems="center" py={10}>
          <Spinner size="xl" color="brand.primary" thickness="4px" speed="0.65s" emptyColor="gray.200" />
          <Text mt={3} color="brand.textLight" fontSize="lg">Conjuring up your retro vision...</Text>
        </VStack>
      )}

      {imageUrl && !error && !loading && ( // Only show image section if not loading and no error
        <VStack
          mt={6} spacing={5} p={6}
          bg="brand.paper"
          borderRadius="xl" shadow="xl" w="100%" maxW="580px" // Max width for the image container
          transition="all 0.2s ease-in-out"
          _hover={{ boxShadow: "2xl", transform: "translateY(-4px) scale(1.01)"}}
        >
          <Heading as="h3" size="lg" color="brand.textDark" textAlign="center">Your Generated Image:</Heading>
          <Image src={imageUrl} alt={prompt || "Generated Tee Art"} maxW="512px" maxH="512px" borderRadius="lg" shadow="md" objectFit="contain"/>
          <Button
            mt={3}
            bg="brand.accentYellow"
            color="brand.textDark"
            _hover={{bg: "brand.accentYellowHover"}}
            onClick={handleSaveDesign}
            isLoading={isSaving}
            loadingText="Saving..."
            isDisabled={loading || !imageUrl} // imageUrl check is redundant if section only shows when imageUrl exists
            size="lg"
            px={8}
            borderRadius="full"
            leftIcon={<Icon as={FaSave} />}
            boxShadow="md"
            _active={{ boxShadow: "inner" }}
          >
            Save This Design
          </Button>
        </VStack>
      )}
    </VStack>
  );
}
