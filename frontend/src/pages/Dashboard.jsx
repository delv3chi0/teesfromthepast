// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { client } from '../api/client';
import { 
    Box, Heading, Text, VStack, Divider, Button, useToast, 
    SimpleGrid, Image, Spinner, Alert, AlertIcon,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, useDisclosure 
} from '@chakra-ui/react'; // Added Modal components & useDisclosure
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [recentDesigns, setRecentDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [designsError, setDesignsError] = useState('');
  
  const navigate = useNavigate();
  const toast = useToast();

  // Modal state and handlers (copied from MyDesigns.jsx and adapted)
  const { isOpen, onOpen, onClose } = useDisclosure(); 
  const [selectedDesign, setSelectedDesign] = useState(null);

  useEffect(() => {
    if (user) {
      setLoadingDesigns(true);
      setDesignsError('');
      client.get('/mydesigns')
        .then(response => {
          setRecentDesigns(response.data.slice(0, 3));
          setLoadingDesigns(false);
        })
        .catch(err => {
          console.error("Error fetching recent designs:", err);
          setDesignsError('Could not load recent designs.');
          if (err.response?.status === 401) {
            toast({ title: "Session Expired", description: "Please log in again.", status: "warning", duration: 3000, isClosable: true });
            logout();
            navigate('/login');
          }
          setLoadingDesigns(false);
        });
    }
  }, [user, logout, navigate, toast]);

  const handleRecentDesignClick = (design) => {
    setSelectedDesign(design);
    onOpen();
  };

  return (
    <Box maxW="6xl" /* Removed mx="auto" */ mt={8} px={4} pb={10}> 
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="lg">Dashboard</Heading>
      </Box>

      {user && <Text fontSize="xl" mb={6}>Welcome back, {user.username || user.email}!</Text>}
      <Divider my={6} />

      <VStack align="stretch" spacing={8}>
        <Box>
          <Heading size="md" mb={4}>Recent Designs</Heading>
          {loadingDesigns && (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" /><Text mt={2}>Loading your masterpieces...</Text>
            </Box>
          )}
          {!loadingDesigns && designsError && (
            <Alert status="error"><AlertIcon />{designsError}</Alert>
          )}
          {!loadingDesigns && !designsError && recentDesigns.length === 0 && (
            <Box textAlign="center" p={5} borderWidth="1px" borderRadius="md" shadow="sm">
              <Text fontSize="lg" color="gray.500">You haven't created any designs yet!</Text>
              <Button mt={4} colorScheme="purple" onClick={() => navigate('/generate')}>
                ✨ Let's Create Your First Design!
              </Button>
            </Box>
          )}
          {!loadingDesigns && !designsError && recentDesigns.length > 0 && (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {recentDesigns.map(design => (
                <Box 
                  key={design._id} 
                  borderWidth="1px" 
                  borderRadius="lg" 
                  overflow="hidden" 
                  shadow="md"
                  cursor="pointer" // Make it look clickable
                  onClick={() => handleRecentDesignClick(design)} // Open modal on click
                  _hover={{ shadow: "xl", transform: "translateY(-2px)", transitionDuration: "0.2s" }}
                >
                  <Image src={design.imageDataUrl} alt={design.prompt} fit="cover" w="100%" h="200px" bg="gray.200" />
                  <Box p={4}>
                    <Text fontSize="sm" color="gray.600" noOfLines={2} title={design.prompt}>
                      {design.prompt}
                    </Text>
                  </Box>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>
      </VStack>

      {/* Modal for displaying the selected design */}
      {selectedDesign && (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader noOfLines={2} fontSize="md">{selectedDesign.prompt}</ModalHeader>
            <ModalCloseButton />
            <ModalBody display="flex" justifyContent="center" alignItems="center">
              <Image src={selectedDesign.imageDataUrl} alt={selectedDesign.prompt} maxH="70vh" maxW="100%" objectFit="contain"/>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={onClose}>
                Close
              </Button>
              <Button variant="ghost" onClick={() => { navigate('/generate'); onClose(); }}>Create Similar</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
}
