// frontend/src/pages/MyDesigns.jsx
import { useState, useEffect, useRef } from 'react';
import { 
    Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, 
    useDisclosure, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, 
    AlertDialogContent, AlertDialogOverlay, useToast, Icon, HStack
} from '@chakra-ui/react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaPlusSquare, FaTrophy, FaTimes, FaCheckCircle } from 'react-icons/fa'; // Icons

export default function MyDesigns() {
  // ... (useState, useEffect for fetching designs, modal state - all remain the same)
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
    // ... (fetching logic remains the same) ...
    if (user) {
      setLoading(true); setError('');
      client.get('/mydesigns')
        .then(response => { setDesigns(response.data); setLoading(false); })
        .catch(err => { /* ... error handling ... */ 
            console.error("Error fetching designs:", err);
            setError('Failed to load your designs. Please try again.');
            if (err.response?.status === 401) { logout(); navigate('/login'); }
            setLoading(false);
        });
    } else { setLoading(false); setError("You need to be logged in to see your designs."); }
  }, [user, logout, navigate]);


  const handleImageClick = (design) => {
    setSelectedDesign(design);
    onImageModalOpen();
  };

  const handleOpenSubmitConfirmation = (design) => {
    setDesignToSubmit(design);
    onAlertOpen();
  };

  const handleConfirmSubmitToContest = async () => {
    // ... (this function remains the same) ...
    if (!designToSubmit) return;
    setIsSubmitting(true); onAlertClose();
    try {
      const response = await client.post(`/contest/submit/${designToSubmit._id}`);
      toast({ title: "Submission Successful!", description: response.data.message || "Your design submitted.", status: "success", /*...*/});
      onImageModalClose(); 
      // Consider re-fetching designs here to update submission status visually if needed
      // fetchDesigns(); // You'd need to create this wrapper if you call it from multiple places
    } catch (err) { /* ... error handling ... */ 
        console.error("Error submitting design:", err);
        const errorMessage = err.response?.data?.message || "Could not submit design.";
        toast({ title: "Submission Failed", description: errorMessage, status: "error", /*...*/});
        if (err.response?.status === 401) { logout(); navigate('/login');}
    } finally { setIsSubmitting(false); setDesignToSubmit(null); }
  };


  if (loading) { /* ... (loading spinner remains same) ... */ }
  if (error) { /* ... (error alert remains same) ... */ }

  return (
    // Outermost Box has no bg, will inherit orange from MainLayout
    <Box maxW="6xl" mx="auto" mt={{base:6, md:8}} px={4} pb={10}>
      <VStack spacing={6} align="stretch" mb={8}> {/* Increased spacing */}
        <Heading as="h1" size="2xl" textAlign="center">My Saved Designs</Heading>
        
        {designs.length === 0 && !loading && !error && (
          // Enhanced Empty State
          <VStack 
            spacing={5} 
            p={8} 
            bg="rgba(255,255,255,0.1)" 
            borderRadius="xl" 
            shadow="md"
            borderWidth="1px"
            borderColor="rgba(255,255,255,0.2)"
            mt={8} // Added margin top
          >
            <Icon as={FaPlusSquare} boxSize="60px" color="brand.textLight" /> 
            <Text fontSize="xl" fontWeight="medium" color="brand.textLight">
              You haven't saved any designs yet!
            </Text>
            <Button
              onClick={() => navigate('/generate')}
              bg="brand.accentYellow"
              color="brand.textDark"
              _hover={{ bg: 'brand.accentYellowHover' }}
              size="lg"
              leftIcon={<Icon as={FaMagic} />}
              borderRadius="full"
              px={8} py={6} fontSize="lg"
              boxShadow="md" _active={{ boxShadow: "lg" }}
            >
              Let's Create Your First Design!
            </Button>
          </VStack>
        )}
        {designs.length > 0 && (
             <Button 
                colorScheme="brandAccentYellow" // Or bg="brand.accentYellow", color="brand.textDark"
                onClick={() => navigate('/generate')} 
                alignSelf="center" 
                size="lg" 
                mt={2}
                leftIcon={<Icon as={FaMagic} />}
                borderRadius="full"
                px={6}
             >
             ✨ Create Another Design
           </Button>
        )}
      </VStack>

      {designs.length > 0 && (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
          {designs.map(design => (
            // Enhanced Card Styling for design tiles
            <Box 
              key={design._id} 
              bg="brand.paper" // Card background
              borderRadius="xl" // More rounded
              overflow="hidden" 
              shadow="lg" // Enhanced shadow
              cursor="pointer"
              onClick={() => handleImageClick(design)}
              transition="all 0.2s ease-in-out"
              _hover={{ 
                boxShadow: "2xl", 
                transform: "translateY(-4px) scale(1.02)" 
              }}
            >
              <Image src={design.imageDataUrl} alt={design.prompt} fit="cover" w="100%" h="250px" bg="gray.200"/> 
              <Box p={5}> {/* Increased padding */}
                <Text fontSize="md" color="brand.textDark" noOfLines={2} title={design.prompt} minH="40px" fontWeight="medium">
                  {design.prompt || "Untitled Design"}
                </Text>
                {/* You could add a small "Submitted to contest" badge here if design.isSubmittedForContest is true */}
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      )}

      {/* Modal for displaying the selected design */}
      {selectedDesign && (
        <Modal isOpen={isImageModalOpen} onClose={onImageModalClose} size="2xl" isCentered> {/* Larger modal */}
          <ModalOverlay bg="blackAlpha.700"/>
          <ModalContent bg="brand.paper" borderRadius="lg">
            <ModalHeader color="brand.textDark" fontWeight="bold" noOfLines={3} fontSize="xl">{selectedDesign.prompt}</ModalHeader>
            <ModalCloseButton color="brand.textDark" />
            <ModalBody display="flex" justifyContent="center" alignItems="center" py={6}>
              <Image src={selectedDesign.imageDataUrl} alt={selectedDesign.prompt} maxH="75vh" maxW="95%" objectFit="contain" borderRadius="md"/>
            </ModalBody>
            <ModalFooter borderTopWidth="1px" borderColor="gray.200">
              <Button 
                bg="brand.accentYellow" // Use brand colors
                color="brand.textDark"
                _hover={{bg: "brand.accentYellowHover"}}
                mr={3} 
                onClick={() => handleOpenSubmitConfirmation(selectedDesign)}
                isLoading={isSubmitting}
                isDisabled={isSubmitting}
                leftIcon={<Icon as={FaTrophy} />}
                borderRadius="full"
                px={6}
              >
                Submit to Contest
              </Button>
              <Button variant="ghost" onClick={onImageModalClose} color="brand.textDark">
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Confirmation AlertDialog - styling remains largely the same, uses theme button colors */}
      {designToSubmit && (
        <AlertDialog
            isOpen={isAlertOpen}
            leastDestructiveRef={cancelRef}
            onClose={onAlertClose}
            isCentered
        >
            <AlertDialogOverlay>
                <AlertDialogContent bg="brand.paper" borderRadius="lg">
                    <AlertDialogHeader fontSize="xl" fontWeight="bold" color="brand.textDark">
                        Confirm Submission
                    </AlertDialogHeader>
                    <AlertDialogBody color="brand.textDark">
                        Are you sure you want to submit "{designToSubmit.prompt.substring(0,30)}..." to the monthly contest? 
                        You can only submit one design per month. This action cannot be undone for the current month.
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <Button ref={cancelRef} onClick={onAlertClose} isDisabled={isSubmitting} variant="outline" colorScheme="gray">
                            Cancel
                        </Button>
                        <Button 
                            bg="brand.primary" 
                            color="brand.textLight"
                            _hover={{bg: "brand.primaryLight"}}
                            onClick={handleConfirmSubmitToContest} 
                            ml={3}
                            isLoading={isSubmitting}
                            loadingText="Submitting..."
                            leftIcon={<Icon as={FaCheckCircle} />}
                            borderRadius="full"
                            px={6}
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
