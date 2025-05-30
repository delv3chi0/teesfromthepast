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

  const fetchDesigns = () => { /* ... (Your existing fetchDesigns logic is good) ... */ };
  useEffect(() => { fetchDesigns(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  const handleImageClick = (design) => { /* ... */ };
  const handleOpenSubmitConfirmation = (design) => { /* ... */ };
  const handleConfirmSubmitToContest = async () => { /* ... (Your existing logic is good) ... */ };

  if (loading) { /* ... (Your existing loading JSX is good) ... */ }
  if (error && !user) { /* ... */ }
  if (error) { /* ... (Your existing error JSX is good) ... */ }

  return (
    // Outermost Box: No bg, maxW and mx="auto" center it. Padding comes from MainLayout.
    <Box maxW="6xl" mx="auto" /* Removed mt, px, pb - use MainLayout's padding */>
      <VStack spacing={6} align="stretch" mb={8} mt={{base: 4, md: 6}}>
        <Heading as="h1" size="xl" textAlign="left" w="100%" color="brand.textLight" mb={6}>
          My Saved Designs
        </Heading>
        
        {designs.length === 0 && !loading && !error && (
          <VStack 
            spacing={5} p={8} bg="rgba(255,255,255,0.15)" borderRadius="xl" 
            shadow="md" borderWidth="1px" borderColor="rgba(255,255,255,0.25)"
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
                alignSelf="flex-start" 
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
              key={design._id} 
              bg="brand.paper" borderRadius="xl" overflow="hidden" 
              shadow="lg" cursor="pointer"
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

      {/* Modal and AlertDialog JSX remains the same - ensure text/headings use brand.textDark */}
      {selectedDesign && ( /* ... */ )}
      {designToSubmit && ( /* ... */ )}
    </Box>
  );
}
