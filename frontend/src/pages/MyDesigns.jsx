// frontend/src/pages/MyDesigns.jsx
import { useState, useEffect, useRef } from 'react';
import {
    Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
    useDisclosure, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay,
    useToast, Icon, HStack, Card, CardBody
} from '@chakra-ui/react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
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
            toast({ title: "Session Expired", description: "Please log in again.", status: "warning" });
            logout();
            navigate('/login');
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    fetchDesigns();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleImageClick = (design) => { setSelectedDesign(design); onImageModalOpen(); };
  const handleOpenSubmitConfirmation = (design) => { setDesignToSubmit(design); onContestAlertOpen(); };
  const handleConfirmSubmitToContest = async () => {
    if (!designToSubmit) return;
    setIsSubmitting(true);
    try {
      const response = await client.post(`/contest/submit/${designToSubmit._id}`);
      toast({ title: "Submission Successful!", description: response.data.message, status: "success" });
      onImageModalClose();
      onContestAlertClose();
      fetchDesigns();
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Could not submit your design.";
      toast({ title: "Submission Failed", description: errorMessage, status: "error" });
      onContestAlertClose();
    } finally {
      setIsSubmitting(false);
      setDesignToSubmit(null);
    }
  };
  const handleOpenDeleteConfirmation = (design) => { setDesignToDelete(design); onDeleteAlertOpen(); };
  const handleConfirmDelete = async () => {
    if (!designToDelete) return;
    setIsDeleting(true);
    try {
      await client.delete(`/mydesigns/${designToDelete._id}`);
      toast({ title: "Design Deleted", status: "success" });
      onImageModalClose();
      onDeleteAlertClose();
      fetchDesigns();
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Could not delete the design.";
      toast({ title: "Deletion Failed", description: errorMessage, status: "error" });
      onDeleteAlertClose();
    } finally {
      setIsDeleting(false);
      setDesignToDelete(null);
    }
  };

  if (loading) return <VStack justifyContent="center" minH="60vh"><Spinner size="xl" /></VStack>;
  if (error) return <Alert status="error"><AlertIcon />{error}</Alert>;

  return (
    <Box w="100%">
      <VStack spacing={6} align="stretch" mb={8}>
        <Heading as="h1" size="pageTitle">My Saved Designs</Heading>
        {designs.length > 0 && (
          <Button colorScheme="brandAccentOrange" onClick={() => navigate('/generate')} alignSelf="flex-start" size="lg" leftIcon={<Icon as={FaMagic} />}>
            ✨ Create Another Design
          </Button>
        )}
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
            <Card as="div" key={design._id} p={0} overflow="hidden" cursor="pointer" onClick={() => handleImageClick(design)} _hover={{ transform: "translateY(-4px)" }} transition="transform 0.2s ease-in-out">
                <Image src={design.imageDataUrl} alt={design.prompt} fit="cover" w="100%" h="250px" bg="gray.900"/>
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
          <ModalOverlay bg="blackAlpha.700"/><ModalContent><ModalHeader>Design Preview</ModalHeader><ModalCloseButton />
            <ModalBody display="flex" justifyContent="center" alignItems="center" py={6}>
              <Image src={selectedDesign.imageDataUrl} alt={selectedDesign.prompt} maxH="75vh" maxW="100%" objectFit="contain" borderRadius="md"/>
            </ModalBody>
            <ModalFooter flexWrap="wrap" justifyContent="space-between" py={4}>
              <Button bg="red.600" color="white" _hover={{bg: "red.700"}} onClick={() => handleOpenDeleteConfirmation(selectedDesign)} isLoading={isDeleting} leftIcon={<Icon as={FaTrashAlt} />}>Delete</Button>
              <HStack>
                <Button colorScheme="brandAccentYellow" color="brand.textDark" onClick={() => handleOpenSubmitConfirmation(selectedDesign)} isLoading={isSubmitting} leftIcon={<Icon as={FaTrophy} />}>Submit to Contest</Button>
                <Button variant="ghost" onClick={onImageModalClose}>Close</Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
      {designToSubmit && (
        <AlertDialog isOpen={isContestAlertOpen} leastDestructiveRef={cancelRef} onClose={onContestAlertClose} isCentered>
          <AlertDialogOverlay><AlertDialogContent><AlertDialogHeader>Confirm Submission</AlertDialogHeader><AlertDialogBody>Are you sure you want to submit this design?</AlertDialogBody><AlertDialogFooter><Button ref={cancelRef} onClick={onContestAlertClose}>Cancel</Button><Button colorScheme="green" onClick={handleConfirmSubmitToContest} ml={3} isLoading={isSubmitting}>Yes, Submit</Button></AlertDialogFooter></AlertDialogContent></AlertDialogOverlay>
        </AlertDialog>
      )}
      {designToDelete && (
        <AlertDialog isOpen={isDeleteAlertOpen} leastDestructiveRef={cancelDeleteRef} onClose={onDeleteAlertClose} isCentered>
          <AlertDialogOverlay><AlertDialogContent><AlertDialogHeader>Confirm Deletion</AlertDialogHeader><AlertDialogBody>Are you sure you want to delete this design?</AlertDialogBody><AlertDialogFooter><Button ref={cancelDeleteRef} onClick={onDeleteAlertClose}>Cancel</Button><Button colorScheme="red" onClick={handleConfirmDelete} ml={3} isLoading={isDeleting}>Delete</Button></AlertDialogFooter></AlertDialogContent></AlertDialogOverlay>
        </AlertDialog>
      )}
    </Box>
  );
}
