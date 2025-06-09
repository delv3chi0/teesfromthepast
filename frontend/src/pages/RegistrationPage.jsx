// frontend/src/pages/RegistrationPage.jsx
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { 
    Box, Heading, Input, Button, Text, useToast, VStack, Image, 
    Link as ChakraLink, Flex 
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthProvider';
import Footer from '../components/Footer'; 

export default function RegistrationPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        toast({ 
            title: 'Validation Error',
            description: 'Password must be at least 6 characters long.',
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
        return;
    }
    try {
      await register({ username, firstName, lastName, email, password });
      toast({ 
        title: 'Registration Successful!', 
        description: 'You can now log in.',
        status: 'success', 
        duration: 3000, 
        isClosable: true 
      });
      navigate('/dashboard'); 
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      toast({ 
        title: 'Registration Failed',
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
            Create Your Account
          </Heading>
          {error && <Text color="red.500" mb={4} textAlign="center" fontWeight="medium">{error}</Text>}
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <Input 
                name="username"
                placeholder="Username" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                isRequired 
                bg="white"
                autoComplete="new-password" 
                borderColor="brand.secondary" // Added for consistency
                focusBorderColor="brand.primaryDark" // Added for consistency
                borderRadius="md" // Standard border radius for inputs
              />
              <Input 
                name="firstName"
                placeholder="First Name" 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)} 
                bg="white"
                borderColor="brand.secondary" // Added for consistency
                focusBorderColor="brand.primaryDark" // Added for consistency
                borderRadius="md" // Standard border radius for inputs
              />
              <Input 
                name="lastName"
                placeholder="Last Name" 
                value={lastName} 
                onChange={e => setLastName(e.target.value)} 
                bg="white"
                borderColor="brand.secondary" // Added for consistency
                focusBorderColor="brand.primaryDark" // Added for consistency
                borderRadius="md" // Standard border radius for inputs
              />
              <Input 
                name="email"
                type="email"
                placeholder="Email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                isRequired 
                bg="white"
                borderColor="brand.secondary" // Added for consistency
                focusBorderColor="brand.primaryDark" // Added for consistency
                borderRadius="md" // Standard border radius for inputs
              />
              <Input 
                name="password"
                type="password" 
                placeholder="Password (min. 6 characters)" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                isRequired 
                bg="white"
                autoComplete="new-password"
                borderColor="brand.secondary" // Added for consistency
                focusBorderColor="brand.primaryDark" // Added for consistency
                borderRadius="md" // Standard border radius for inputs
              />
              <Button 
                bg="brand.accentYellow"      // Primary Action Style
                color="brand.textDark"       // Primary Action Style
                _hover={{ bg: 'brand.accentYellowHover' }} // Assuming you have this in your theme
                width="full" 
                type="submit" 
                size="lg"
                borderRadius="full"         // Primary Action Style
                // No icon added for plain "Register" to keep it clean
              >
                Register
              </Button>
            </VStack>
          </form>
          <Text mt={6} textAlign="center" color="brand.textDark">
            Already have an account?{' '}
            <ChakraLink as={RouterLink} to="/login" color="brand.primaryDark" fontWeight="medium" _hover={{ textDecoration: "underline" }}>
              Log in
            </ChakraLink>
          </Text>
        </Box>
      </VStack>
      <Footer />
    </Flex>
  );
}
