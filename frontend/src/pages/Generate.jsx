// frontend/src/pages/Generate.jsx
import { Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, HStack, Icon, Alert, AlertIcon } from "@chakra-ui/react";
import { useState } from "react";
// client is not used in this temporary diagnostic version of handleGenerate
// import { client } from '../api/client'; 
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { FaMagic, FaSave } from 'react-icons/fa';

export default function Generate() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // Will remain empty for this test
  const [loading, setLoading] = useState(false);   // Not used by test handleGenerate
  const [isSaving, setIsSaving] = useState(false); // Not used by test handleGenerate
  const [error, setError] = useState("");       // Not used by test handleGenerate
  const toast = useToast(); // Kept in case test involves it, but current test uses alert
  const { logout } = useAuth(); // Kept for handleApiError, though not called by test
  const navigate = useNavigate(); 

  // handleApiError is not called by the simplified handleGenerate, but kept for when we restore logic
  const handleApiError = (err, defaultMessage, actionType = "operation") => {
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

  // --- MODIFIED handleGenerate for DIAGNOSTIC TEST ---
  const handleGenerate = async () => {
    console.log("[Generate.jsx] Generate Button CLICKED - Direct Test");
    alert("Generate Button Clicked - Test Succeeded! Page should NOT navigate.");
    
    // All original logic is commented out for this test:
    /*
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
    setLoading(true); setError(""); setImageUrl("");
    try {
      console.log("[Generate.jsx] Calling /api/designs/create with prompt:", prompt);
      const res = await client.post("/designs/create", { prompt }); // Make sure client is imported if you uncomment
      const url = res.data.imageDataUrl;
      if (url) { 
        setImageUrl(url); 
        toast({ title: "Image Generated!", status: "success", duration: 3000, isClosable: true });
      } else { 
        throw new Error("No image URL received"); 
      }
    } catch (err) { 
      handleApiError(err, "Failed to generate image. Please try again.", "Image Generation");
    } finally { 
      setLoading(false); 
    }
    */
  };

  // handleSaveDesign is not directly relevant to this specific button test,
  // but ensure it's here if you were testing saving previously.
  // For now, its functionality is not being triggered by the modified handleGenerate.
  const handleSaveDesign = async () => { 
    if (!prompt || !imageUrl) {
      toast({ title: "Cannot save", description: "No prompt or image data available.", status: "warning", duration: 3000, isClosable: true});
      return;
    }
    setIsSaving(true); setError(""); 
    try {
      // Make sure client is imported if you uncomment the line below
      // await client.post('/mydesigns', { prompt, imageDataUrl: imageUrl });
      console.log("[Generate.jsx] Placeholder: Would save design here. Prompt:", prompt);
      toast({ title: "Design Saved! (Placeholder)", description: "Your masterpiece would be in your collection.", status: "success", duration: 3000, isClosable: true});
    } catch (err) { 
      // handleApiError(err, "Could not save your design.", "Saving Design");
      console.error("Error saving design (placeholder):", err);
       toast({ title: "Save Failed (Placeholder)", description: "Error saving.", status: "error", duration: 3000, isClosable: true});
    } finally { 
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
        placeholder="Describe your retro shirt idea..." 
        value={prompt} 
        onChange={(e) => setPrompt(e.target.value)} 
        isDisabled={loading || isSaving} // loading/isSaving won't change in this test version
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
          onClick={handleGenerate} // This now calls the simplified test function
          bg="brand.accentYellow"
          color="brand.textDark"
          _hover={{bg: "brand.accentYellowHover"}}
          // isLoading={loading} // Not relevant for this test
          // loadingText="Generating..."
          // isDisabled={isSaving || loading} // Not relevant for this test
          size="lg" px={8} py={6} borderRadius="full"
          leftIcon={<Icon as={FaMagic} />}
          boxShadow="md" _active={{ boxShadow: "lg" }}
        >
          Generate Image (Test Click)
        </Button>
      </HStack>

      {error && <Alert status="error" mt={4} borderRadius="md" bg="red.100" borderColor="red.300"><AlertIcon color="red.600"/><Text color="red.800">{error}</Text></Alert>}
      
      {/* imageUrl will remain empty in this test, so this block won't render */}
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
            onClick={handleSaveDesign} // This save function is also a placeholder for now
            // isLoading={isSaving} loadingText="Saving..." isDisabled={loading}
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
