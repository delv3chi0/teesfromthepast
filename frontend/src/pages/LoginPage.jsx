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
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthProvider';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';

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
    <Container maxW="container.sm" centerContent py={{ base: 8, md: 16 }}>
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
        {/* CORRECTED: Using the correct path for the logo from the public folder */}
        <Image src="/logo.png" alt="Tees From The Past Logo" boxSize="150px" mb={4} />
        <Heading as="h1" size="lg" textAlign="center" fontFamily="heading" color="brand.textLight">
          Welcome Back
        </Heading>
        
        <FormControl isRequired>
          <FormLabel>Email Address</FormLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Password</FormLabel>
          <InputGroup>
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
        </FormControl>

        <Button
          type="submit"
          colorScheme="brandAccentOrange"
          isLoading={loading}
          width="full"
          size="lg"
          fontSize="md"
        >
          Log In
        </Button>

        <Text fontSize="sm" color="brand.textMuted">
          Don't have an account?{' '}
          <RouterLink to="/register" style={{ color: '#FFEE58', textDecoration: 'underline' }}>
            Sign up now
          </RouterLink>
        </Text>
      </VStack>
    </Container>
  );
};

export default LoginPage;
