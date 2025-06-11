// frontend/src/pages/RegistrationPage.jsx

import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Heading, Input, Button, Text, useToast, VStack, Image,
  Link as ChakraLink, Center, InputGroup, InputRightElement, IconButton,
  Alert, AlertIcon
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthProvider';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

/**
 * Registration Page
 * REFRACTORED:
 * - Layout simplified and centered using <Center> for a more focused auth page experience.
 * - Page background and content card updated to match the site's dark theme.
 * - All text, link, and form element styles updated for dark mode visibility and consistency.
 * - Added show/hide password functionality for better UX.
 */
export default function RegistrationPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await register({ username, firstName, lastName, email, password });
      toast({
        title: 'Registration Successful!',
        description: 'Welcome! You can now log in.',
        status: 'success',
        duration: 4000,
        isClosable: true
      });
      // Navigate to the shop page or a welcome page instead of the dashboard which might not exist
      navigate('/shop');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Center minH="100vh" bg="brand.primary" p={{ base: 4, md: 8 }}>
      <VStack spacing={6} w="100%" maxW="md">
        <RouterLink to="/">
          <Image src="/logo.png" alt="Tees From The Past Logo" maxH="120px" />
        </RouterLink>

        <Box
          p={{ base: 6, md: 10 }}
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          borderRadius="xl"
          boxShadow="lg"
          bg="brand.primaryLight"
          w="100%"
        >
          <VStack spacing={6}>
            <Heading as="h1" size="xl" textAlign="center" color="brand.textLight">
              Create Your Account
            </Heading>

            {error && (
              <Alert status="error" borderRadius="md" bg="red.900">
                <AlertIcon color="red.300" />
                <Text color="whiteAlpha.900">{error}</Text>
              </Alert>
            )}

            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <VStack spacing={5}>
                <Input
                  name="username"
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  isRequired
                  size="lg"
                  bg="brand.primaryDark"
                  borderColor="whiteAlpha.300"
                  _hover={{ borderColor: "whiteAlpha.400" }}
                  focusBorderColor="brand.accentYellow"
                />
                <Input
                  name="firstName"
                  placeholder="First Name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  size="lg"
                  bg="brand.primaryDark"
                  borderColor="whiteAlpha.300"
                  _hover={{ borderColor: "whiteAlpha.400" }}
                  focusBorderColor="brand.accentYellow"
                />
                <Input
                  name="lastName"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  size="lg"
                  bg="brand.primaryDark"
                  borderColor="whiteAlpha.300"
                  _hover={{ borderColor: "whiteAlpha.400" }}
                  focusBorderColor="brand.accentYellow"
                />
                <Input
                  name="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  isRequired
                  size="lg"
                  bg="brand.primaryDark"
                  borderColor="whiteAlpha.300"
                  _hover={{ borderColor: "whiteAlpha.400" }}
                  focusBorderColor="brand.accentYellow"
                />
                <InputGroup size="lg">
                  <Input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password (min. 6 characters)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    isRequired
                    bg="brand.primaryDark"
                    borderColor="whiteAlpha.300"
                    _hover={{ borderColor: "whiteAlpha.400" }}
                    focusBorderColor="brand.accentYellow"
                  />
                  <InputRightElement>
                    <IconButton
                        variant="ghost"
                        color="whiteAlpha.600"
                        _hover={{ color: "whiteAlpha.900", bg:"whiteAlpha.200" }}
                        icon={showPassword ? <FaEyeSlash /> : <FaEye />}
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    />
                  </InputRightElement>
                </InputGroup>

                <Button
                  isLoading={isLoading}
                  loadingText="Creating Account..."
                  width="full"
                  type="submit"
                  size="lg"
                  mt={4}
                  bg="brand.accentOrange"
                  color="white"
                  _hover={{ bg: 'brand.accentOrangeHover' }}
                >
                  Register
                </Button>
              </VStack>
            </form>

            <Text pt={4} textAlign="center" color="whiteAlpha.800">
              Already have an account?{' '}
              <ChakraLink as={RouterLink} to="/login" color="brand.accentYellow" fontWeight="bold" _hover={{ textDecoration: "underline" }}>
                Log In
              </ChakraLink>
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Center>
  );
}
