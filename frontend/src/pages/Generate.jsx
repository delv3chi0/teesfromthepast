// frontend/src/pages/Generate.jsx
import { Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, HStack, Icon, Alert, AlertIcon } from "@chakra-ui/react";
import { useState } from "react";
import { client } from '../api/client'; // Make sure client is imported
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
    console.error(`[Generate.jsx] handleApiError called for ${actionType}. Raw error:`, err);
    console.error(`[Generate.jsx] handleApiError - error.response:`, err.response);
    const errorMessage = err.response?.data?.message || err.message || defaultMessage;
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
    
    console.log("[Generate.jsx] handleGenerate: Setting loading states true.");
    setLoading(true); 
    setError(""); 
    setImageUrl(""); 

    try {
      console.log("[Generate.jsx] handleGenerate: About to call client.post('/designs/create') with prompt:", prompt);
      const res = await client.post("/designs/create", { prompt }); 
      console.log("[Generate.jsx] handleGenerate: API call successful. Raw response:", res);
      
      const url = res.data.imageDataUrl;
      if (url) { 
        console.log("[Generate.jsx] handleGenerate: imageDataUrl found:", url);
        setImageUrl(url); 
        toast({ title: "Image Generated!", status: "success", duration: 3000, isClosable: true });
      } else { 
        console.error("[Generate.jsx] handleGenerate: No imageDataUrl in response data.");
        throw new Error("No image URL received from server."); 
      }
    } catch (err) { 
      console.error("[Generate.jsx] handleGenerate: Caught error during API call or processing.");
      handleApiError(err, "Failed to generate image. Please try again.", "Image Generation");
    } finally { 
      console.log("[Generate.jsx] handleGenerate: Setting loading state false.");
      setLoading(false); 
    }
  };

  const handleSaveDesign = async () => { 
    if (!prompt || !imageUrl) {
      toast({ title: "Cannot save", description: "No prompt or image data available.", status: "warning", duration: 3000, isClosable: true});
      return;
    }
    setIsSaving(true); setError(""); 
    try {
      console.log("[Generate.jsx] handleSaveDesign: About to call client.post('/mydesigns')");
      await client.post('/mydesigns', { prompt, imageDataUrl: imageUrl });
      console.log("[Generate.jsx] handleSaveDesign: Save API call successful.");
      toast({ title: "Design Saved!", description: "Your masterpiece is in your collection.", status: "success", duration: 3000, isClosable: true});
    } catch (err) { 
      console.error("[Generate.jsx] handleSaveDesign: Caught error during API call or processing.");
      handleApiError(err, "Could not save your design.", "Saving Design");
    } finally { 
      console.log("[Generate.jsx] handleSaveDesign: Setting isSaving state false.");
      setIsSaving(false); 
    }
  };

  return (
    <VStack 
      spacing={8} 
      w="100%" 
      mt={{base:6, md:10}} 
      px={4} 
      pb={10}
    >
      <Heading as="h1" size="2xl" textAlign="center" color="brand.textLight"> 
        AI Image Generator 
      </Heading>
      <Textarea 
        placeholder="Describe your retro shirt idea... e.g., 'a vibrant 80s synthwave sunset with a chrome robot'" 
        value={prompt} 
        onChange={(e) => setPrompt(e.target.value)} 
        isDisabled={loading || isSaving}
        size="lg"
        minHeight="120px"
        bg="brand.paper" 
        color="brand.textDark" 
        borderColor="brand.secondary"
        focusBorderColor="brand.primaryDark"
        _placeholder={{ color: 'gray.400' }}
        boxShadow="sm"
        borderRadius="md"
      />
      <HStack spacing={4}> 
        <Button 
          onClick={handleGenerate} 
          bg="brand.accentYellow"
          color="brand.textDark"
          _hover={{bg: "brand.accentYellowHover"}}
          isLoading={loading}
          loadingText="Generating..."
          isDisabled={isSaving || loading}
          size="lg" px={8} py={6} borderRadius="full"
          leftIcon={<Icon as={FaMagic} />}
          boxShadow="md" _active={{ boxShadow: "lg" }}
        >
          Generate Image
        </Button>
      </HStack>

      {error && <Alert status="error" mt={4} borderRadius="md" bg="red.100" borderColor="red.300"><AlertIcon color="red.600"/><Text color="red.800">{error}</Text></Alert>}
      
      {imageUrl && !error && (
        <VStack 
          mt={6} spacing={5} p={6} 
          bg="brand.paper" 
          borderRadius="xl" shadow="xl" w="100%" maxW="580px" 
          transition="all 0.2s ease-in-out"
          _hover={{ boxShadow: "2xl", transform: "translateY(-4px) scale(1.01)"}}
        >
          <Image src={imageUrl} alt="Generated Tee Art" maxW="512px" maxH="512px" borderRadius="lg" shadow="md" />
          <Button
            mt={3} bg="brand.primary" color="brand.textLight"
            _hover={{bg: "brand.primaryLight"}}
            onClick={handleSaveDesign}
            isLoading={isSaving} loadingText="Saving..." isDisabled={loading}
            size="lg" px={8} py={6} borderRadius="full"
            leftIcon={<Icon as={FaSave} />}
            boxShadow="md" _active={{ boxShadow: "lg" }}
          >
            Save This Design
          </Button>
        </VStack>
      )}
    </VStack>
  );
}
