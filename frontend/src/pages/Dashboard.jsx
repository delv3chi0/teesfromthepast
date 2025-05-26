// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { client } from '../api/client';
import { Box, Heading, Text, VStack, Divider, Button, useToast, SimpleGrid, Image, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import { useNavigate, Link as RouterLink } from 'react-router-dom'; // Added RouterLink
import { useAuth } from '../context/AuthProvider'; // Added useAuth

export default function Dashboard() {
  const { user, logout } = useAuth(); // Get user for welcome message & logout for error handling
  const [recentDesigns, setRecentDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [designsError, setDesignsError] = useState('');
  
  const navigate = useNavigate();
  const toast = useToast(); // Kept for potential future use, or remove if not needed

  useEffect(() => {
    // Profile data is now primarily handled by AuthProvider and available via useAuth()
    // We'll fetch designs here
    if (user) { // Only fetch designs if the user context is loaded
      setLoadingDesigns(true);
      setDesignsError('');
      client.get('/mydesigns') // Fetch all designs, sorted by newest first by backend
        .then(response => {
          setRecentDesigns(response.data.slice(0, 3)); // Take the first 3 for "recent"
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
    }
  }, [user, logout, navigate, toast]); // Depend on user to re-fetch if user logs in/out

  return (
    // REMOVED mx="auto" to make it left-aligned. Kept maxW for now.
    <Box maxW="6xl" /* Removed mx="auto" */ mt={8} px={4} pb={10}> 
      {/* Header: Only "Dashboard" heading now */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="lg">Dashboard</Heading>
        {/* "My Profile" and "LogoutButton" removed from here - they are in MainLayout */}
      </Box>

      {user && <Text fontSize="xl" mb={6}>Welcome back, {user.username || user.email}!</Text>}

      <Divider my={6} />

      <VStack align="stretch" spacing={8}> {/* Changed align to stretch for full width sections */}
        
        {/* Recent Designs Section */}
        <Box>
          <Heading size="md" mb={4}>Recent Designs</Heading>
          {loadingDesigns && (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" />
              <Text mt={2}>Loading your masterpieces...</Text>
            </Box>
          )}
          {!loadingDesigns && designsError && (
            <Alert status="error">
              <AlertIcon />
              {designsError}
            </Alert>
          )}
          {!loadingDesigns && !designsError && recentDesigns.length === 0 && (
            <Box textAlign="center" p={5} borderWidth="1px" borderRadius="md" shadow="sm">
              <Text fontSize="lg" color="gray.500">You haven't created any designs yet!</Text>
              <Button mt={4} colorScheme="purple" onClick={() => navigate('/generate')}>
                ✨ Let's Create Your First Design!
              </Button>
            </Box>
          )}
          {!loadingDesigns && !designsError && recentDesigns.length > 0 && (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {recentDesigns.map(design => (
                <Box 
                  key={design._id} 
                  as={RouterLink} 
                  to={`/my-designs`} // Or later to a specific design detail page: /my-designs/${design._id}
                  borderWidth="1px" 
                  borderRadius="lg" 
                  overflow="hidden" 
                  shadow="md"
                  _hover={{ shadow: "xl", transform: "translateY(-2px)", transitionDuration: "0.2s" }}
                >
                  <Image src={design.imageDataUrl} alt={design.prompt} fit="cover" w="100%" h="200px" bg="gray.200" />
                  <Box p={4}>
                    <Text fontSize="sm" color="gray.600" noOfLines={2} title={design.prompt}>
                      {design.prompt}
                    </Text>
                  </Box>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>

        {/* "AI Tools" section removed as per your request (Caption Generator was the only item) */}
        {/* If you want other tools here later, this is where they'd go */}

      </VStack>
    </Box>
  );
}
