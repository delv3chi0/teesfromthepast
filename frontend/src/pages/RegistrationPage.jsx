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
import { useNavigate, Link as RouterLink } from 'react-router-dom';

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
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    setLoading(true);
    try {
      await register(formData.username, formData.email, formData.password);
      toast({
        title: 'Registration Successful',
        description: 'You can now log in.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description: error.response?.data?.message || 'An unexpected error occurred.',
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
          Create Your Account
        </Heading>

        <FormControl isRequired>
          <FormLabel>Username</FormLabel>
          <Input name="username" onChange={handleChange} placeholder="Choose a unique username" />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Email Address</FormLabel>
          <Input type="email" name="email" onChange={handleChange} placeholder="you@example.com" />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Password</FormLabel>
          <InputGroup>
            <Input
              type={showPassword ? 'text' : 'password'}
              name="password"
              onChange={handleChange}
              placeholder="Create a password (min. 6 characters)"
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

        <FormControl isRequired>
          <FormLabel>Confirm Password</FormLabel>
          <InputGroup>
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              onChange={handleChange}
              placeholder="Confirm your password"
            />
            <InputRightElement>
              <IconButton
                variant="ghost"
                icon={showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
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
          Sign Up
        </Button>

        <Text fontSize="sm" color="brand.textMuted">
          Already have an account?{' '}
          <RouterLink to="/login" style={{ color: '#FFEE58', textDecoration: 'underline' }}>
            Log in
          </RouterLink>
        </Text>
      </VStack>
    </Container>
  );
};

export default RegistrationPage;
