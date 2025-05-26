// frontend/src/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Heading, Input, Button, Text, useToast } from '@chakra-ui/react';
import { useAuth } from './context/AuthProvider';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    console.log('[Login.jsx] Attempting to login via AuthProvider...');

    try {
      await login({ email, password });

      toast({ title: 'Login successful!', status: 'success', duration: 3000, isClosable: true });
      navigate('/dashboard'); 

    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please check credentials or server status.';
      console.error('Login error in Login.jsx handleSubmit:', errorMessage, err);
      setError(errorMessage);
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
