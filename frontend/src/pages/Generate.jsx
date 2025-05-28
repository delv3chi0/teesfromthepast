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

  const handleApiError = (err, defaultMessage, actionType = "operation") => { /* ... same ... */ };
  const handleGenerate = async () => { /* ... same ... */ };
  const handleSaveDesign = async () => { /* ... same ... */ };

  return (
    <VStack 
      spacing={8} 
      w="100%" 
      mt={{base:6, md:10}} 
      px={4} 
      pb={10}
      bg="brand.accentOrange" // <-- EXPLICITLY SETTING BG HERE FOR THE PAGE
      flexGrow={1} // Try to make this VStack take available space from MainLayout
    >
      <Heading as="h1" size="2xl" textAlign="center" color="brand.textLight"> 
        AI Image Generator 
      </Heading>
      <Textarea 
        placeholder="Describe your retro shirt idea..." 
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
