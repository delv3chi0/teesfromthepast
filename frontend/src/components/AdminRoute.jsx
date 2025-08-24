// frontend/src/components/AdminRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { Spinner, VStack, Text, Box, Heading, Alert, AlertIcon, Button } from '@chakra-ui/react';
import { FaLock } from 'react-icons/fa';

const AdminRoute = ({ children }) => {
  const { user, token, loadingAuth } = useAuth();
  const location = useLocation();

  console.log(`[AdminRoute Render] Path: ${location.pathname}, loadingAuth: ${loadingAuth}, Token: ${token ? 'Exists' : 'No Token'}, User: ${user ? user.username : 'No User'}, IsAdmin: ${user?.isAdmin}, Verified: ${!!user?.emailVerifiedAt}`);

  // Still booting auth
  if (loadingAuth) {
    console.log('[AdminRoute Decision] Auth is loading. Rendering Spinner.');
    return (
      <VStack justifyContent="center" alignItems="center" minH="80vh">
        <Spinner size="xl" thickness="4px" color="brand.primary" />
        <Text mt={3} color="brand.textLight">Verifying access…</Text>
      </VStack>
    );
  }

  // Not logged in → go to login (preserve origin)
  if (!token) {
    console.log('[AdminRoute Decision] No token. Redirecting to /login.');
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    // (You previously used state; either works. Using query keeps it consistent with PrivateRoute.)
    // return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but somehow no user loaded → force login
  if (!user) {
    console.log('[AdminRoute Decision] Token exists, but no user object. Redirecting to /login for safety.');
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Logged in but NOT verified → send to check-email (prefill email)
  if (!user.emailVerifiedAt) {
    console.log('[AdminRoute Decision] User not verified. Redirecting to /check-email.');
    const qp = new URLSearchParams();
    if (user.email) qp.set('email', user.email);
    qp.set('unverified', '1');
    return <Navigate to={`/check-email?${qp.toString()}`} replace />;
  }

  // Logged in, verified, but not an admin → show Access Denied UI
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
          bg="brand.paper"
          shadow="xl"
        >
          <AlertIcon as={FaLock} boxSize="50px" mr={0} color="red.500" />
          <Heading as="h2" size="lg" mt={6} mb={2} color="brand.textDark">
            Access Denied
          </Heading>
          <Text color="gray.600" mb={6}>
            You don’t have permission to view this page. Admins only.
          </Text>
          <Button
            as="a"
            href="/"
            bg="brand.primary"
            color="white"
            _hover={{ bg: 'brand.primaryDark' }}
            borderRadius="full"
            px={8}
          >
            Go Home
          </Button>
        </Alert>
      </Box>
    );
  }

  console.log('[AdminRoute Decision] User is an admin and verified. Rendering children.');
  return children;
};

export default AdminRoute;
