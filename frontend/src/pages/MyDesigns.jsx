// frontend/src/pages/MyDesigns.jsx
import { useState, useEffect, useRef } from 'react'; // Added useRef
import { 
    Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, 
    useDisclosure, // This is for the main image modal
    AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, // For confirmation
    useToast // For notifications
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom'; // Removed RouterLink as ChakraLink wasn't used directly with it here
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';

export default function MyDesigns() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // For the main image display modal
  const { isOpen: isImageModalOpen, onOpen: onImageModalOpen, onClose: onImageModalClose } = useDisclosure();
  const [selectedDesign, setSelectedDesign] = useState(null);

  // For the submission confirmation AlertDialog
  const { isOpen: isAlertOpen, onOpen: onAlertOpen, onClose: onAlertClose } = useDisclosure();
  const [designToSubmit, setDesignToSubmit] = useState(null); // Store the design we are about to submit
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for submission
  const cancelRef = useRef(); // For AlertDialog

  useEffect(() => {
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
            logout();
            navigate('/login');
          }
          setLoading(false);
        });
    } else {
        setLoading(false);
        setError("You need to be logged in to see your designs.");
    }
  }, [user, logout, navigate]);

  const handleImageClick = (design) => {
    setSelectedDesign(design);
    onImageModalOpen();
  };

  const handleOpenSubmitConfirmation = (design) => {
    setDesignToSubmit(design); // Set the design that we intend to submit
    onAlertOpen(); // Open the confirmation dialog
  };

  const handleConfirmSubmitToContest = async () => {
    if (!designToSubmit) return;

    setIsSubmitting(true);
    onAlertClose(); // Close the confirmation dialog

    try {
      // Call the backend endpoint to submit the design
      const response = await client.post(`/contest/submit/${designToSubmit._id}`);
      
      toast({
        title: "Submission Successful!",
        description: response.data.message || "Your design has been submitted to the contest.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      
      // Optionally, refresh designs to reflect submission status or update user context
      // For now, we'll just close the image modal. The user might have a visual cue later (e.g., badge on design).
      onImageModalClose(); 
      // You might want to update the local 'designs' state or re-fetch them if the backend
      // response or user object now indicates they've used their monthly submission.

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
    } finally {
      setIsSubmitting(false);
      setDesignToSubmit(null); // Clear the design to submit
    }
  };


  if (loading) {
    return (
      <Box textAlign="center" mt={20}>
        <Spinner size="xl" /><Text mt={4}>Loading your awesome designs...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" mt={20} px={4}>
        <Alert status="error"><AlertIcon />{error}</Alert>
        <Button mt={4} onClick={() => navigate('/generate')}>Create a New Design</Button>
      </Box>
    );
  }

  return (
    <Box maxW="6xl" mx="auto" mt={8} px={4} pb={10}>
      <VStack spacing={4} align="stretch" mb={8}>
        <Heading as="h1" size="xl" textAlign="center">My Saved Designs</Heading>
        {designs.length === 0 && (
          <Text textAlign="center" fontSize="lg" color="gray.500">
            You haven't saved any designs yet. Go create some!
          </Text>
        )}
        <Button colorScheme="purple" onClick={() => navigate('/generate')} alignSelf="center" size="lg" mt={2}>
          ✨ Create a New Design
        </Button>
      </VStack>

      <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
        {designs.map(design => (
          <Box 
            key={design._id} 
            borderWidth="1px" 
            borderRadius="lg" 
            overflow="hidden" 
            shadow="md"
            cursor="pointer"
            onClick={() => handleImageClick(design)}
            _hover={{ shadow: "xl", transform: "translateY(-2px)", transitionDuration: "0.2s" }}
          >
            <Image src={design.imageDataUrl} alt={design.prompt} fit="cover" w="100%" h="250px" bg="gray.200"/> 
            <Box p={4}>
              <Text fontSize="sm" color="gray.600" noOfLines={3} title={design.prompt}>
                Prompt: {design.prompt}
              </Text>
            </Box>
          </Box>
        ))}
      </SimpleGrid>

      {/* Modal for displaying the selected design */}
      {selectedDesign && (
        <Modal isOpen={isImageModalOpen} onClose={onImageModalClose} size="xl" isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader noOfLines={2} fontSize="md">{selectedDesign.prompt}</ModalHeader>
            <ModalCloseButton />
            <ModalBody display="flex" justifyContent="center" alignItems="center">
              <Image src={selectedDesign.imageDataUrl} alt={selectedDesign.prompt} maxH="70vh" maxW="100%" objectFit="contain"/>
            </ModalBody>
            <ModalFooter>
              <Button 
                colorScheme="green" // Or your brand's accent color
                mr={3} 
                onClick={() => handleOpenSubmitConfirmation(selectedDesign)}
                isLoading={isSubmitting} // Show loading state if currently submitting this design
                isDisabled={isSubmitting}
              >
                🏆 Submit to Contest
              </Button>
              <Button variant="ghost" onClick={onImageModalClose}>
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Confirmation AlertDialog for Submitting to Contest */}
      {designToSubmit && (
        <AlertDialog
            isOpen={isAlertOpen}
            leastDestructiveRef={cancelRef}
            onClose={onAlertClose}
            isCentered
        >
            <AlertDialogOverlay>
                <AlertDialogContent>
                    <AlertDialogHeader fontSize="lg" fontWeight="bold">
                        Confirm Submission
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        Are you sure you want to submit this design to the monthly contest? 
                        You can only submit one design per month. This action cannot be undone for the current month.
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <Button ref={cancelRef} onClick={onAlertClose} isDisabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button 
                            colorScheme="green" 
                            onClick={handleConfirmSubmitToContest} 
                            ml={3}
                            isLoading={isSubmitting}
                            loadingText="Submitting..."
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
