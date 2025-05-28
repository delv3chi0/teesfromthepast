// frontend/src/pages/MyDesigns.jsx
import { useState, useEffect, useRef } from 'react';
import { 
    Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, 
    useDisclosure, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, 
    useToast, Icon, Link as ChakraLink // Keep ChakraLink if used
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

  useEffect(() => {
    if (user) {
      setLoading(true); setError('');
      client.get('/mydesigns')
        .then(response => { setDesigns(response.data); setLoading(false); })
        .catch(err => { 
            console.error("Error fetching designs:", err);
            setError('Failed to load your designs. Please try again.');
            if (err.response?.status === 401) { logout(); navigate('/login'); }
            setLoading(false);
        });
    } else { setLoading(false); /* Error can be set if needed, or rely on PrivateRoute */ }
  }, [user, logout, navigate]);

  const handleImageClick = (design) => { setSelectedDesign(design); onImageModalOpen(); };
  const handleOpenSubmitConfirmation = (design) => { setDesignToSubmit(design); onAlertOpen(); };
  const handleConfirmSubmitToContest = async () => { /* ... your existing working logic ... */ };

  if (loading) { 
    return (
      <Box textAlign="center" mt={20}>
        <Spinner size="xl" color="brand.primary" thickness="4px"/>
        <Text mt={4} color="brand.textLight">Loading your awesome designs...</Text>
      </Box>
    );
  }
  if (error && !user) { // Only show critical error if user context is also missing
    return (
        <Box textAlign="center" mt={20} px={4}>
            <Alert status="warning" bg="brand.paper" borderRadius="md" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" py={10}>
                <AlertIcon boxSize="40px" mr={0} color="yellow.500"/>
                <Text mt={3} fontWeight="bold" color="brand.textDark">{error || "Please log in to view your designs."}</Text>
                <Button mt={4} colorScheme="brandPrimary" onClick={() => navigate('/login')}>Go to Login</Button>
            </Alert>
        </Box>
    );
  }
   if (error) { // General error fetching designs for a logged-in user
    return (
        <Box textAlign="center" mt={20} px={4}>
            <Alert status="error" bg="brand.paper" borderRadius="md" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" py={10}>
                <AlertIcon boxSize="40px" mr={0} color="red.500"/>
                <Text mt={3} fontWeight="bold" color="brand.textDark">{error}</Text>
                <Button mt={4} colorScheme="brandPrimary" onClick={() => {setLoading(true); setError(''); client.get('/mydesigns').then(r => {setDesigns(r.data); setLoading(false);}).catch(e => {setError('Failed to reload.'); setLoading(false);})}}>Try Again</Button>
            </Alert>
        </Box>
    );
  }


  return (
    // This outermost Box will sit on MainLayout's brand.accentOrange background
    <Box maxW="6xl" mx="auto" mt={{base:6, md:8}} px={4} pb={10}>
      <VStack spacing={6} align="stretch" mb={8}>
        <Heading as="h1" size="2xl" textAlign="center" color="brand.textLight">
          My Saved Designs
        </Heading>
        
        {designs.length === 0 && (
          <VStack 
            spacing={5} p={8} 
            // bg="rgba(255,255,255,0.1)" // Let's try without this to ensure orange shows
            borderRadius="xl" 
            // shadow="md"
            // borderWidth="1px"
            // borderColor="rgba(255,255,255,0.2)"
            mt={8}
          >
            <Icon as={FaPlusSquare} boxSize="60px" color="brand.textLight" /> 
            <Text fontSize="xl" fontWeight="medium" color="brand.textLight" textAlign="center">
              You haven't saved any designs yet!
            </Text>
            <Button 
                onClick={() => navigate('/generate')} 
                bg="brand.accentYellow" color="brand.textDark" 
                _hover={{ bg: 'brand.accentYellowHover' }} 
                size="lg" leftIcon={<Icon as={FaMagic} />} borderRadius="full" 
                px={8} py={6} fontSize="lg" boxShadow="md" _active={{ boxShadow: "lg" }}
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
                alignSelf="center" size="lg" mt={2} 
                leftIcon={<Icon as={FaMagic} />} borderRadius="full" 
                px={8} py={6} fontSize="lg" boxShadow="md" _active={{ boxShadow: "lg" }}
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
              bg="brand.paper" // Design cards are on 'paper' (white)
              borderRadius="xl" 
              overflow="hidden" 
              shadow="lg"
              cursor="pointer"
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

      {/* Modal and AlertDialog styling should use brand.paper for content and brand.textDark for text inside them */}
      {selectedDesign && (
        <Modal isOpen={isImageModalOpen} onClose={onImageModalClose} size="2xl" isCentered>
          <ModalOverlay bg="blackAlpha.700"/>
          <ModalContent bg="brand.paper" borderRadius="lg"> {/* Modal on paper */}
            <ModalHeader color="brand.textDark" fontWeight="bold" noOfLines={3} fontSize="xl">{selectedDesign.prompt}</ModalHeader>
            <ModalCloseButton color="brand.textDark" />
            <ModalBody display="flex" justifyContent="center" alignItems="center" py={6}>
              <Image src={selectedDesign.imageDataUrl} alt={selectedDesign.prompt} maxH="75vh" maxW="95%" objectFit="contain" borderRadius="md"/>
            </ModalBody>
            <ModalFooter borderTopWidth="1px" borderColor="gray.200">
              <Button bg="brand.accentYellow" color="brand.textDark" _hover={{bg: "brand.accentYellowHover"}} mr={3} onClick={() => handleOpenSubmitConfirmation(selectedDesign)} isLoading={isSubmitting} isDisabled={isSubmitting} leftIcon={<Icon as={FaTrophy} />} borderRadius="full" px={6}>
                Submit to Contest
              </Button>
              <Button variant="outline" onClick={onImageModalClose} color="brand.textDark" borderColor="brand.secondary" _hover={{bg:"gray.100"}} borderRadius="full" px={6}>
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {designToSubmit && (
        <AlertDialog isOpen={isAlertOpen} leastDestructiveRef={cancelRef} onClose={onAlertClose} isCentered>
            <AlertDialogOverlay><AlertDialogContent bg="brand.paper" borderRadius="lg"> {/* Alert Dialog on paper */}
                <AlertDialogHeader fontSize="xl" fontWeight="bold" color="brand.textDark">Confirm Submission</AlertDialogHeader>
                <AlertDialogBody color="brand.textDark">
                    {/* ... text ... */}
                </AlertDialogBody>
                <AlertDialogFooter>
                    <Button ref={cancelRef} onClick={onAlertClose} isDisabled={isSubmitting} variant="outline" borderRadius="full" px={6} colorScheme="gray">Cancel</Button>
                    <Button bg="brand.primary" color="brand.textLight" _hover={{bg: "brand.primaryLight"}} onClick={handleConfirmSubmitToContest} ml={3} isLoading={isSubmitting} loadingText="Submitting..." leftIcon={<Icon as={FaCheckCircle} />} borderRadius="full" px={6}>
                        Yes, Submit This Design
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent></AlertDialogOverlay>
        </AlertDialog>
      )}
    </Box>
  );
}
