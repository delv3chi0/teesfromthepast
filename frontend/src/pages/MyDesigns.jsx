import { useState, useEffect, useRef } from 'react';
import {
    Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
    useDisclosure, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent,
    useToast, Icon, HStack
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaPlusSquare, FaMagic, FaTrophy, FaTrashAlt } from 'react-icons/fa';

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
                .then(response => { setDesigns(response.data); })
                .catch(err => {
                    setError('Failed to load your designs. Please try again.');
                    if (err.response?.status === 401) {
                        toast({ title: "Session Expired", description: "Please log in again.", status: "warning", isClosable: true });
                        logout();
                        navigate('/login');
                    }
                })
                .finally(() => { setLoading(false); });
        }
    };

    useEffect(() => { fetchDesigns(); }, [user]);

    const handleImageClick = (design) => { setSelectedDesign(design); onImageModalOpen(); };
    const handleOpenSubmitConfirmation = (design) => { setDesignToSubmit(design); onContestAlertOpen(); };
    const handleConfirmSubmitToContest = async () => {
        if (!designToSubmit) return;
        setIsSubmitting(true);
        try {
            const response = await client.post(`/contest/submit/${designToSubmit._id}`);
            toast({ title: "Submission Successful!", description: response.data.message, status: "success", isClosable: true });
            onImageModalClose();
            onContestAlertClose();
            fetchDesigns();
        } catch (err) {
            const errorMessage = err.response?.data?.message || "Could not submit your design.";
            toast({ title: "Submission Failed", description: errorMessage, status: "error", isClosable: true });
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
            toast({ title: "Design Deleted", status: "success", isClosable: true });
            onImageModalClose();
            onDeleteAlertClose();
            fetchDesigns();
        } catch (err) {
            const errorMessage = err.response?.data?.message || "Could not delete the design.";
            toast({ title: "Deletion Failed", description: errorMessage, status: "error", isClosable: true });
            onDeleteAlertClose();
        } finally {
            setIsDeleting(false);
            setDesignToDelete(null);
        }
    };

    if (loading) {
        return (
            <VStack justifyContent="center" minH="60vh">
                <Spinner size="xl" color="brand.accentYellow" thickness="4px" />
                <Text mt={4} fontSize="lg" color="brand.textLight">Loading Your Designs...</Text>
            </VStack>
        );
    }
    
    if (error) {
        return (
            <Alert status="error" bg="red.900" borderRadius="md" p={6} borderWidth="1px" borderColor="red.500">
                <AlertIcon color="red.300" />
                <Text color="white">{error}</Text>
            </Alert>
        );
    }

    return (
        <Box w="100%">
            <VStack spacing={6} align="stretch" mb={8}>
                <Heading as="h1" size="2xl" color="brand.textLight">My Saved Designs</Heading>
                {designs.length > 0 && (
                    <Button colorScheme="brandAccentOrange" onClick={() => navigate('/generate')} alignSelf="flex-start" size="lg" leftIcon={<Icon as={FaMagic} />}>
                        Create Another Design
                    </Button>
                )}
            </VStack>
            {designs.length === 0 ? (
                // MODIFIED: Changed background to match the themed cards
                <Box bg="brand.cardBlue" p={10} borderRadius="xl" textAlign="center">
                    <VStack spacing={5}>
                        <Icon as={FaPlusSquare} boxSize="50px" color="brand.accentYellow" />
                        <Text fontSize="xl" fontWeight="medium" color="brand.textLight">You haven't saved any designs yet!</Text>
                        <Button colorScheme="brandAccentOrange" onClick={() => navigate('/generate')}>Let’s Create Your First Design!</Button>
                    </VStack>
                </Box>
            ) : (
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
                    {designs.map(design => (
                        // MODIFIED: Changed background to match the themed cards
                        <Box as="div" key={design._id} bg="brand.cardBlue" borderRadius="xl" overflow="hidden" cursor="pointer" onClick={() => handleImageClick(design)} _hover={{ transform: "translateY(-5px)", boxShadow: "lg", borderColor: "brand.accentYellow" }} transition="all 0.2s ease-in-out" borderWidth="2px" borderColor="transparent">
                            <Image src={design.imageDataUrl} alt={design.prompt} fit="cover" w="100%" h="250px" bg="brand.secondary"/>
                            <Box p={4}>
                                <Text noOfLines={2} title={design.prompt} fontWeight="medium" color="brand.textLight">
                                    {design.prompt || "Untitled Design"}
                                </Text>
                            </Box>
                        </Box>
                    ))}
                </SimpleGrid>
            )}

            {/* View/Action Modal */}
            {selectedDesign && (
                <Modal isOpen={isImageModalOpen} onClose={onImageModalClose} size="2xl" isCentered>
                    <ModalOverlay bg="blackAlpha.800"/>
                    <ModalContent>
                        <ModalHeader>Design Preview</ModalHeader>
                        <ModalCloseButton _hover={{bg:"whiteAlpha.200"}}/>
                        <ModalBody display="flex" justifyContent="center" alignItems="center" py={6}>
                            <Image src={selectedDesign.imageDataUrl} alt={selectedDesign.prompt} maxH="70vh" maxW="100%" objectFit="contain" borderRadius="md"/>
                        </ModalBody>
                        <ModalFooter bg="brand.secondary" borderBottomRadius="md" justifyContent="space-between">
                            <Button colorScheme="red" onClick={() => handleOpenDeleteConfirmation(selectedDesign)} isLoading={isDeleting} leftIcon={<Icon as={FaTrashAlt} />}>Delete</Button>
                            <HStack>
                                <Button colorScheme="brandAccentYellow" onClick={() => handleOpenSubmitConfirmation(selectedDesign)} isLoading={isSubmitting} leftIcon={<Icon as={FaTrophy} />}>Submit to Contest</Button>
                                <Button variant="ghost" onClick={onImageModalClose} _hover={{bg:"whiteAlpha.200"}}>Close</Button>
                            </HStack>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            )}

            {/* Submit to Contest Dialog */}
            {designToSubmit && (
                <AlertDialog isOpen={isContestAlertOpen} leastDestructiveRef={cancelRef} onClose={onContestAlertClose} isCentered>
                    <AlertDialogOverlay bg="blackAlpha.800" />
                    <AlertDialogContent>
                        <AlertDialogHeader>Confirm Submission</AlertDialogHeader>
                        <AlertDialogBody>Are you sure you want to submit this design to the monthly contest?</AlertDialogBody>
                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={onContestAlertClose} variant="ghost" _hover={{bg:"whiteAlpha.200"}}>Cancel</Button>
                            <Button colorScheme="green" onClick={handleConfirmSubmitToContest} ml={3} isLoading={isSubmitting}>Yes, Submit</Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {/* Delete Design Dialog */}
            {designToDelete && (
                <AlertDialog isOpen={isDeleteAlertOpen} leastDestructiveRef={cancelDeleteRef} onClose={onDeleteAlertClose} isCentered>
                    <AlertDialogOverlay bg="blackAlpha.800" />
                    <AlertDialogContent>
                        <AlertDialogHeader>Confirm Deletion</AlertDialogHeader>
                        <AlertDialogBody>This action cannot be undone. Are you sure you want to permanently delete this design?</AlertDialogBody>
                        <AlertDialogFooter>
                            <Button ref={cancelDeleteRef} onClick={onDeleteAlertClose} variant="ghost" _hover={{bg:"whiteAlpha.200"}}>Cancel</Button>
                            <Button colorScheme="red" onClick={handleConfirmDelete} ml={3} isLoading={isDeleting}>Delete</Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </Box>
    );
}
