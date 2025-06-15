import { useState } from 'react';
import {
  Box, // Ensure Box is imported
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack, // VStack is still used for internal spacing
  Heading,
  Text,
  useToast,
  Container,
  InputGroup,
  InputRightElement,
  IconButton,
  Image,
  Link as ChakraLink,
  Center,
  Flex // Ensure Flex is imported
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthProvider';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import Footer from '../components/Footer.jsx'; // Assuming Footer path is correct

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast({
        title: 'Login Successful',
        description: "Welcome back!",
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate(from, { replace: true });
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: error.response?.data?.message || 'Invalid email or password.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex direction="column" minH="100vh" bg="brand.primary">
      <Container maxW="container.sm" centerContent flex="1" display="flex" flexDirection="column" justifyContent="center" py={{ base: 8, md: 12 }}>
        <VStack spacing={6} w="100%">
          <RouterLink to="/">
            <Image src="/logo.png" alt="Tees From The Past Logo" maxH="100px" mb={4} objectFit="contain" />
          </RouterLink>

          {/* This Box now explicitly uses the 'cardBlue' layer style from theme.js */}
          <Box
            as="form" // Keep as="form" to maintain form semantics
            onSubmit={handleSubmit}
            p={{ base: 6, md: 10 }}
            layerStyle="cardBlue" // <--- CRITICAL CHANGE: Apply the global card style
            w="100%" // Ensure it takes full width
          >
            {/* Inner VStack to maintain spacing between form elements, now inside the Box */}
            <VStack spacing={6} w="100%">
              {/* Removed explicit 'color' prop. Will now inherit from 'layerStyle="cardBlue"'. */}
              <Heading as="h1" size="lg" textAlign="center" fontFamily="heading">
                Welcome Back
              </Heading>

              <FormControl isRequired>
                <FormLabel>Email Address</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  size="lg"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <InputGroup size="lg">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                  <InputRightElement>
                    <IconButton
                      variant="ghost"
                      icon={showPassword ? <FaEyeSlash /> : <FaEye />}
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    />
                  </InputRightElement>
                </InputGroup>
                {/* Text for Forgot Password link - its color is correctly set to brand.accentYellow, which is good contrast */}
                <Text textAlign="right" mt={2}>
                    <ChakraLink as={RouterLink} to="/forgot-password" fontSize="sm" color="brand.accentYellow" _hover={{ textDecoration: 'underline' }}>
                        Forgot Password?
                    </ChakraLink>
                </Text>
              </FormControl>

              <Button
                type="submit"
                isLoading={loading}
                loadingText="Logging In..."
                colorScheme="brandAccentOrange"
                width="full"
                size="lg"
                fontSize="md"
              >
                Log In
              </Button>

              {/* Removed explicit 'color' prop. Will now inherit from 'layerStyle="cardBlue"'. */}
              <Text pt={2} textAlign="center">
                Don't have an account?{' '}
                <ChakraLink as={RouterLink} to="/register" color="brand.accentYellow" fontWeight="bold" _hover={{ textDecoration: "underline" }}>
                  Sign up now
                </ChakraLink>
              </Text>
            </VStack>
          </Box> {/* End Box */}
        </VStack>
      </Container>
      <Footer /> {/* Assuming Footer is a separate component */}
    </Flex>
  );
};

export default LoginPage;
