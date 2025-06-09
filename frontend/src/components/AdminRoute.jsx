// frontend/src/components/AdminRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom'; // Removed Outlet if not used for other purposes
import { useAuth } from '../context/AuthProvider';
import { Spinner, VStack, Text, Box, Heading, Alert, AlertIcon, Button } from '@chakra-ui/react';
import { FaLock } from 'react-icons/fa';

// AdminRoute now accepts 'children' as a prop
const AdminRoute = ({ children }) => {
  const { user, token, loadingAuth } = useAuth();
  const location = useLocation();

  console.log(`[AdminRoute Render] Path: ${location.pathname}, loadingAuth: ${loadingAuth}, Token: ${token ? 'Exists' : 'No Token'}, User: ${user ? user.username : 'No User'}, IsAdmin: ${user?.isAdmin}`);

  if (loadingAuth) {
    console.log('[AdminRoute Decision] Auth is loading. Rendering Spinner.');
    return (
      <VStack justifyContent="center" alignItems="center" minH="80vh">
        <Spinner size="xl" thickness="4px" color="brand.primary" />
        <Text mt={3} color="brand.textLight">Verifying access...</Text>
      </VStack>
    );
  }

  if (!token) {
    console.log('[AdminRoute Decision] No token. Redirecting to /login.');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user) {
    console.log('[AdminRoute Decision] Token exists, but no user object. Redirecting to /login for safety.');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user.isAdmin) {
    console.log('[AdminRoute Decision] User is not an admin. Rendering Access Denied message.');
    return (
        <Box textAlign="center" py={10} px={6} minH="70vh" display="flex" flexDirection="column" justifyContent="center" alignItems="center">
            <Alert
                status="error"
                variant="subtle"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                textAlign="center"
                borderRadius="lg"
                p={8}
                maxW="md"
                bg="brand.paper" // Assuming brand.paper is defined in your theme
                shadow="xl"
            >
                <AlertIcon as={FaLock} boxSize="50px" mr={0} color="red.500" />
                <Heading as="h2" size="lg" mt={6} mb={2} color="brand.textDark">
                    Access Denied
                </Heading>
                <Text color="gray.600" mb={6}>
                    You do not have the necessary permissions to view this page. This area is restricted to administrators.
                </Text>
                <Button
                    as="a"
                    href="/dashboard"
                    bg="brand.primary"
                    color="white"
                    _hover={{ bg: 'brand.primaryDark' }}
                    borderRadius="full"
                    px={8}
                >
                    Go to Dashboard
                </Button>
            </Alert>
        </Box>
    );
  }

  console.log('[AdminRoute Decision] User is an admin. Rendering children.');
  // If user is admin, render the children components passed to AdminRoute
  return children;
};

export default AdminRoute;
