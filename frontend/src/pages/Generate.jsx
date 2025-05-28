// frontend/src/pages/Generate.jsx
import { Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, HStack, Icon } from "@chakra-ui/react"; // Added Icon
import { useState } from "react";
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { FaMagic, FaSave } from 'react-icons/fa'; // Icons for buttons

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
    // ... (this function remains the same, ensure it's present)
    console.error(`Error during ${actionType}:`, err);
    const errorMessage = err.response?.data?.message || defaultMessage;
    setError(errorMessage);
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
    // ... (this function remains the same)
    if (!prompt.trim()) {
      toast({ /* ... */ }); return;
    }
    setLoading(true); setError(""); setImageUrl("");
    try {
      const res = await client.post("/designs/create", { prompt });
      const url = res.data.imageDataUrl;
      if (url) { setImageUrl(url); toast({ title: "Image Generated!", status: "success", /*...*/ });
      } else { throw new Error("No image URL received"); }
    } catch (err) { handleApiError(err, "Failed to generate image. Please try again.", "Image Generation");
    } finally { setLoading(false); }
  };

  const handleSaveDesign = async () => {
    // ... (this function remains the same)
    if (!prompt || !imageUrl) {
      toast({ /* ... */ }); return;
    }
    setIsSaving(true); setError(""); 
    try {
      await client.post('/mydesigns', { prompt, imageDataUrl: imageUrl });
      toast({ title: "Design Saved!", description: "Your masterpiece is in your collection.", status: "success", /*...*/});
    } catch (err) { handleApiError(err, "Could not save your design. Please try again.", "Saving Design");
    } finally { setIsSaving(false); }
  };

  return (
    <VStack spacing={8} mt={{base: 6, md: 10}} px={4} pb={10} w="100%"> {/* Increased top margin & spacing */}
      <Heading as="h1" size="2xl">AI Image Generator</Heading> {/* Larger heading */}
      <Textarea 
        placeholder="Describe your retro shirt idea... e.g., 'a vibrant 80s synthwave sunset with a chrome robot'" 
        value={prompt} 
        onChange={(e) => setPrompt(e.target.value)} 
        isDisabled={loading || isSaving}
        size="lg"
        minHeight="120px" // Slightly taller
        bg="brand.paper" // White background for textarea
        color="brand.textDark"
        borderColor="brand.secondary"
        focusBorderColor="brand.primary"
        _placeholder={{ color: 'gray.400' }}
      />
      <HStack spacing={4}> 
        <Button 
          onClick={handleGenerate} 
          bg="brand.accentYellow" // Using brand yellow
          color="brand.textDark"
          _hover={{bg: "brand.accentYellowHover"}}
          isLoading={loading}
          loadingText="Generating..."
          isDisabled={isSaving || loading}
          size="lg"
          px={8} // More padding
          py={6} // More padding
          borderRadius="full" // Pill-shaped
          leftIcon={<Icon as={FaMagic} />}
          boxShadow="md"
          _active={{ boxShadow: "lg" }}
        >
          Generate Image
        </Button>
      </HStack>

      {error && <Text color="red.300" bg="red.900" p={3} borderRadius="md" mt={2}>Error: {error}</Text>} {/* Improved error visibility */}
      
      {imageUrl && !error && (
        <VStack 
          mt={6} 
          spacing={4} 
          p={6} // Increased padding
          borderWidth="1px" 
          borderRadius="xl" // More rounded
          shadow="xl" // Enhanced shadow
          bg="brand.paper" // Card background
          w="100%"
          maxW="560px" // Max width for the card
          _hover={{ boxShadow: "2xl", transform: "scale(1.01) translateY(-2px)", transition: "all 0.2s ease-in-out" }}
        >
          <Image src={imageUrl} alt="Generated Tee Art" maxW="512px" maxH="512px" borderRadius="md" />
          <Button
            mt={2}
            bg="brand.primary" // Using brand primary (dark brown)
            color="brand.textLight"
            _hover={{bg: "brand.primaryLight"}}
            onClick={handleSaveDesign}
            isLoading={isSaving}
            loadingText="Saving..."
            isDisabled={loading}
            size="lg"
            px={8}
            py={6}
            borderRadius="full"
            leftIcon={<Icon as={FaSave} />}
            boxShadow="md"
            _active={{ boxShadow: "lg" }}
          >
            Save This Design
          </Button>
        </VStack>
      )}
    </VStack>
  );
}
