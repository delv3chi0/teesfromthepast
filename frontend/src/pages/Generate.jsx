// frontend/src/pages/Generate.jsx
import { Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, HStack } from "@chakra-ui/react";
import { useState, useEffect } from "react"; // useEffect might be used if you add more features
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';

export default function Generate() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // This holds the imageDataUrl
  const [loading, setLoading] = useState(false);   // For image generation loading
  const [isSaving, setIsSaving] = useState(false); // For save design loading
  const [error, setError] = useState("");
  const toast = useToast();
  const { logout } = useAuth(); 
  const navigate = useNavigate(); 

  const handleApiError = (err, defaultMessage, actionType = "operation") => {
    console.error(`Error during ${actionType}:`, err);
    const errorMessage = err.response?.data?.message || defaultMessage;
    setError(errorMessage); // Set error message to display on page if needed
    toast({
      title: `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Failed`,
      description: errorMessage,
      status: "error",
      duration: 5000,
      isClosable: true,
    });
    if (err.response?.status === 401) {
      toast({
        title: "Session Expired",
        description: "You have been logged out. Please log in again.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      logout(); 
      navigate('/login'); 
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt is empty",
        description: "Please describe your retro shirt idea.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    setError("");
    setImageUrl(""); 

    try {
      console.log("[Generate.jsx] Calling /api/designs/create with prompt:", prompt);
      const res = await client.post("/designs/create", { prompt });
      const url = res.data.imageDataUrl;
      if (url) {
        setImageUrl(url);
        toast({
          title: "Image Generated!",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error("No image URL received from server.");
      }
    } catch (err) {
      handleApiError(err, "Failed to generate image. Please try again.", "Image Generation");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDesign = async () => {
    if (!prompt || !imageUrl) {
      toast({
        title: "Cannot save",
        description: "No prompt or image data available to save.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSaving(true); 
    setError(""); 
    try {
      console.log("[Generate.jsx] Calling /api/mydesigns to save. Prompt:", prompt);
      await client.post('/mydesigns', { 
        prompt: prompt, 
        imageDataUrl: imageUrl 
      });

      toast({
        title: "Design Saved!",
        description: "Your masterpiece is now in your collection.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      handleApiError(err, "Could not save your design. Please try again.", "Saving Design");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <VStack spacing={6} mt={10} px={4} pb={10}>
      <Heading>AI Image Generator</Heading>
      <Textarea 
        placeholder="Describe your retro shirt idea... e.g., 'a vibrant 80s synthwave sunset with a chrome robot'" 
        value={prompt} 
        onChange={(e) => setPrompt(e.target.value)} 
        isDisabled={loading || isSaving}
        size="lg"
        minHeight="100px"
      />
      <HStack spacing={4}> 
        <Button 
          onClick={handleGenerate} 
          colorScheme="purple" 
          isLoading={loading}
          loadingText="Generating..."
          isDisabled={isSaving || loading} // Also disable if saving
          size="lg"
        >
          Generate Image
        </Button>
        <Button 
          onClick={() => navigate('/my-designs')}
          colorScheme="teal" 
          variant="outline"
          isDisabled={loading || isSaving}
          size="lg"
        >
          View My Saved Designs
        </Button>
      </HStack>

      {error && <Text color="red.500" mt={2}>Error: {error}</Text>}
      
      {imageUrl && !error && (
        <VStack mt={4} spacing={4} p={4} borderWidth="1px" borderRadius="md" shadow="md">
          <Image src={imageUrl} alt="Generated Tee Art" maxW="512px" maxH="512px" borderRadius="md" />
          <Button
            mt={2}
            colorScheme="green"
            onClick={handleSaveDesign}
            isLoading={isSaving}
            loadingText="Saving..."
            isDisabled={loading}
            size="lg"
          >
            Save This Design
          </Button>
        </VStack>
      )}
    </VStack>
  );
}
