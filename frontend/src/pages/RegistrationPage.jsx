// frontend/src/pages/RegistrationPage.jsx
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { 
    Box, Heading, Input, Button, Text, useToast, VStack, Image, 
    Link as ChakraLink, Flex // Added Flex
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
        toast({ /* ... password too short toast ... */ });
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
      toast({ /* ... registration failed toast ... */ });
    }
  };

  return (
    // Main container for the page, allows header bar + content structure
    <Box>
      {/* Dark Brown Header Bar with Logo */}
      <Flex
        as="header"
        align="center"
        justify="center" // Center logo if it's the only item
        bg="brand.primary" // Your dark brown
        py={3} // Vertical padding for the bar
        px={4}
        boxShadow="sm" // Optional: adds a subtle shadow below the bar
      >
        <RouterLink to="/"> {/* Make logo link to home (which is now login) */}
          <Image 
            src="/logo.png" // Your graphical logo
            alt="Tees From The Past Logo" 
            h="50px"      // Adjust height as desired for this bar
            objectFit="contain"
          />
        </RouterLink>
      </Flex>

      {/* Registration Form Area (Orange Background will come from global body style) */}
      <VStack spacing={6} py={10} px={4}> {/* Added more vertical padding */}
        <Box maxW="md" borderWidth="1px" borderRadius="lg" p={6} shadow="xl" w="100%" bg="brand.paper"> {/* Form on a 'paper' card */}
          <Heading mb={6} textAlign="center" size="lg" color="brand.textDark">
            Create Your Account
          </Heading>
          {error && <Text color="red.500" mb={4} textAlign="center" fontWeight="medium">{error}</Text>}
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <Input 
                name="username" // Good for accessibility and some autofill scenarios
                placeholder="Username" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                isRequired 
                bg="white"
                autoComplete="off" // Try to prevent browser pre-populating with email
              />
              <Input 
                placeholder="First Name" 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)} 
                bg="white"
              />
              <Input 
                placeholder="Last Name" 
                value={lastName} 
                onChange={e => setLastName(e.target.value)} 
                bg="white"
              />
              <Input 
                type="email"
                placeholder="Email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                isRequired 
                bg="white"
              />
              <Input 
                type="password" 
                placeholder="Password (min. 6 characters)" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                isRequired 
                bg="white"
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
