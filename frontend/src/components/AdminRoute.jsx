// frontend/src/components/AdminRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { Spinner, VStack, Text, Box, Heading, Alert, AlertIcon, Button } from '@chakra-ui/react';
import { FaLock } from 'react-icons/fa';

const AdminRoute = ({ children }) => {
  const { user, token, loadingAuth } = useAuth();
  const location = useLocation();

  console.log(`[AdminRoute Render] Path: ${location.pathname}, loadingAuth: ${loadingAuth}, token: ${!!token}, user: ${user?.username || 'n/a'}, admin: ${!!user?.isAdmin}, verified: ${!!user?.emailVerifiedAt}`);

  // App still booting
  if (loadingAuth) {
    return (
      <VStack justifyContent="center" alignItems="center" minH="80vh">
        <Spinner size="xl" thickness="4px" color="brand.primary" />
        <Text mt={3} color="brand.textLight">Verifying access…</Text>
      </VStack>
    );
  }

  // Not logged in → login
  if (!token) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // ⚠️ Logged in but user not hydrated yet → wait
  if (token && !user) {
    return (
      <VStack justifyContent="center" alignItems="center" minH="80vh">
        <Spinner size="lg" thickness="4px" color="brand.primary" />
        <Text mt={3} color="brand.textLight">Loading your profile…</Text>
      </VStack>
    );
  }

  // Require verified first
  if (!user.emailVerifiedAt) {
    const qp = new URLSearchParams();
    if (user.email) qp.set('email', user.email);
    qp.set('unverified', '1');
    return <Navigate to={`/check-email?${qp.toString()}`} replace />;
  }

  // Require admin
  if (!user.isAdmin) {
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

  return children;
};

export default AdminRoute;
