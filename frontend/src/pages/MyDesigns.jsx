// frontend/src/pages/MyDesigns.jsx
import { useState, useEffect, useRef } from 'react';
import { 
    Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, 
    useDisclosure, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, 
    useToast, Icon
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
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
      setLoading(true);
      setError('');
      client.get('/mydesigns')
        .then(response => {
          setDesigns(response.data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching designs:", err);
          setError('Failed to load your designs. Please try again.');
          if (err.response?.status === 401) {
            toast({ title: "Session Expired", description: "Please log in again.", status: "warning", duration: 3000, isClosable: true });
            logout();
            navigate('/login');
          }
          setLoading(false);
        });
    } else {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesigns();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleImageClick = (design) => {
    setSelectedDesign(design);
    onImageModalOpen();
  };

  const handleOpenSubmitConfirmation = (design) => {
    setDesignToSubmit(design);
    onImageModalOpen(); 
    onAlertOpen();
  };

  const handleConfirmSubmitToContest = async () => {
    if (!designToSubmit) return;
    setIsSubmitting(true);
    
    try {
      const response = await client.post(`/contest/submit/${designToSubmit._id}`);
      toast({
        title: "Submission Successful!",
        description: response.data.message || "Your design has been submitted to the contest.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      onImageModalClose(); 
      onAlertClose();     
      fetchDesigns(); 
    } catch (err) {
      console.error("Error submitting design to contest:", err);
      const errorMessage = err.response?.data?.message || "Could not submit your design. Please try again.";
      toast({
        title: "Submission Failed",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      if (err.response?.status === 401) {
        logout();
        navigate('/login');
      }
      onAlertClose(); 
    } finally {
      setIsSubmitting(false);
      setDesignToSubmit(null);
    }
  };

  if (loading && !user && !error) { 
    return (
        <Box textAlign="center" mt={20} px={4}>
            <Text fontSize="lg" color="brand.textLight">Please log in to view your designs.</Text>
            <Button mt={4} bg="brand.accentYellow" color="brand.textDark" _hover={{ bg: "brand.accentYellowHover" }} borderRadius="full" size="lg" onClick={() => navigate('/login')}>Go to Login</Button>
        </Box>
    );
  }
  if (loading) {
    return (
      <Box textAlign="center" mt={20}>
        <Spinner size="xl" color="brand.primary" thickness="4px" speed="0.65s" emptyColor="gray.200"/>
        <Text mt={4} color="brand.textLight">Loading your awesome designs...</Text>
      </Box>
    );
  }
  if (error) { 
    return (
        <Box textAlign="center" mt={20} px={4}>
            <Alert status="error" bg="brand.paper" borderRadius="md" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" py={10}>
                <AlertIcon boxSize="40px" mr={0} color="red.500"/>
                <Text mt={3} fontWeight="bold" color="brand.textDark">{error}</Text>
                <Button mt={4} bg="brand.accentYellow" color="brand.textDark" _hover={{ bg: "brand.accentYellowHover" }} borderRadius="full" size="lg" onClick={fetchDesigns}>Try Again</Button>
            </Alert>
        </Box>
    );
  }

  return (
    <Box maxW="6xl" mx="auto" mt={{base:6, md:8}} px={{base:2, md:4}} pb={10}>
      <VStack spacing={6} align="stretch" mb={8}>
        <Heading as="h1" size="xl" color="brand.textLight" textAlign="left" w="100%" mb={6}> {/* Ensured consistent H1 style */}
          My Saved Designs
        </Heading>
        
        {designs.length === 0 ? (
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
        ) : (
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
              bg="brand.paper" 
              borderRadius="xl" 
              overflow="hidden" 
              shadow="lg"
              cursor="pointer"
              onClick={() => handleImageClick(design)}
              transition="all 0.2s ease-in-out"
              _hover={{ boxShadow: "2xl", transform: "translateY(-4px) scale(1.02)" }}
              display="flex" flexDirection="column" // Added for flex behavior
            >
              <Image src={design.imageDataUrl} alt={design.prompt} fit="cover" w="100%" h="250px" bg="gray.200"/> 
              <Box p={5} flexGrow={1}> {/* Added flexGrow */}
                <Text 
                    fontSize="md" 
                    color="brand.textDark" 
                    // noOfLines={2} // Removed to show full text
                    title={design.prompt} // Keep for native tooltip
                    // minH="48px" // Removed minH
                    fontWeight="medium"
                >
                  {design.prompt || "Untitled Design"}
                </Text>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      )}

      {selectedDesign && (
        <Modal isOpen={isImageModalOpen} onClose={onImageModalClose} size="2xl" isCentered>
          <ModalOverlay bg="blackAlpha.700"/>
          <ModalContent bg="brand.paper" borderRadius="lg">
            {/* MODIFIED: Removed prompt from ModalHeader */}
            <ModalHeader color="brand.textDark" fontWeight="bold" fontSize="xl">
                Design Preview
                {/* {selectedDesign.prompt} // Text removed */}
            </ModalHeader>
            <ModalCloseButton color="brand.textDark" />
            <ModalBody display="flex" justifyContent="center" alignItems="center" py={6}>
              <Image src={selectedDesign.imageDataUrl} alt={selectedDesign.prompt} maxH="75vh" maxW="95%" objectFit="contain" borderRadius="md"/>
            </ModalBody>
            <ModalFooter borderTopWidth="1px" borderColor="gray.200">
              <Button 
                bg="brand.accentYellow" color="brand.textDark" 
                _hover={{bg: "brand.accentYellowHover"}} 
                mr={3} 
                onClick={() => handleOpenSubmitConfirmation(selectedDesign)} 
                isLoading={isSubmitting} 
                isDisabled={isSubmitting}
                leftIcon={<Icon as={FaTrophy} />} 
                borderRadius="full" px={6} size="lg"
              >
                Submit to Contest
              </Button>
              <Button 
                variant="outline"
                borderColor="brand.primary"
                color="brand.primary"
                _hover={{ bg: 'blackAlpha.50' }} 
                borderRadius="full"
                px={6} size="lg"
                onClick={onImageModalClose}
              >
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {designToSubmit && (
        <AlertDialog
            isOpen={isAlertOpen}
            leastDestructiveRef={cancelRef}
            onClose={onAlertClose}
            isCentered
        >
            <AlertDialogOverlay>
                <AlertDialogContent bg="brand.paper" borderRadius="lg">
                    <AlertDialogHeader fontSize="xl" fontWeight="bold" color="brand.textDark">Confirm Submission</AlertDialogHeader>
                    <AlertDialogBody color="brand.textDark">
                        Are you sure you want to submit "{designToSubmit.prompt.substring(0,50)}{designToSubmit.prompt.length > 50 ? "..." : ""}" to the monthly contest? 
                        You can only submit one design per month. This action cannot be undone for the current month.
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <Button 
                            ref={cancelRef} 
                            onClick={onAlertClose} 
                            isDisabled={isSubmitting} 
                            variant="outline"
                            borderColor="brand.primary"
                            color="brand.primary"
                            _hover={{ bg: 'blackAlpha.50' }}
                            borderRadius="full"
                            px={6} size="lg"
                        >
                            Cancel
                        </Button>
                        <Button 
                            bg="brand.accentYellow"
                            color="brand.textDark"
                            _hover={{bg: "brand.accentYellowHover"}} 
                            onClick={handleConfirmSubmitToContest} 
                            ml={3} 
                            isLoading={isSubmitting} 
                            loadingText="Submitting..." 
                            leftIcon={<Icon as={FaCheckCircle} />} 
                            borderRadius="full" px={6} size="lg"
                        >
                            Yes, Submit This Design
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialogOverlay>
        </AlertDialog>
      )}
    </Box>
  );
}
