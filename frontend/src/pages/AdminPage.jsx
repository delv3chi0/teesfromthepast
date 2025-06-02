// frontend/src/pages/AdminPage.jsx (Ultra-Simplified for Debugging)
import React from 'react';
import { Box, Heading, Text, Alert, AlertIcon } from '@chakra-ui/react';

const AdminPage = () => {
  console.log("[AdminPage] Rendering ULTRA-SIMPLIFIED Admin Page...");

  // This component is now extremely basic to isolate rendering issues.
  // It has a bright border and background.

  return (
    <Box
      p={8} // Add some padding so content isn't at the very edge
      border="10px solid limegreen" // VERY obvious border
      bg="pink" // VERY obvious background for this specific box
      minHeight="400px" // Force it to have some height
      width="100%" // Ensure it tries to take full width of its parent (the orange box)
    >
      <Heading size="xl" color="black" mb={6} style={{ backgroundColor: 'yellow' }}>
        ADMIN PAGE TEST (ULTRA SIMPLE)
      </Heading>
      <Text color="black" fontSize="2xl" mb={4}>
        If you see this text inside a LIME GREEN BORDERED box with a PINK background,
        then this AdminPage component IS rendering inside the MainLayout's orange content area.
      </Text>
      <Alert status="success" variant="solid">
        <AlertIcon />
        Ultra-simplified AdminPage is active and visible!
      </Alert>
      <Text color="black" mt={4}>
        The orange background you see should be *behind* this pink box.
      </Text>
    </Box>
  );
};

export default AdminPage;
