// frontend/src/pages/RegistrationPage.jsx
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
  Flex
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthProvider';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import { client, setSessionHeader } from '../api/client';

// Helpers to accept multiple backend response shapes
function pickToken(payload) {
  if (!payload) return null;
  if (typeof payload === 'string') return payload;
  return (
    payload.token ||
    payload.accessToken ||
    payload.jwt ||
    payload.data?.token ||
    payload.data?.accessToken ||
    null
  );
}
function pickSessionJti(payload) {
  if (!payload) return null;
  return payload.sessionJti || payload.data?.sessionJti || null;
}

const RegistrationPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // We’ll set the token directly after a successful register
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // quick client-side validation
    if (!formData.username.trim()) {
      toast({ title: 'Username is required', status: 'error', duration: 4000, isClosable: true });
      return;
    }
    if (!formData.email.trim()) {
      toast({ title: 'Email is required', status: 'error', duration: 4000, isClosable: true });
      return;
    }
    if (formData.password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', status: 'error', duration: 4000, isClosable: true });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Passwords do not match', status: 'error', duration: 4000, isClosable: true });
      return;
    }

    setLoading(true);
    try {
      // Call your backend directly so we can capture token + sessionJti
      const res = await client.post('/auth/register', {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      const token = pickToken(res.data);
      const jti = pickSessionJti(res.data);

      if (token) setSession(token);
      if (jti) setSessionHeader(jti); // powers Devices + richer audit logs

      toast({
        title: 'Registration Successful',
        description: 'Welcome! Your account is ready.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Take them straight into the app (they’re authenticated now)
      navigate('/', { replace: true });
    } catch (error) {
      const msg = error?.response?.data?.message || 'An unexpected error occurred.';
      toast({
        title: 'Registration Failed',
        description: msg,
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
      <Container
        maxW="container.sm"
        centerContent
        flex="1"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        py={{ base: 8, md: 12 }}
      >
        <VStack spacing={6} w="100%">
          <RouterLink to="/">
            <Image
              src="/logo.png"
              alt="Tees From The Past Logo"
              maxH="100px"
              mb={4}
              objectFit="contain"
            />
          </RouterLink>

          <VStack
            as="form"
            onSubmit={handleSubmit}
            spacing={6}
            p={{ base: 6, md: 10 }}
            bg="brand.cardBlue"
            borderRadius="xl"
            boxShadow="xl"
            w="100%"
          >
            <Heading as="h1" size="lg" textAlign="center" fontFamily="heading" color="brand.textLight">
              Create Your Account
            </Heading>

            <FormControl isRequired>
              <FormLabel>Username</FormLabel>
              <Input
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a unique username"
                size="lg"
                autoComplete="username"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Email Address</FormLabel>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                size="lg"
                autoComplete="email"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Password</FormLabel>
              <InputGroup size="lg">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password (min. 6 characters)"
                  autoComplete="new-password"
                />
                <InputRightElement>
                  <IconButton
                    variant="ghost"
                    icon={showPassword ? <FaEyeSlash /> : <FaEye />}
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Confirm Password</FormLabel>
              <InputGroup size="lg">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
                <InputRightElement>
                  <IconButton
                    variant="ghost"
                    icon={showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <Button
              type="submit"
              isLoading={loading}
              loadingText="Creating Account..."
              colorScheme="brandAccentOrange"
              width="full"
              size="lg"
              fontSize="md"
            >
              Sign Up
            </Button>

            <Text pt={2} textAlign="center" color="brand.textMuted">
              Already have an account?{' '}
              <ChakraLink
                as={RouterLink}
                to="/login"
                color="brand.accentYellow"
                fontWeight="bold"
                _hover={{ textDecoration: 'underline' }}
              >
                Log in
              </ChakraLink>
            </Text>
          </VStack>
        </VStack>
      </Container>
      <Footer />
    </Flex>
  );
};

export default RegistrationPage;
