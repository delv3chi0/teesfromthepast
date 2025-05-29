// frontend/src/pages/MyDesigns.jsx
import { useState, useEffect, useRef } from 'react';
import { /* ... all your Chakra imports ... */ Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, useDisclosure, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useToast, Icon, Link as ChakraLink } from '@chakra-ui/react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaPlusSquare, FaMagic, FaTrophy, FaTimes, FaCheckCircle } from 'react-icons/fa';

export default function MyDesigns() {
  // ... your existing state and functions (useEffect, handleImageClick, etc.) ...
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // ... other hooks ...

  useEffect(() => { /* ... your existing logic ... */ }, [user, logout, navigate]);
  const handleImageClick = (design) => { /* ... */ };
  const handleOpenSubmitConfirmation = (design) => { /* ... */ };
  const handleConfirmSubmitToContest = async () => { /* ... */ };


  if (loading) { /* ... */ }
  if (error) { /* ... */ }

  return (
    // This outermost Box has mx="auto" which is fine, but NO bg prop.
    // It will sit on MainLayout's brand.accentOrange background.
    <Box maxW="6xl" mx="auto" /* mt was {{base:6, md:8}} px={4} pb={10} */ > 
      <VStack spacing={6} align="stretch" mb={8} mt={{base:6, md:8}}> {/* Moved mt here */}
        <Heading as="h1" size="2xl" textAlign="center" color="brand.textLight"> {/* Ensure color for contrast */}
          My Saved Designs
        </Heading>
        {/* ... Rest of your JSX for empty state, buttons, and SimpleGrid ... */}
        {/* Ensure all text/headings on cards use brand.textDark */}
        {/* Ensure buttons use brand colors */}
      </VStack>

      {designs.length > 0 && ( /* Ensure SimpleGrid is only rendered if designs exist */
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
          {designs.map(design => (
            <Box 
              key={design._id} 
              bg="brand.paper" // Design cards are 'paper' (white)
              // ... rest of your card styling (borderRadius, shadow, hover) ...
            >
              {/* ... Image and Text ... */}
            </Box>
          ))}
        </SimpleGrid>
      )}
      {/* ... Modal and AlertDialog JSX ... */}
      {/* Ensure text/headings in Modals (bg="brand.paper") use brand.textDark */}
    </Box>
  );
}
