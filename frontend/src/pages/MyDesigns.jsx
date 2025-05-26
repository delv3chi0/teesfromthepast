// frontend/src/pages/MyDesigns.jsx
import { useState, useEffect } from 'react';
import { 
    Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, useDisclosure 
} from '@chakra-ui/react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';

export default function MyDesigns() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { isOpen, onOpen, onClose } = useDisclosure(); // For Modal
  const [selectedDesign, setSelectedDesign] = useState(null); // For Modal content

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
    onOpen();
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
            cursor="pointer" // Make it look clickable
            onClick={() => handleImageClick(design)} // Open modal on click
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
              {/* You could add other actions here, e.g., "Use this design" */}
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
}
