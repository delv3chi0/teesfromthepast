// frontend/src/pages/Generate.jsx
import { Box, Heading, Textarea, Button, VStack, Image, Text, useToast, Spinner, HStack, Icon, Alert, AlertIcon } from "@chakra-ui/react";
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

  const handleApiError = (err, defaultMessage, actionType = "operation") => { /* ...your existing logic... */ };
  const handleGenerate = async () => { /* ...your existing logic... */ };
  const handleSaveDesign = async () => { /* ...your existing logic... */ };

  return (
    // Outermost VStack: No 'bg', uses MainLayout's padding via mt, px, pb.
    // Added mx="auto" and maxW to center content block if desired, or remove for full width.
    <VStack spacing={8} w="100%" maxW="4xl" mx="auto" mt={{base: 4, md: 6}} px={{base:2, md:4}} pb={10}>
      <Heading as="h1" size="xl" textAlign="left" w="100%" color="brand.textLight" mb={6}> 
        AI Image Generator 
      </Heading>
      
      <VStack spacing={5} w="100%" bg="brand.paper" p={6} borderRadius="xl" shadow="lg">
        <Textarea 
          placeholder="Describe your retro shirt idea... e.g., 'a vibrant 80s synthwave sunset with a chrome robot'" 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)} 
          isDisabled={loading || isSaving}
          size="lg"
          minHeight="120px"
          color="brand.textDark" 
          borderColor="brand.secondary"
          focusBorderColor="brand.primaryDark"
          _placeholder={{ color: 'gray.500' }}
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
        >
          Generate Image
        </Button>
      </VStack>

      {error && (
        <Alert status="error" mt={4} borderRadius="md" bg="red.100" borderColor="red.200" w="100%" maxW="xl">
            <AlertIcon color="red.600"/>
            <Text color="red.800">{error}</Text>
        </Alert>
      )}
      
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
            size="lg" px={8} borderRadius="full"
            leftIcon={<Icon as={FaSave} />}
          >
            Save This Design
          </Button>
        </VStack>
      )}
    </VStack>
  );
}
