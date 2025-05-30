// frontend/src/pages/MyDesigns.jsx
import { useState, useEffect, useRef } from 'react';
import { 
    Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, 
    useDisclosure, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, 
    useToast, Icon, Link as ChakraLink
} from '@chakra-ui/react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaPlusSquare, FaMagic, FaTrophy, FaTimes, FaCheckCircle } from 'react-icons/fa';

export default function MyDesigns() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen: isImageModalOpen, onOpen: onImageModalOpen, onClose: onImageModalClose } = useDisclosure();
  const [selectedDesign, setSelectedDesign] = useState(null);
  const { isOpen: isAlertOpen, onOpen: onAlertOpen, onClose: onAlertClose } = useDisclosure();
  const [designToSubmit, setDesignToSubmit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cancelRef = useRef();

  const fetchDesigns = () => { 
    if (user) {
      setLoading(true); setError('');
      client.get('/mydesigns')
        .then(response => { setDesigns(response.data); setLoading(false); })
        .catch(err => { 
            console.error("Error fetching designs:", err);
            setError('Failed to load your designs.');
            if (err.response?.status === 401) { /* ... logout logic ... */ }
            setLoading(false);
        });
    } else { setLoading(false); }
  };

  useEffect(() => { fetchDesigns(); }, [user]); // Simplified dependency

  const handleImageClick = (design) => { setSelectedDesign(design); onImageModalOpen(); };
  const handleOpenSubmitConfirmation = (design) => { setDesignToSubmit(design); onAlertOpen(); };
  const handleConfirmSubmitToContest = async () => { /* ... your existing working logic ... */ };

  if (loading) { /* ... your loading JSX ... */ }
  if (error && !user) { /* ... your error JSX when not logged in ... */ }
  if (error) { /* ... your error JSX when logged in ... */ }

  return (
    // Root Box is transparent to MainLayout's orange
    <Box maxW="6xl" mx="auto" mt={{base: 4, md: 6}} px={4} pb={10}>
      <VStack spacing={6} align="stretch" mb={8}>
        <Heading as="h1" size="xl" textAlign="left" w="100%" color="brand.textLight">
          My Saved Designs
        </Heading>
        
        {designs.length === 0 && !loading && !error && (
          <VStack 
            spacing={5} p={8} bg="rgba(255,255,255,0.15)" borderRadius="xl" 
            shadow="md" borderWidth="1px" borderColor="rgba(255,255,255,0.25)" mt={8}
            textAlign="center"
          >
            <Icon as={FaPlusSquare} boxSize="50px" color="brand.textLight" /> 
            <Text fontSize="lg" fontWeight="medium" color="brand.textLight">
              You haven't saved any designs yet!
            </Text>
            <Button
              onClick={() => navigate('/generate')}
              bg="brand.accentYellow" color="brand.textDark" 
              _hover={{ bg: 'brand.accentYellowHover' }}
              size="lg" leftIcon={<Icon as={FaMagic} />} borderRadius="full" 
              px={8} fontSize="lg" 
            >
              Let’s Create Your First Design!
            </Button>
          </VStack>
        )}
        {designs.length > 0 && (
             <Button 
                bg="brand.accentYellow" color="brand.textDark" 
                _hover={{bg: "brand.accentYellowHover"}} 
                onClick={() => navigate('/generate')} 
                alignSelf="flex-start" // Align button to left if desired, or keep center
                size="lg" 
                leftIcon={<Icon as={FaMagic} />} borderRadius="full" 
                px={8} fontSize="lg" 
             >
             ✨ Create Another Design
           </Button>
        )}
      </VStack>

      {designs.length > 0 && (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
          {designs.map(design => (
            <Box 
              key={design._id} bg="brand.paper" borderRadius="xl" 
              overflow="hidden" shadow="lg" cursor="pointer"
              onClick={() => handleImageClick(design)}
              transition="all 0.2s ease-in-out"
              _hover={{ boxShadow: "2xl", transform: "translateY(-4px) scale(1.02)" }}
            >
              <Image src={design.imageDataUrl} alt={design.prompt} fit="cover" w="100%" h="250px" bg="gray.200"/> 
              <Box p={5}>
                <Text fontSize="md" color="brand.textDark" noOfLines={2} title={design.prompt} minH="48px" fontWeight="medium">
                  {design.prompt || "Untitled Design"}
                </Text>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      )}

      {selectedDesign && ( /* ... Modal JSX - ensure headings/text inside use brand.textDark ... */ )}
      {designToSubmit && ( /* ... AlertDialog JSX - ensure headings/text inside use brand.textDark ... */ )}
    </Box>
  );
}
