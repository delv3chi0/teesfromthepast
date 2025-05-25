// frontend/src/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Heading, Input, Button, Text, useToast } from '@chakra-ui/react';
import { useAuth } from './context/AuthProvider'; // We'll use the login function from here

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // For displaying errors on the login form
  const toast = useToast();
  const navigate = useNavigate();
  const { login } = useAuth(); // Destructure the login function from our AuthContext

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    console.log('[Login.jsx] Attempting to login via AuthProvider...');

    try {
      // Call the login function from AuthProvider
      // This function now handles the API call, localStorage, and setting the global token state.
      // AuthProvider's useEffect will then handle decoding the token and setting the user state.
      await login({ email, password }); // We just need to call it

      // If login() above does not throw an error, it means the API call was successful
      // and the token was set in AuthProvider.
      toast({ title: 'Login successful!', status: 'success', duration: 3000, isClosable: true });
      navigate('/dashboard'); // Navigate to dashboard (or /welcome later)

    } catch (err) {
      // Errors from client.post (like 400 for bad creds, 401, 500) will be caught here
      const errorMessage = err.response?.data?.message || 'Login failed. Please check credentials or server status.';
      console.error('Login error in Login.jsx handleSubmit:', errorMessage, err);
      setError(errorMessage); // Display error on the form
      toast({
        title: 'Login Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box maxW="md" borderWidth="1px" borderRadius="md" p={4} mx="auto" mt={8}>
      <Heading mb={4} textAlign="center">Login</Heading>
      {error && <Text color="red.500" mb={2} textAlign="center">{error}</Text>}
      <form onSubmit={handleSubmit}>
        <Input 
          placeholder="Email" 
          mb={2} 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <Input 
          type="password" 
          placeholder="Password" 
          mb={4} 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        <Button colorScheme="blue" width="full" type="submit">
          Log In
        </Button>
      </form>
      <Text mt={4} textAlign="center">
        Don’t have an account? <Link to="/register" style={{ color: '#3182ce' }}>Sign up here</Link>
      </Text>
    </Box>
  );
}
