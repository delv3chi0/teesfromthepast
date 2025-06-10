// frontend/src/Login.jsx
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    Box, Heading, Input, Button, Text, useToast, VStack, Image,
    Link as ChakraLink, Flex, InputGroup, InputRightElement, IconButton as ChakraIconButton
} from '@chakra-ui/react'; // Added InputGroup, InputRightElement, IconButton
import { useAuth } from './context/AuthProvider';
import Footer from './components/Footer';
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // For password visibility toggle

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State for password visibility
  const [error, setError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // setIsLoading(true); // You might want to add an isLoading state for the button
    try {
      await login({ email, password });
      toast({ title: 'Login successful!', status: 'success', duration: 3000, isClosable: true });
      navigate('/shop');
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
    } finally {
      // setIsLoading(false);
    }
  };

  const handlePasswordVisibility = () => setShowPassword(!showPassword);

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
                borderColor="brand.secondary"
                focusBorderColor="brand.primaryDark"
                borderRadius="md"
                size="lg" // Consistent sizing
              />
              <InputGroup size="lg"> {/* Consistent sizing */}
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  isRequired
                  bg="white"
                  borderColor="brand.secondary"
                  focusBorderColor="brand.primaryDark"
                  borderRadius="md"
                />
                <InputRightElement>
                  <ChakraIconButton
                    variant="ghost"
                    icon={showPassword ? <FaEyeSlash /> : <FaEye />}
                    onClick={handlePasswordVisibility}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    color="brand.secondary"
                    _hover={{ color: "brand.primaryDark"}}
                  />
                </InputRightElement>
              </InputGroup>

              {/* --- FORGOT PASSWORD LINK ADDED HERE --- */}
              <Box w="full" textAlign="right" mt={-2} mb={2}> {/* Adjust margins as needed */}
                <ChakraLink
                  as={RouterLink}
                  to="/forgot-password" // Route to your Forgot Password page
                  fontSize="sm"
                  color="brand.primaryDark" // Use a theme color
                  _hover={{ textDecoration: 'underline', color: 'brand.primary' }} // Adjust hover color
                >
                  Forgot Password?
                </ChakraLink>
              </Box>
              {/* ------------------------------------ */}

              <Button
                bg="brand.accentYellow"
                color="brand.textDark"
                _hover={{ bg: 'brand.accentYellowHover' }}
                width="full"
                type="submit"
                size="lg"
                borderRadius="full"
                // isLoading={isLoading} // Uncomment if you add isLoading state
                // loadingText="Logging In..."
              >
                Log In
              </Button>
            </VStack>
          </form>
          <Text mt={6} textAlign="center" color="brand.textDark">
            Don’t have an account?{' '}
            <ChakraLink as={RouterLink} to="/register" color="brand.primaryDark" fontWeight="medium" _hover={{ textDecoration: "underline" }}>
              Sign up here
            </ChakraLink>
          </Text>
        </Box>
      </VStack>
      <Footer />
    </Flex>
  );
}
