// frontend/src/pages/RegistrationPage.jsx
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { 
    Box, Heading, Input, Button, Text, useToast, VStack, Image, 
    Link as ChakraLink, Flex 
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthProvider';

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
            title: 'Registration Failed',
            description: 'Password must be at least 6 characters long.',
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
        return;
    }

    try {
      await register({ username, firstName, lastName, email, password });
      toast({ title: 'Registration successful!', description: "You're now logged in.", status: 'success', duration: 3000, isClosable: true });
      navigate('/dashboard'); 
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      console.error('Registration error in RegistrationPage.jsx handleSubmit:', errorMessage, err);
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
    <Box>
      {/* Dark Brown Header Bar with Larger Logo */}
      <Flex
        as="header"
        align="center"
        justify="center" 
        bg="brand.primary" 
        py={4} // Increased vertical padding for a taller bar
        px={4}
        boxShadow="md" 
      >
        <RouterLink to="/"> 
          <Image 
            src="/logo.png" 
            alt="Tees From The Past Logo" 
            maxW="300px"  // << INCREASED maxW for potentially larger logo
            h="auto"      // << Let height adjust
            maxH="80px"   // << Set a generous max height, adjust as needed
            objectFit="contain"
          />
        </RouterLink>
      </Flex>

      {/* Registration Form Area */}
      <VStack spacing={6} py={10} px={4}>
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
                autoComplete="new-password" // More robust attempt to prevent email autofill
              />
              <Input 
                name="firstName" // Added name prop
                placeholder="First Name" 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)} 
                bg="white"
              />
              <Input 
                name="lastName" // Added name prop
                placeholder="Last Name" 
                value={lastName} 
                onChange={e => setLastName(e.target.value)} 
                bg="white"
              />
              <Input 
                name="email" // Added name prop
                type="email"
                placeholder="Email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                isRequired 
                bg="white"
              />
              <Input 
                name="password" // Added name prop
                type="password" 
                placeholder="Password (min. 6 characters)" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                isRequired 
                bg="white"
                autoComplete="new-password" // Also for password if issues
              />
              <Button colorScheme="brandAccentOrange" width="full" type="submit" size="lg">
                Register
              </Button>
            </VStack>
          </form>
          <Text mt={6} textAlign="center" color="brand.textDark">
            Already have an account?{' '}
            <ChakraLink as={RouterLink} to="/login" color="brand.primaryDark" fontWeight="medium">
              Log in
            </ChakraLink>
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
