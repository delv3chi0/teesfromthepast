import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Heading, Input, Button, Text, useToast } from '@chakra-ui/react';
import { useAuth } from '../context/AuthProvider';
import { jwtDecode } from 'jwt-decode';

export default function RegistrationPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const toast = useToast();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const backendUrl = import.meta.env.DEV
        ? 'http://localhost:5000'
        : 'https://teesfromthepast.onrender.com';
      const res = await fetch(`${backendUrl}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        setUser(jwtDecode(data.token));
        toast({ title: 'Registration successful', status: 'success', isClosable: true });
        navigate('/dashboard');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Server error');
      console.error(err);
    }
  };

  return (
    <Box maxW="md" borderWidth="1px" borderRadius="md" p={4} mx="auto" mt={8}>
      <Heading mb={4} textAlign="center">Sign Up</Heading>
      {error && <Text color="red.500" mb={2}>{error}</Text>}
      <form onSubmit={handleSubmit}>
        <Input placeholder="First Name" mb={2} value={firstName} onChange={e => setFirstName(e.target.value)} required />
        <Input placeholder="Last Name" mb={2} value={lastName} onChange={e => setLastName(e.target.value)} required />
        <Input placeholder="Email" mb={2} value={email} onChange={e => setEmail(e.target.value)} required />
        <Input type="password" placeholder="Password" mb={4} value={password} onChange={e => setPassword(e.target.value)} required />
        <Button colorScheme="blue" width="full" type="submit">Register</Button>
      </form>
      <Text mt={2} textAlign="center">
        Already have an account? <Link to="/login" style={{ color: '#3182ce' }}>Log in</Link>
      </Text>
    </Box>
  );
}
