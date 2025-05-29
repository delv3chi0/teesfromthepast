// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { client } from '../api/client';
import { 
    Box, Heading, Text, VStack, Divider, Button, useToast, 
    SimpleGrid, Image, Spinner, Alert, AlertIcon, Link as ChakraLink,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, useDisclosure,
    Icon 
} from '@chakra-ui/react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { FaMagic, FaPlusSquare } from 'react-icons/fa'; 

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [recentDesigns, setRecentDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [designsError, setDesignsError] = useState('');
  
  const navigate = useNavigate();
  const toast = useToast();

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
    } else {
      setLoadingDesigns(false); 
    }
  }, [user, logout, navigate, toast]);

  const handleRecentDesignClick = (design) => {
    setSelectedDesign(design);
    onOpen();
  };

  return (
    // Outermost box has no mx="auto", so it will be left-aligned within MainLayout's content area.
    // It also has no 'bg' prop, so it's transparent to MainLayout's brand.accentOrange.
    <Box maxW="6xl" mt={{base: 4, md: 6}} px={{base: 2, md: 4}} pb={10}> 
      <Box 
        display="flex" 
        // justifyContent="space-between" // Not needed if only heading is here
        alignItems="center" 
        mb={6}
      >
        {/* Page Title "Dashboard" - Left Aligned */}
        <Heading as="h1" size="xl" color="brand.textLight" textAlign="left"> 
          Dashboard
        </Heading>
      </Box>

      {/* Welcome Message - Left Aligned and Sized */}
      {user && 
        <Heading as="h2" size="lg" my={6} textAlign="left" color="brand.textLight" fontWeight="normal"> 
          {/* Using h2 for semantic hierarchy, size lg for slightly smaller than page title */}
          Welcome back, {user.firstName || user.username || user.email}!
        </Heading>
      }
      
      <Divider my={8} borderColor="brand.secondary" /> {/* Themed divider, increased margin */}

      <VStack align="stretch" spacing={10}>
        <Box>
          {/* Section Header - Left Aligned */}
          <Heading 
            as="h2" 
            size="lg" 
            mb={6} 
            pb={2}
            color="brand.textLight" 
            borderBottomWidth="2px" 
            borderColor="brand.accentYellow"
            textAlign="left" // Explicitly left-align
          >
            Recent Designs
          </Heading>
          {loadingDesigns && (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" color="brand.primary" thickness="4px" speed="0.65s" emptyColor="gray.200" />
              <Text mt={3} color="brand.textLight">Loading your masterpieces...</Text>
            </Box>
          )}
          {!loadingDesigns && designsError && (
            <Alert status="error" bg="brand.paper" borderRadius="md">
              <AlertIcon />
              <Text color="brand.textDark">{designsError}</Text>
            </Alert>
          )}
          {!loadingDesigns && !designsError && recentDesigns.length === 0 && (
            <VStack 
                spacing={5} p={8} bg="rgba(255,255,255,0.1)" borderRadius="xl" 
                shadow="md" borderWidth="1px" borderColor="rgba(255,255,255,0.2)" mt={4} // Reduced mt
            >
              <Icon as={FaPlusSquare} boxSize="50px" color="brand.textLight" /> 
              <Text fontSize="xl" fontWeight="medium" color="brand.textLight" textAlign="center">
                You haven’t created any designs yet!
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
          {!loadingDesigns && !designsError && recentDesigns.length > 0 && (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {recentDesigns.map(design => (
                <Box 
                  key={design._id} bg="brand.paper" borderRadius="xl" overflow="hidden" 
                  shadow="lg" cursor="pointer" onClick={() => handleRecentDesignClick(design)}
                  transition="all 0.2s ease-in-out"
                  _hover={{ boxShadow: "2xl", transform: "translateY(-4px) scale(1.02)" }}
                >
                  <Image src={design.imageDataUrl} alt={design.prompt} fit="cover" w="100%" h="220px" bg="gray.200" />
                  <Box p={5}>
                    <Text fontSize="md" color="brand.textDark" noOfLines={2} title={design.prompt} minH="40px" fontWeight="medium">
                      {design.prompt || "Untitled Design"}
                    </Text>
                  </Box>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>
      </VStack>

      {selectedDesign && (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
          <ModalOverlay bg="blackAlpha.700" />
          <ModalContent bg="brand.paper" borderRadius="lg">
            <ModalHeader color="brand.textDark" fontWeight="bold" noOfLines={2} fontSize="lg">{selectedDesign.prompt}</ModalHeader>
            <ModalCloseButton color="brand.textDark" />
            <ModalBody display="flex" justifyContent="center" alignItems="center" py={6}>
              <Image src={selectedDesign.imageDataUrl} alt={selectedDesign.prompt} maxH="70vh" maxW="90%" objectFit="contain" borderRadius="md"/>
            </ModalBody>
            <ModalFooter borderTopWidth="1px" borderColor="gray.200">
              <Button bg="brand.secondary" color="brand.textLight" _hover={{bg: 'brand.primaryDark'}} mr={3} onClick={onClose}>
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
}
