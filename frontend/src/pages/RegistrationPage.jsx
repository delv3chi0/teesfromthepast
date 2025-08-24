// frontend/src/pages/RegistrationPage.jsx
import { useState } from 'react';
import {
  Box, Button, FormControl, FormLabel, Input, VStack, Heading, Text, useToast,
  Container, InputGroup, InputRightElement, IconButton, Image, Link as ChakraLink, Flex
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthProvider';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import { client } from '../api/client';

const RegistrationPage = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setSession } = useAuth(); // optional auto-login if backend returns token
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Passwords do not match', status: 'error', duration: 5000, isClosable: true });
      return;
    }
    setLoading(true);
    try {
      const res = await client.post("/auth/register", {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      // Optional: don’t auto-login until verified. If you do want auto-login, uncomment:
      // const token = res.data?.token;
      // if (token) await setSession(token);

      // Kick verification email (idempotent; backend also queued one)
      try { await client.post('/auth/send-verification', { email: formData.email }); } catch {}

      toast({ title: 'Registration Successful', description: 'Check your email to verify your account.', status: 'success', duration: 3000, isClosable: true });
      navigate('/check-email');
    } catch (error) {
      toast({ title: 'Registration Failed', description: error.response?.data?.message || 'An unexpected error occurred.', status: 'error', duration: 5000, isClosable: true });
    } finally { setLoading(false); }
  };

  return (
    <Flex direction="column" minH="100vh" bg="brand.primary">
      <Container maxW="container.sm" centerContent flex="1" display="flex" flexDirection="column" justifyContent="center" py={{ base: 8, md: 12 }}>
        <VStack spacing={6} w="100%">
          <RouterLink to="/"><Image src="/logo.png" alt="Tees From The Past Logo" maxH="100px" mb={4} objectFit="contain" /></RouterLink>
          <VStack as="form" onSubmit={handleSubmit} spacing={6} layerStyle="cardBlue" w="100%" p={{ base: 6, md: 10 }}>
            <Heading as="h1" size="lg" textAlign="center" color="brand.textLight">Create Your Account</Heading>

            <FormControl isRequired><FormLabel>Username</FormLabel><Input name="username" onChange={handleChange} placeholder="Choose a unique username" size="lg"/></FormControl>
            <FormControl isRequired><FormLabel>Email Address</FormLabel><Input type="email" name="email" onChange={handleChange} placeholder="you@example.com" size="lg"/></FormControl>

            <FormControl isRequired>
              <FormLabel>Password</FormLabel>
              <InputGroup size="lg">
                <Input type={showPassword ? 'text' : 'password'} name="password" onChange={handleChange} placeholder="Create a password (min. 6 characters)" />
                <InputRightElement>
                  <IconButton variant="ghost" icon={showPassword ? <FaEyeSlash /> : <FaEye />} onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Confirm Password</FormLabel>
              <InputGroup size="lg">
                <Input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" onChange={handleChange} placeholder="Confirm your password" />
                <InputRightElement>
                  <IconButton variant="ghost" icon={showConfirmPassword ? <FaEyeSlash /> : <FaEye />} onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <Button type="submit" isLoading={loading} loadingText="Creating Account..." bg="brand.accentOrange" color="white" _hover={{ bg: 'brand.accentOrangeHover' }} width="full" size="lg">
              Sign Up
            </Button>

            <Text pt={2} textAlign="center" color="brand.textMuted">
              Already have an account?{' '}
              <ChakraLink as={RouterLink} to="/login" color="brand.accentYellow" fontWeight="bold" _hover={{ textDecoration: "underline" }}>Log in</ChakraLink>
            </Text>
          </VStack>
        </VStack>
      </Container>
      <Footer />
    </Flex>
  );
};

export default RegistrationPage;
