import { useState, useEffect, useRef } from 'react';
import {
  Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  useDisclosure, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay, useToast, Icon, HStack, AspectRatio
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaPlusSquare, FaMagic, FaTrophy, FaTrashAlt, FaDownload } from 'react-icons/fa';
import { downloadImage } from '../utils/download';

// Prefer Cloudinary thumb (w_400) in grid, derive preview (w_1200) for modal if needed
const derivePreviewFromPublicUrl = (publicUrl) => {
  if (!publicUrl || typeof publicUrl !== 'string') return null;
  try {
    const u = new URL(publicUrl);
    if (!u.hostname.includes('res.cloudinary.com')) return publicUrl;
    // bigger, web-friendly preview for the modal (JPEG is lighter)
    return publicUrl.replace('/upload/', '/upload/w_1200,q_auto:good,f_jpg/');
  } catch {
    return publicUrl;
  }
};

const getCurrentMonthYYYYMM = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export default function MyDesigns() {
  const [designs, setDesigns] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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

  const fetchDesigns = async (targetPage = 1, append = false) => {
    if (!user) return;
    try {
      if (targetPage === 1) {
        setLoading(true);
        setError('');
      } else {
        setLoadingMore(true);
      }
      const res = await client.get(`/mydesigns?page=${targetPage}&limit=24`);
      // Accept either an array (old) or {items,page,hasMore} (new)
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      const nextHasMore = Array.isArray(res.data) ? false : !!res.data?.hasMore;

      setDesigns(prev => append ? [...prev, ...items] : items);
      setPage(targetPage);
      setHasMore(nextHasMore);
    } catch (err) {
      setError('Failed to load your designs. Please try again.');
      if (err.response?.status === 401) {
        toast({ title: "Session Expired", description: "Please log in again.", status: "warning", isClosable: true });
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchDesigns(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
      fetchDesigns(1, false);
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
      fetchDesigns(1, false);
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
        <Spinner size="xl" />
        <Text mt={4} fontSize="lg" color="brand.textLight">Loading Your Designs...</Text>
      </VStack>
    );
  }

  if (error) {
    return (
      <Alert status="error" colorScheme="red" borderRadius="md" p={6} borderWidth="1px">
        <AlertIcon />
        <Text>{error}</Text>
      </Alert>
    );
  }

  return (
    <Box w="100%">
      <VStack spacing={6} align="stretch" mb={8}>
        <Heading as="h1" size="2xl" color="brand.textLight">My Saved Designs</Heading>
        {designs.length > 0 && (
          <Button
            colorScheme="brandAccentOrange"
            onClick={() => navigate('/generate')}
            alignSelf="flex-start"
            size="lg"
            leftIcon={<Icon as={FaMagic} />}
          >
            Create Another Design
          </Button>
        )}
      </VStack>

      {designs.length === 0 ? (
        <Box layerStyle="cardBlue" p={10} textAlign="center">
          <VStack spacing={5}>
            <Icon as={FaPlusSquare} boxSize="50px" />
            <Text fontSize="xl" fontWeight="medium">You haven't saved any designs yet!</Text>
            <Button colorScheme="brandAccentOrange" onClick={() => navigate('/generate')}>
              Let’s Create Your First Design!
            </Button>
          </VStack>
        </Box>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
            {designs.map(design => (
              <Box
                as="div"
                key={design._id}
                layerStyle="cardBlue"
                overflow="hidden"
                cursor="pointer"
                onClick={() => handleImageClick(design)}
                _hover={{ transform: "translateY(-5px)", boxShadow: "lg", borderColor: "brand.accentYellow" }}
                transition="all 0.2s ease-in-out"
                borderWidth="2px"
              >
                <AspectRatio ratio={1}>
                  <Image
                    src={
                      // prefer smallest first for speed (thumb → legacy dataURL → full)
                      design.thumbUrl ||
                      design.imageDataUrl ||
                      design.publicUrl ||
                      ''
                    }
                    alt={design.prompt}
                    fit="cover"
                    w="100%"
                    h="100%"
                    bg="brand.primary"
                    loading="lazy"
                    decoding="async"
                  />
                </AspectRatio>
                <Box p={4}>
                  <Text noOfLines={2} title={design.prompt} fontWeight="medium">
                    {design.prompt || "Untitled Design"}
                  </Text>
                  {design.isSubmittedForContest && design.contestSubmissionMonth ? (
                    <HStack mt={2} justifyContent="center">
                      <Icon as={FaTrophy} color="brand.accentYellow" />
                      <Text fontSize="sm" color="brand.textDark">
                        Submitted: {design.contestSubmissionMonth} ({design.votes || 0} votes)
                      </Text>
                    </HStack>
                  ) : (
                    <Text fontSize="sm" color="brand.textMuted" mt={2}>Not yet submitted to contest.</Text>
                  )}
                </Box>
              </Box>
            ))}
          </SimpleGrid>

          <VStack mt={8}>
            {hasMore ? (
              <Button
                isLoading={loadingMore}
                onClick={() => fetchDesigns(page + 1, true)}
                colorScheme="brandAccentYellow"
              >
                Load more
              </Button>
            ) : (
              <Text fontSize="sm" color="brand.textMuted">No more designs.</Text>
            )}
          </VStack>
        </>
      )}

      {/* View / Action Modal */}
      {selectedDesign && (
        <Modal isOpen={isImageModalOpen} onClose={onImageModalClose} size="3xl" isCentered>
          <ModalOverlay bg="blackAlpha.800"/>
          <ModalContent>
            <ModalHeader>Design Preview</ModalHeader>
            <ModalCloseButton _hover={{bg:"whiteAlpha.200"}}/>
            <ModalBody display="flex" justifyContent="center" alignItems="center" py={6}>
              <Image
                src={
                  // bigger preview if Cloudinary; otherwise fallback
                  derivePreviewFromPublicUrl(selectedDesign.publicUrl) ||
                  selectedDesign.imageDataUrl ||
                  selectedDesign.thumbUrl ||
                  selectedDesign.publicUrl ||
                  ''
                }
                alt={selectedDesign.prompt}
                maxH="70vh"
                maxW="100%"
                objectFit="contain"
                borderRadius="md"
              />
            </ModalBody>
            <ModalFooter bg="brand.secondary" borderBottomRadius="md" justifyContent="space-between">
              <Button
                colorScheme="red"
                onClick={() => handleOpenDeleteConfirmation(selectedDesign)}
                isLoading={isDeleting}
                leftIcon={<Icon as={FaTrashAlt} />}
              >
                Delete
              </Button>
              <HStack>
                <Button
                  leftIcon={<Icon as={FaDownload} />}
                  colorScheme="brandAccentYellow"
                  isDisabled={!selectedDesign.publicUrl && !selectedDesign.imageDataUrl}
                  onClick={() => {
                    const src = selectedDesign.publicUrl || selectedDesign.imageDataUrl;
                    if (!src) return;
                    const name =
                      (selectedDesign.prompt?.slice(0, 40) || 'design')
                        .replace(/[^\w\-]+/g, '_') + '.png';
                    downloadImage(src, name);
                  }}
                >
                  Download Full
                </Button>

                {!selectedDesign.isSubmittedForContest ||
                selectedDesign.contestSubmissionMonth !== getCurrentMonthYYYYMM() ? (
                  <Button
                    colorScheme="green"
                    onClick={() => handleOpenSubmitConfirmation(selectedDesign)}
                    isLoading={isSubmitting}
                    leftIcon={<Icon as={FaTrophy} />}
                  >
                    Submit to Contest
                  </Button>
                ) : (
                  <Button colorScheme="green" isDisabled leftIcon={<Icon as={FaTrophy} />}>
                    Submitted for {selectedDesign.contestSubmissionMonth}
                  </Button>
                )}
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
