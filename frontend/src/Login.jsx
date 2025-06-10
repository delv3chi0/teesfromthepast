// frontend/src/Login.jsx
import { useState } from 'react';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, Heading, Input, Button, Text, useToast, VStack, Image, Link as ChakraLink, Flex, InputGroup, InputRightElement, IconButton as ChakraIconButton } from '@chakra-ui/react';
import { useAuth } from './context/AuthProvider';
import Footer from './components/Footer';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Redirect to this path after login, defaults to /shop
  const from = location.state?.from?.pathname || '/shop';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login({ email, password });
      toast({ title: 'Login successful!', status: 'success', duration: 3000, isClosable: true });
      // Navigate to the 'from' location
      navigate(from, { replace: true });
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please check credentials.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <Flex direction="column" minH="100vh" bg="brand.paper">
      <Flex as="header" align="center" justify="center" bg="brand.primary" py={4} px={4} boxShadow="md" flexShrink={0}>
        <RouterLink to="/">
          <Image src="/logo.png" alt="Tees From The Past Logo" maxW="300px" h="auto" maxH="80px" objectFit="contain" />
        </RouterLink>
      </Flex>
      <VStack spacing={6} py={10} px={4} flexGrow={1} justifyContent="center">
        <Box maxW="md" borderWidth="1px" borderRadius="lg" p={6} shadow="xl" w="100%" bg="white">
          <Heading mb={6} textAlign="center" size="lg" color="brand.textDark">Login</Heading>
          {error && <Text color="red.500" mb={4} textAlign="center" fontWeight="medium">{error}</Text>}
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} isRequired bg="white" borderColor="gray.300" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" />
              <InputGroup size="lg">
                <Input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} isRequired bg="white" borderColor="gray.300" focusBorderColor="brand.primaryDark" borderRadius="md" />
                <InputRightElement>
                  <ChakraIconButton variant="ghost" icon={showPassword ? <FaEyeSlash /> : <FaEye />} onClick={handlePasswordVisibility} aria-label="Toggle password visibility" />
                </InputRightElement>
              </InputGroup>
              <Box w="full" textAlign="right" mt={-2} mb={2}>
                <ChakraLink as={RouterLink} to="/forgot-password" fontSize="sm" color="brand.primaryDark" _hover={{ textDecoration: 'underline' }}>Forgot Password?</ChakraLink>
              </Box>
              <Button bg="brand.accentYellow" color="brand.textDark" _hover={{ bg: 'brand.accentYellowHover' }} width="full" type="submit" size="lg" borderRadius="full" isLoading={isLoading} loadingText="Logging In...">Log In</Button>
            </VStack>
          </form>
          <Text mt={6} textAlign="center" color="brand.textDark">
            Don’t have an account?{' '}
            <ChakraLink as={RouterLink} to="/register" color="brand.primaryDark" fontWeight="medium" _hover={{ textDecoration: "underline" }}>Sign up here</ChakraLink>
          </Text>
        </Box>
      </VStack>
      <Footer />
    </Flex>
  );
}
