// frontend/src/pages/MyDesigns.jsx
import { useState, useEffect, useRef } from 'react';
import {
  Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  useDisclosure, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay, useToast, Icon, HStack, AspectRatio, Divider,
  Drawer, DrawerBody, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton,
  Code, Tooltip
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaPlusSquare, FaMagic, FaTrophy, FaTrashAlt, FaDownload, FaExternalLinkAlt, FaInfoCircle, FaClipboard } from 'react-icons/fa';
import { downloadImage } from '../utils/download';
import { cld } from '../utils/cloudinary';

const getCurrentMonthYYYYMM = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Build a nice metadata object for viewing/copying
const buildMeta = (d) => ({
  _id: d._id,
  createdAt: d.createdAt,
  user: d.user?.username || undefined,
  prompt: d.prompt,
  negativePrompt: d.negativePrompt || '',
  settings: d.settings || {},
  urls: {
    masterUrl: d.publicUrl || null,
    previewThumb: d.thumbUrl || null,
    inlineDataUrl: d.imageDataUrl ? `(data URL, length=${d.imageDataUrl.length})` : null
  },
  contest: d.isSubmittedForContest ? {
    month: d.contestSubmissionMonth,
    votes: d.votes || 0
  } : null
});

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

  // Metadata drawer
  const { isOpen: isMetaOpen, onOpen: onMetaOpen, onClose: onMetaClose } = useDisclosure();

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
  const cardSrc = (d) => cld.thumb(d.thumbUrl || d.publicUrl) || d.imageDataUrl || "";
  const modalSrc = (d) => cld.preview(d.publicUrl || d.thumbUrl) || d.imageDataUrl || "";

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

  const copyMeta = async () => {
    if (!selectedDesign) return;
    try {
      const data = buildMeta(selectedDesign);
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast({ title: 'Metadata copied to clipboard', status: 'success', duration: 1500 });
    } catch {
      toast({ title: 'Copy failed', status: 'error' });
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
                    src={cardSrc(design)}
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
                </Box>
              </Box>
            ))}
          </SimpleGrid>

          <VStack mt={8}>
            {hasMore ? (
              <Button isLoading={loadingMore} onClick={() => fetchDesigns(page + 1, true)} colorScheme="brandAccentYellow">
                Load more
              </Button>
            ) : (
              <Text fontSize="sm" color="brand.textMuted">No more designs.</Text>
            )}
          </VStack>
        </>
      )}

      {/* Preview Modal */}
      {selectedDesign && (
        <Modal isOpen={isImageModalOpen} onClose={onImageModalClose} size="5xl" isCentered>
          <ModalOverlay bg="blackAlpha.800"/>
          <ModalContent>
            <ModalHeader display="flex" alignItems="center" justifyContent="space-between">
              <Text>Design Preview</Text>
              <HStack spacing={3}>
                <Tooltip label="View metadata">
                  <Button size="sm" leftIcon={<FaInfoCircle/>} variant="outline" onClick={onMetaOpen}>
                    Metadata
                  </Button>
                </Tooltip>
                <Tooltip label="Open full size in a new tab">
                  <Button
                    size="sm"
                    leftIcon={<FaExternalLinkAlt/>}
                    variant="outline"
                    isDisabled={!selectedDesign.publicUrl}
                    onClick={() => {
                      if (selectedDesign.publicUrl) window.open(cld.auto(selectedDesign.publicUrl), '_blank', 'noopener,noreferrer');
                    }}
                  >
                    Open Full
                  </Button>
                </Tooltip>
              </HStack>
            </ModalHeader>
            <ModalCloseButton _hover={{bg:"whiteAlpha.200"}}/>
            <ModalBody py={4}>
              <VStack spacing={4}>
                <Image
                  src={modalSrc(selectedDesign)}
                  alt={selectedDesign.prompt}
                  maxH="80vh"
                  maxW="100%"
                  objectFit="contain"
                  borderRadius="md"
                  bg="black"
                />
                {selectedDesign.prompt && (
                  <>
                    <Divider/>
                    <Box w="100%">
                      <Text fontWeight="semibold" mb={1}>Prompt</Text>
                      <Text fontSize="sm" color="brand.textLight">{selectedDesign.prompt}</Text>
                      {selectedDesign.negativePrompt ? (
                        <>
                          <Text fontWeight="semibold" mt={4} mb={1}>Negative Prompt</Text>
                          <Text fontSize="sm" color="brand.textLight">{selectedDesign.negativePrompt}</Text>
                        </>
                      ) : null}
                    </Box>
                  </>
                )}
              </VStack>
            </ModalBody>
            <ModalFooter bg="brand.secondary" borderBottomRadius="md" justifyContent="space-between" gap={3} flexWrap="wrap">
              <Button colorScheme="red" onClick={() => setDesignToDelete(selectedDesign) || onDeleteAlertOpen()} isLoading={isDeleting} leftIcon={<Icon as={FaTrashAlt} />}>
                Delete
              </Button>
              <HStack>
                <Button
                  leftIcon={<Icon as={FaDownload} />}
                  colorScheme="brandAccentYellow"
                  isDisabled={!selectedDesign.publicUrl && !selectedDesign.imageDataUrl}
                  onClick={() => {
                    const src = cld.auto(selectedDesign.publicUrl) || selectedDesign.imageDataUrl;
                    if (!src) return;
                    const name = (selectedDesign.prompt?.slice(0, 40) || 'design').replace(/[^\w\-]+/g, '_') + '.png';
                    downloadImage(src, name);
                  }}
                >
                  Download Full
                </Button>

                {/* Contest button logic unchanged */}
                {!selectedDesign.isSubmittedForContest ||
                selectedDesign.contestSubmissionMonth !== getCurrentMonthYYYYMM() ? (
                  <Button colorScheme="green" onClick={() => setDesignToSubmit(selectedDesign) || onContestAlertOpen()} isLoading={isSubmitting}>
                    Submit to Contest
                  </Button>
                ) : (
                  <Button colorScheme="green" isDisabled>Submitted for {selectedDesign.contestSubmissionMonth}</Button>
                )}
                <Button variant="ghost" onClick={onImageModalClose} _hover={{bg:"whiteAlpha.200"}}>Close</Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Metadata Drawer + Alerts unchanged (besides any cld.auto() usage above) */}
    </Box>
  );
}
