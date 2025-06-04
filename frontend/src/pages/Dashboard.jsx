// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { client } from '../api/client';
import { 
    Box, Heading, Text, VStack, Divider, Button, useToast, 
    SimpleGrid, Image, Spinner, Alert, AlertIcon, 
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, useDisclosure,
    Icon 
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
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
    // MainLayout provides base padding, so mt/px removed from here for direct content flow
    <Box maxW="6xl" pb={10}> 
      {/* Page Title - UPDATED FOR UNIFORMITY */}
      <Heading 
        as="h1" 
        size="pageTitle" // Using the new custom size from theme.js
        color="brand.textLight" 
        textAlign="left" 
        w="100%"
        mb={{ base: 4, md: 6 }} // Consistent bottom margin
      > 
        Dashboard
      </Heading>

      {user && 
        <Heading 
          as="h2" 
          // Retaining original size/style for sub-heading
          size={{ base: "md", md: "lg" }} 
          my={{ base: 4, md: 6 }} 
          textAlign="left" 
          color="brand.textLight" 
          fontWeight="normal"
        > 
          Welcome back, {user.firstName || user.username || user.email}!
        </Heading>
      }
      
      <Divider my={{ base: 6, md: 8 }} borderColor="brand.secondary" />

      <VStack align="stretch" spacing={{ base: 6, md: 10 }}> 
        <Box>
          <Heading 
            as="h2" 
            // Retaining original size/style for section heading
            size={{ base: "md", md: "lg" }} 
            mb={{ base: 4, md: 6 }} 
            pb={2}
            color="brand.textLight" 
            borderBottomWidth="2px" 
            borderColor="brand.accentYellow"
            textAlign="left"
          >
            Recent Designs
          </Heading>
          {loadingDesigns && (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" color="brand.primary" thickness="4px" speed="0.65s" emptyColor="gray.200" />
              <Text mt={3} color="brand.textLight" fontSize={{ base: "md", md: "lg" }}> 
                Loading your masterpieces...
              </Text>
            </Box>
          )}
          {!loadingDesigns && designsError && (
            <Alert status="error" bg="brand.paper" borderRadius="md" flexDirection={{ base: "column", sm: "row"}} p={{ base: 3, sm: 4}}> 
              <AlertIcon />
              <Text color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>{designsError}</Text>
            </Alert>
          )}
          {!loadingDesigns && !designsError && recentDesigns.length === 0 && (
            <VStack 
                spacing={5} p={{ base: 4, md: 8}} bg="rgba(255,255,255,0.1)" borderRadius="xl" 
                shadow="md" borderWidth="1px" borderColor="rgba(255,255,255,0.2)" mt={4}
            >
              <Icon as={FaPlusSquare} boxSize={{ base: "40px", md: "50px" }} color="brand.textLight" /> 
              <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="medium" color="brand.textLight" textAlign="center">
                You haven’t created any designs yet!
              </Text>
              <Button
                onClick={() => navigate('/generate')}
                bg="brand.accentYellow" color="brand.textDark" 
                _hover={{ bg: 'brand.accentYellowHover' }}
                size={{ base: "md", md: "lg" }} 
                leftIcon={<Icon as={FaMagic} />} borderRadius="full" 
                px={{ base: 6, md: 8 }} 
                fontSize={{ base: "sm", md: "lg" }} 
                boxShadow="md" _active={{ boxShadow: "lg" }}
              >
                Let’s Create Your First Design!
              </Button>
            </VStack>
          )}
          {!loadingDesigns && !designsError && recentDesigns.length > 0 && (
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={{ base: 4, md: 6 }}>
              {recentDesigns.map(design => (
                <Box 
                  key={design._id} bg="brand.paper" borderRadius="xl" overflow="hidden" 
                  shadow="lg" cursor="pointer" onClick={() => handleRecentDesignClick(design)}
                  transition="all 0.2s ease-in-out"
                  _hover={{ boxShadow: "2xl", transform: "translateY(-4px) scale(1.02)" }}
                  display="flex" flexDirection="column"
                >
                  <Image src={design.imageDataUrl} alt={design.prompt} fit="cover" w="100%" h={{ base: "180px", md: "220px" }} bg="gray.200" /> 
                  <Box p={{ base: 3, md: 5 }} flexGrow={1}> 
                    <Text 
                      fontSize={{ base: "sm", md: "md" }} 
                      color="brand.textDark" 
                      title={design.prompt}
                      fontWeight="medium"
                      // noOfLines={2} 
                    >
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
        <Modal isOpen={isOpen} onClose={onClose} size={{ base: "full", sm: "xl" }} isCentered> 
          <ModalOverlay bg="blackAlpha.700" />
          <ModalContent bg="brand.paper" borderRadius={{ base: "none", sm: "lg" }}> 
            <ModalHeader 
              color="brand.textDark" 
              fontWeight="bold" 
              fontSize={{ base: "lg", md: "xl" }} 
              noOfLines={2} 
            >
              Design Preview
            </ModalHeader>
            <ModalCloseButton color="brand.textDark" top={{ base: 2, sm: 3}} right={{ base: 2, sm: 3}} /> 
            <ModalBody display="flex" justifyContent="center" alignItems="center" py={6} px={{ base: 2, sm: 6}}>
              <Image src={selectedDesign.imageDataUrl} alt={selectedDesign.prompt} maxH={{ base: "60vh", sm: "70vh" }} maxW="95%" objectFit="contain" borderRadius="md"/>
            </ModalBody>
            <ModalFooter 
              borderTopWidth="1px" 
              borderColor="gray.200" 
              flexDirection={{ base: "column", sm: "row" }} 
              justifyContent={{ base: "center", sm: "flex-end" }} 
              alignItems="center" 
              py={4} px={{ base: 2, sm: 4}}
            >
              <Button 
                variant="outline"
                borderColor="brand.primary"
                color="brand.primary"
                _hover={{ bg: 'blackAlpha.50' }} 
                borderRadius="full"
                size="lg" 
                onClick={onClose}
                w={{ base: "full", sm: "auto" }}
              >
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
}
