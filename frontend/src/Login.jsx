// frontend/src/Login.jsx
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { 
    Box, Heading, Input, Button, Text, useToast, VStack, Image, 
    Link as ChakraLink, Flex 
} from '@chakra-ui/react';
import { useAuth } from './context/AuthProvider'; 
// CORRECTED IMPORT PATH FOR Footer:
import Footer from './components/Footer'; 

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
    try {
      await login({ email, password });
      toast({ title: 'Login successful!', status: 'success', duration: 3000, isClosable: true });
      navigate('/dashboard'); 
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please check credentials or server status.';
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
    <Flex direction="column" minH="100vh" bg="brand.accentOrange">
      <Flex
        as="header"
        align="center"
        justify="center" 
        bg="brand.primary" 
        py={4} 
        px={4}
        boxShadow="md" 
        flexShrink={0}
      >
        <RouterLink to="/"> 
          <Image 
            src="/logo.png" 
            alt="Tees From The Past Logo" 
            maxW="300px"  
            h="auto"      
            maxH="80px"   
            objectFit="contain"
          />
        </RouterLink>
      </Flex>

      <VStack spacing={6} py={10} px={4} flexGrow={1} justifyContent="center"> 
        <Box maxW="md" borderWidth="1px" borderRadius="lg" p={6} shadow="xl" w="100%" bg="brand.paper">
          <Heading mb={6} textAlign="center" size="lg" color="brand.textDark">
            Login
          </Heading>
          {error && <Text color="red.500" mb={4} textAlign="center" fontWeight="medium">{error}</Text>}
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <Input 
                type="email"
                placeholder="Email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                isRequired 
                bg="white"
              />
              <Input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                isRequired 
                bg="white"
              />
              <Button colorScheme="brandAccentOrange" width="full" type="submit" size="lg">
                Log In
              </Button>
            </VStack>
          </form>
          <Text mt={6} textAlign="center" color="brand.textDark">
            Don’t have an account?{' '}
            <ChakraLink as={RouterLink} to="/register" color="brand.primaryDark" fontWeight="medium">
              Sign up here
            </ChakraLink>
          </Text>
        </Box>
      </VStack>
      <Footer />
    </Flex>
  );
}
