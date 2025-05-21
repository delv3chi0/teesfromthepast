import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Heading, Input, Button, Text, useToast } from '@chakra-ui/react';
import { useAuth } from './context/AuthProvider';
import { jwtDecode } from 'jwt-decode';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();
  const { setUser } = useAuth();

const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  try {
    const backendUrl = import.meta.env.VITE_API_URL;
    const response = await fetch(`${backendUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok && data.token) {
      localStorage.setItem('token', data.token);
      console.log('Your JWT token:', data.token);
      setUser(jwtDecode(data.token));
      toast({ title: 'Login successful', status: 'success', isClosable: true });
      navigate('/dashboard');
    } else {
      setError(data.error || 'Login failed');
      toast({ title: 'Login failed', description: data.error, status: 'error', isClosable: true });
    }
  } catch (err) {
    console.error('Login error:', err);
    toast({ title: 'Server error', description: 'Could not reach backend', status: 'error', isClosable: true });
  }
};

  return (
    <Box maxW="md" borderWidth="1px" borderRadius="md" p={4} mx="auto" mt={8}>
      <Heading mb={4} textAlign="center">Login</Heading>
      {error && <Text color="red.500" mb={2}>{error}</Text>}
      <form onSubmit={handleSubmit}>
        <Input placeholder="Email" mb={2} value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input type="password" placeholder="Password" mb={4} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button colorScheme="blue" width="full" type="submit">Log In</Button>
      </form>
      <Text mt={4} textAlign="center">
        Don’t have an account? <Link to="/register" style={{ color: '#3182ce' }}>Sign up here</Link>
      </Text>
    </Box>
  );
}
