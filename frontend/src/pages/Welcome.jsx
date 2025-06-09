// frontend/src/pages/Welcome.jsx
import { Box, Heading, Button, VStack, Text, Divider } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import LogoutButton from '../components/LogoutButton';

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Box textAlign="center" py={10} px={6} mt={8}>
      <Heading as="h1" size="xl" fontWeight="bold" mb={2}>
        Welcome to Tees From The Past!
      </Heading>
      {user && <Text fontSize="lg" color={'gray.600'} mb={6}>Hello, {user.username || user.email}!</Text>}
      
      <VStack spacing={5} align="stretch" maxW="md" mx="auto">
        <Button
          colorScheme="purple"
          variant="solid"
          size="lg"
          onClick={() => navigate('/generate')}
        >
          ✨ Create Your Own Retro Design!
        </Button>
        <Button // <-- ADD THIS BUTTON
          colorScheme="orange" 
          variant="solid"
          size="lg"
          onClick={() => navigate('/my-designs')}
        >
          🖼️ View My Saved Designs
        </Button>
        <Button
          colorScheme="teal"
          variant="outline"
          size="lg"
          onClick={() => navigate('/dashboard')}
        >
          🎛️ Go to Dashboard
        </Button>
        <Button
          colorScheme="gray"
          variant="outline"
          size="lg"
          onClick={() => navigate('/profile')}
        >
          👤 View My Profile
        </Button>
      </VStack>

      <Divider my={8} />
      <LogoutButton />
    </Box>
  );
}
