import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
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
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthProvider';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import Footer from '../components/Footer.jsx'; // MODIFIED: Using your existing Footer component

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
    <Box>
        <Center minH="100vh" bg="brand.primary" p={{ base: 4, md: 8 }}>
            <VStack spacing={6} w="100%" maxW="md">
                <RouterLink to="/">
                    <Image src="/logo.png" alt="Tees From The Past Logo" maxH="120px" />
                </RouterLink>
                <Box
                    p={{base: 6, md: 10}}
                    borderWidth="1px"
                    borderColor="whiteAlpha.200"
                    borderRadius="xl"
                    boxShadow="lg"
                    bg="brand.primaryLight"
                    w="100%"
                >
                    <VStack as="form" onSubmit={handleSubmit} spacing={6}>
                        <Heading as="h1" size="xl" textAlign="center" color="brand.textLight">
                            Welcome Back
                        </Heading>
                        <FormControl isRequired>
                            <FormLabel color="whiteAlpha.800">Email Address</FormLabel>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                size="lg"
                                bg="brand.primaryDark"
                                borderColor="whiteAlpha.300"
                                _hover={{ borderColor: "whiteAlpha.400" }}
                                focusBorderColor="brand.accentYellow"
                            />
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel color="whiteAlpha.800">Password</FormLabel>
                            <InputGroup size="lg">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    bg="brand.primaryDark"
                                    borderColor="whiteAlpha.300"
                                    _hover={{ borderColor: "whiteAlpha.400" }}
                                    focusBorderColor="brand.accentYellow"
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

                        <Text pt={4} textAlign="center" color="whiteAlpha.800">
                            Don't have an account?{' '}
                            <ChakraLink as={RouterLink} to="/register" color="brand.accentYellow" fontWeight="bold" _hover={{ textDecoration: "underline" }}>
                                Sign up now
                            </ChakraLink>
                        </Text>
                    </VStack>
                </Box>
            </VStack>
        </Center>
        <Footer />
    </Box>
  );
};

export default LoginPage;
