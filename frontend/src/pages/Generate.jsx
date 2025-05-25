// frontend/src/pages/Generate.jsx
import { Box, Heading, Textarea, Button, VStack, Image, Text, useToast } from "@chakra-ui/react"; // Added Text, useToast
import { useState } from "react";
import { client } from '../api/client'; // Import the pre-configured client

export default function Generate() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false); // For loading state
  const [error, setError] = useState("");       // For error messages
  const toast = useToast();                     // For notifications

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
    setImageUrl(""); // Clear previous image

    try {
      // Use the client and the correct backend endpoint
      const res = await client.post("/designs/create", { prompt });
      // The backend sends imageDataUrl
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
      console.error("Error generating image:", err);
      const errorMessage = err.response?.data?.message || "Failed to generate image. Please try again.";
      setError(errorMessage); // Set error message to display
      toast({
        title: "Generation Failed",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack spacing={6} mt={10} px={4}>
      <Heading>AI Image Generator</Heading>
      <Textarea 
        placeholder="Describe your retro shirt idea... e.g., 'a vibrant 80s synthwave sunset with a chrome robot'" 
        value={prompt} 
        onChange={(e) => setPrompt(e.target.value)} 
        isDisabled={loading}
        size="lg"
        minHeight="100px"
      />
      <Button 
        onClick={handleGenerate} 
        colorScheme="purple" 
        isLoading={loading}
        loadingText="Generating..."
        size="lg"
      >
        Generate Image
      </Button>
      {error && <Text color="red.500">Error: {error}</Text>}
      {imageUrl && !error && (
        <Box mt={4} p={4} borderWidth="1px" borderRadius="md" shadow="md">
          <Image src={imageUrl} alt="Generated Tee Art" maxW="512px" maxH="512px" borderRadius="md" />
        </Box>
      )}
    </VStack>
  );
}
