// frontend/src/pages/MyDesigns.jsx
import { useState, useEffect, useRef } from 'react';
import {
    Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
    useDisclosure, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay,
    useToast, Icon, HStack, Card, CardBody
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaPlusSquare, FaMagic, FaTrophy, FaCheckCircle, FaTrashAlt } from 'react-icons/fa';

export default function MyDesigns() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const { isOpen: isImageModalOpen, onOpen: onImageModalOpen, onClose: onImageModalClose } = useDisclosure();
  const [selectedDesign, setSelectedDesign] = useState(null);

  const { isOpen: isContestAlertOpen, onOpen: onContestAlertOpen, onClose: onContestAlertClose } = useDisclosure();
  const [designToSubmit, setDesignToSubmit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cancelRef = useRef();

  const { isOpen: isDeleteAlertOpen, onOpen: onDeleteAlertOpen, onClose: onDeleteAlertClose } = useDisclosure();
  const [designToDelete, setDesignToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const cancelDeleteRef = useRef();

  const fetchDesigns = () => {
    if (user) {
      setLoading(true);
      setError('');
      client.get('/mydesigns')
        .then(response => {
          setDesigns(response.data);
        })
        .catch(err => {
          setError('Failed to load your designs. Please try again.');
          if (err.response?.status === 401) {
            toast({ title: "Session Expired", status: "warning" });
            logout();
            navigate('/login');
          }
        })
        .finally(() => {
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
    onContestAlertOpen();
  };

  const handleConfirmSubmitToContest = async () => { /* Unchanged */ };
  const handleOpenDeleteConfirmation = (design) => {
    setDesignToDelete(design);
    onDeleteAlertOpen();
  };
  const handleConfirmDelete = async () => { /* Unchanged */ };

  if (loading) {
    return (
      <VStack justifyContent="center" alignItems="center" minH="60vh">
        <Spinner size="xl" thickness="4px"/>
        <Text mt={3}>Loading Your Designs...</Text>
      </VStack>
    );
  }
  if (error) {
    return ( <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert> );
  }

  return (
    <Box w="100%">
      <VStack spacing={6} align="stretch" mb={8}>
        <Heading as="h1" size="pageTitle">My Saved Designs</Heading>
        <Button 
            bg="brand.accentOrange" color="white" _hover={{bg: "brand.accentOrangeHover"}} 
            onClick={() => navigate('/generate')} alignSelf="flex-start" size="lg" 
            leftIcon={<Icon as={FaMagic} />}
        >
            ✨ Create Another Design
        </Button>
      </VStack>

      {designs.length === 0 ? (
        <Card><CardBody><VStack spacing={5} py={8} textAlign="center">
            <Icon as={FaPlusSquare} boxSize="50px" color="brand.textMuted" />
            <Text fontSize="lg" fontWeight="medium">You haven't saved any designs yet!</Text>
            <Button colorScheme="brandAccentYellow" onClick={() => navigate('/generate')}>Let’s Create Your First Design!</Button>
        </VStack></CardBody></Card>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
          {designs.map(design => (
            <Card as="div" key={design._id} overflow="hidden" cursor="pointer" onClick={() => handleImageClick(design)} _hover={{ transform: "translateY(-4px)" }} transition="transform 0.2s ease-in-out">
              <Image src={design.imageDataUrl} alt={design.prompt} fit="cover" w="100%" h="250px" bg="gray.700"/>
              <CardBody>
                <Text noOfLines={2} title={design.prompt} fontWeight="medium">
                    {design.prompt || "Untitled Design"}
                </Text>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {selectedDesign && (
        <Modal isOpen={isImageModalOpen} onClose={onImageModalClose} size="2xl" isCentered>
          <ModalOverlay bg="blackAlpha.700"/>
          <ModalContent>
            <ModalHeader>Design Preview</ModalHeader>
            <ModalCloseButton />
            <ModalBody display="flex" justifyContent="center" alignItems="center" py={6}>
              <Image src={selectedDesign.imageDataUrl} alt={selectedDesign.prompt} maxH="75vh" maxW="100%" objectFit="contain" borderRadius="md"/>
            </ModalBody>
            <ModalFooter flexWrap="wrap" justifyContent="space-between" py={4}>
              <Button bg="red.500" _hover={{bg: "red.600"}} onClick={() => handleOpenDeleteConfirmation(selectedDesign)} isLoading={isDeleting} leftIcon={<Icon as={FaTrashAlt} />}>Delete</Button>
              <HStack>
                <Button bg="brand.accentYellow" color="brand.textDark" _hover={{bg: "brand.accentYellowHover"}} onClick={() => handleOpenSubmitConfirmation(selectedDesign)} isLoading={isSubmitting} leftIcon={<Icon as={FaTrophy} />}>Submit to Contest</Button>
                <Button variant="ghost" onClick={onImageModalClose}>Close</Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {designToSubmit && (<AlertDialog isOpen={isContestAlertOpen} leastDestructiveRef={cancelRef} onClose={onContestAlertClose} isCentered>{/* ... */}</AlertDialog>)}
      {designToDelete && (<AlertDialog isOpen={isDeleteAlertOpen} leastDestructiveRef={cancelDeleteRef} onClose={onDeleteAlertClose} isCentered>{/* ... */}</AlertDialog>)}
    </Box>
  );
}
