// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { client } from '../api/client';
import { 
  Box, Heading, Text, VStack, Divider, Button, useToast, 
  SimpleGrid, Image, Spinner, Alert, AlertIcon, 
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, useDisclosure,
  Icon, Flex
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { FaMagic, FaPlusSquare } from 'react-icons/fa';
import { cld } from '../utils/cloudinary';

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

  const cardSrc = (d) =>
    cld.thumb(d.thumbUrl || d.publicUrl) || d.imageDataUrl || "";

  const modalSrc = (d) =>
    cld.preview(d.publicUrl || d.thumbUrl) || d.imageDataUrl || "";

  return (
    <Box maxW="6xl" pb={10}> 
      <Heading as="h1" size="pageTitle" color="brand.textLight" textAlign="left" w="100%" mb={{ base: 4, md: 6 }}>
        Dashboard
      </Heading>

      {user && 
        <Heading as="h2" size={{ base: "md", md: "lg" }} my={{ base: 4, md: 6 }} textAlign="left" color="brand.textMuted" fontWeight="normal">
          Welcome back, {user.firstName || user.username || 'friend'}!
        </Heading>
      }
      
      <Divider my={{ base: 6, md: 8 }} borderColor="brand.secondary" />

      <VStack align="stretch" spacing={{ base: 6, md: 10 }}> 
        <Box>
          <Flex justifyContent="space-between" alignItems="center" mb={{ base: 4, md: 6 }}>
            <Heading as="h2" size={{ base: "md", md: "lg" }} color="brand.textLight" pb={2} borderBottomWidth="2px" borderColor="brand.accentYellow">
              Recent Designs
            </Heading>
            <Button variant="link" color="brand.accentYellow" onClick={() => navigate('/my-designs')}>
              View All
            </Button>
          </Flex>

          {loadingDesigns && (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" color="brand.accentOrange" thickness="4px" speed="0.65s" emptyColor="gray.600" />
              <Text mt={4} color="brand.textMuted" fontSize={{ base: "md", md: "lg" }}> 
                Loading your masterpieces...
              </Text>
            </Box>
          )}

          {!loadingDesigns && designsError && (
            <Alert status="error" bg="red.900" borderRadius="md" p={{ base: 3, sm: 4}}> 
              <AlertIcon color="red.300" />
              <Text color="red.100" fontSize={{ base: "sm", md: "md" }}>{designsError}</Text>
            </Alert>
          )}

          {!loadingDesigns && !designsError && recentDesigns.length === 0 && (
            <VStack spacing={5} p={{ base: 4, md: 8}} bg="brand.secondary" borderRadius="xl" shadow="md" borderWidth="1px" borderColor="brand.primary" mt={4}>
              <Icon as={FaPlusSquare} boxSize={{ base: "40px", md: "50px" }} color="brand.textMuted" /> 
              <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="medium" color="brand.textLight" textAlign="center">
                You haven’t created any designs yet!
              </Text>
              <Button
                onClick={() => navigate('/generate')}
                colorScheme="brandAccentOrange"
                size={{ base: "md", md: "lg" }} 
                leftIcon={<Icon as={FaMagic} />}
                px={{ base: 6, md: 8 }} 
                fontSize={{ base: "sm", md: "lg" }} 
              >
                Create Your First Design
              </Button>
            </VStack>
          )}
          
          {!loadingDesigns && !designsError && recentDesigns.length > 0 && (
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={{ base: 4, md: 6 }}>
              {recentDesigns.map(design => (
                <Box 
                  key={design._id} bg="brand.cardBlue" borderRadius="xl" overflow="hidden" 
                  shadow="lg" cursor="pointer" onClick={() => handleRecentDesignClick(design)}
                  transition="all 0.2s ease-in-out"
                  _hover={{ boxShadow: "2xl", transform: "translateY(-4px)" }}
                  display="flex" flexDirection="column"
                >
                  <Image src={cardSrc(design)} alt={design.prompt} fit="cover" w="100%" h={{ base: "180px", md: "220px" }} bg="brand.secondary" /> 
                  <Box p={{ base: 3, md: 4 }} flexGrow={1}> 
                    <Text fontSize={{ base: "sm", md: "sm" }} color="brand.textLight" title={design.prompt} fontWeight="medium" noOfLines={2}>
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
          <ModalOverlay bg="blackAlpha.800" />
          <ModalContent> 
            <ModalHeader fontWeight="bold" fontSize={{ base: "lg", md: "xl" }}>Design Preview</ModalHeader>
            <ModalCloseButton top={{ base: 2, sm: 3}} right={{ base: 2, sm: 3}} /> 
            <ModalBody display="flex" justifyContent="center" alignItems="center" py={6} px={{ base: 2, sm: 6}}>
              <Image src={modalSrc(selectedDesign)} alt={selectedDesign.prompt} maxH={{ base: "60vh", sm: "70vh" }} maxW="95%" objectFit="contain" borderRadius="md"/>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
}
