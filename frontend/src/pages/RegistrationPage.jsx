// frontend/src/pages/RegistrationPage.jsx
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom'; // Changed Link to RouterLink for clarity
import { Box, Heading, Input, Button, Text, useToast, VStack, Image } from '@chakra-ui/react'; // Added VStack, Image
import { useAuth } from '../context/AuthProvider'; // We'll use the register function from here

export default function RegistrationPage() {
  const [username, setUsername] = useState(''); // <-- ADDED username state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState(''); // For displaying errors on the form
  const toast = useToast();
  const navigate = useNavigate();
  const { register } = useAuth(); // Destructure the register function from our AuthContext

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    console.log('[RegistrationPage.jsx] Attempting to register via AuthProvider...');

    // Basic password validation (example: at least 6 characters)
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
      // Call the register function from AuthProvider
      // This function handles the API call, localStorage, and setting global token/user state
      await register({ username, firstName, lastName, email, password });

      toast({ title: 'Registration successful!', description: "You're now logged in.", status: 'success', duration: 3000, isClosable: true });
      navigate('/dashboard'); // Navigate to dashboard (or /welcome if you prefer)

    } catch (err) {
      // Errors from client.post (like 400 for duplicate email/username, 500) will be caught here
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      console.error('Registration error in RegistrationPage.jsx handleSubmit:', errorMessage, err);
      setError(errorMessage); // Display specific error from backend
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
    // Wrap everything in a VStack for centering the logo and form box
    <VStack spacing={8} mt={10} mb={10} px={4}>
      <Image 
        src="/logo.png" 
        alt="Tees From The Past Logo" 
        maxW="250px" // Adjust for "reasonably large"
        mb={0} // Margin below logo
      />
      <Box maxW="md" borderWidth="1px" borderRadius="lg" p={6} shadow="md" w="100%"> {/* Added shadow, lg radius, padding */}
        <Heading mb={6} textAlign="center" size="lg" color="brand.textDark"> {/* Adjusted heading */}
          Create Your Account
        </Heading>
        {error && <Text color="red.500" mb={4} textAlign="center" fontWeight="medium">{error}</Text>}
        <form onSubmit={handleSubmit}>
          <VStack spacing={4}> {/* Use VStack for form elements spacing */}
            <Input 
              placeholder="Username" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              isRequired // Make username required
              bg="white" // Ensure inputs have a background if page bg is dark/colored
            />
            <Input 
              placeholder="First Name" 
              value={firstName} 
              onChange={e => setFirstName(e.target.value)} 
              // isRequired // Optional: make first/last name required
              bg="white"
            />
            <Input 
              placeholder="Last Name" 
              value={lastName} 
              onChange={e => setLastName(e.target.value)} 
              // isRequired
              bg="white"
            />
            <Input 
              type="email" // Specify type for better validation/keyboard on mobile
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
            <Button colorScheme="brandAccentOrange" width="full" type="submit" size="lg"> {/* Used brand color */}
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
  );
}
