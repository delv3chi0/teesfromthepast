// frontend/src/pages/Generate.jsx
import { Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner } from "@chakra-ui/react"; // Added Spinner
import { useState } from "react";
import { client } from '../api/client';

export default function Generate() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // This holds the imageDataUrl
  const [loading, setLoading] = useState(false);   // For image generation loading
  const [isSaving, setIsSaving] = useState(false); // <-- NEW: For save design loading
  const [error, setError] = useState("");
  const toast = useToast();

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
      const res = await client.post("/designs/create", { prompt }); // This calls your AI generation backend
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
      setError(errorMessage);
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

  // --- NEW FUNCTION TO SAVE THE DESIGN ---
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
    try {
      // Send the prompt and the imageDataUrl (which is stored in the imageUrl state variable)
      // to your backend's /api/mydesigns endpoint
      const response = await client.post('/mydesigns', { 
        prompt: prompt, 
        imageDataUrl: imageUrl 
      });

      console.log("Design saved response:", response.data);
      toast({
        title: "Design Saved!",
        description: "Your masterpiece is now in your collection.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      // Optionally, you could clear the prompt/image or redirect here
      // For now, we'll just show a success message.

    } catch (err) {
      console.error("Error saving design:", err);
      const errorMessage = err.response?.data?.message || "Could not save your design. Please try again.";
      toast({
        title: "Save Failed",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <VStack spacing={6} mt={10} px={4} pb={10}> {/* Added pb={10} for some bottom padding */}
      <Heading>AI Image Generator</Heading>
      <Textarea 
        placeholder="Describe your retro shirt idea... e.g., 'a vibrant 80s synthwave sunset with a chrome robot'" 
        value={prompt} 
        onChange={(e) => setPrompt(e.target.value)} 
        isDisabled={loading || isSaving} // Disable while generating or saving
        size="lg"
        minHeight="100px"
      />
      <Button 
        onClick={handleGenerate} 
        colorScheme="purple" 
        isLoading={loading}
        loadingText="Generating..."
        isDisabled={isSaving} // Disable if currently saving another design
        size="lg"
      >
        Generate Image
      </Button>
      {error && <Text color="red.500" mt={2}>Error: {error}</Text>}
      
      {imageUrl && !error && (
        <VStack mt={4} spacing={4} p={4} borderWidth="1px" borderRadius="md" shadow="md">
          <Image src={imageUrl} alt="Generated Tee Art" maxW="512px" maxH="512px" borderRadius="md" />
          {/* --- ADDED SAVE DESIGN BUTTON --- */}
          <Button
            mt={2}
            colorScheme="green"
            onClick={handleSaveDesign}
            isLoading={isSaving}
            loadingText="Saving..."
            isDisabled={loading} // Disable if currently generating a new image
            size="lg"
          >
            Save This Design
          </Button>
        </VStack>
      )}
    </VStack>
  );
}
