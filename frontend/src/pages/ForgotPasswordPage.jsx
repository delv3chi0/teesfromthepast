// frontend/src/pages/ForgotPasswordPage.jsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Heading,
  Text,
  VStack,
  useToast,
  Link as ChakraLink,
  Center,
  Image
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { client } from '../api/client'; // Your Axios client

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setIsLoading(false);
      return;
    }

    try {
      await client.post('/auth/request-password-reset', { email });
      setMessage('If an account with that email address exists, a password reset link has been sent. Please check your inbox (and spam folder).');
      toast({
        title: 'Request Sent',
        description: 'If your email is registered, you will receive a reset link shortly.',
        status: 'success',
        duration: 7000,
        isClosable: true,
      });
      setEmail('');
    } catch (error) {
      setMessage('If an account with that email address exists, a password reset link has been sent. If you continue to have trouble, please contact support.');
      toast({
        title: 'Request Processed',
        description: 'If your email is registered, you will receive instructions. Otherwise, please check the email entered or contact support if issues persist.',
        status: 'info',
        duration: 7000,
        isClosable: true,
      });
      console.error('Error requesting password reset:', error.response?.data?.message || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Center minH="100vh" bg="brand.accentOrange" p={{ base: 4, md: 8 }}>
      <VStack spacing={8} w="100%" maxW="md">
        <RouterLink to="/">
          <Image src="/logo.png" alt="Tees From The Past Logo" maxH="150px" mb={0} />
        </RouterLink>
        <Box
          p={8}
          borderWidth={1}
          borderRadius="xl"
          boxShadow="xl"
          bg="brand.paper"
          w="100%"
        >
          <VStack spacing={6}>
            <Heading as="h1" size="xl" textAlign="center" color="brand.textDark">
              Forgot Your Password?
            </Heading>
            <Text textAlign="center" color="brand.textDark">
              No worries! Enter your email address below, and if it's associated with an account, we'll send you a link to reset your password.
            </Text>

            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <VStack spacing={4}>
                <FormControl id="email-forgot" isRequired>
                  <FormLabel color="brand.textDark">Email address</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    bg="white"
                    borderColor="gray.300" // Or your theme's input border color e.g. brand.secondary
                    _hover={{ borderColor: 'gray.400' }} // Or theme equivalent
                    focusBorderColor="brand.primaryDark" // This sets the border color on focus
                    // The following _focus style uses Chakra's default outline which respects focusBorderColor
                    // This was the corrected part and should not cause 'colors is not defined'
                    _focus={{ boxShadow: 'outline' }}
                    size="lg"
                  />
                </FormControl>

                <Button
                  type="submit"
                  isLoading={isLoading}
                  loadingText="Sending..."
                  colorScheme="brandPrimary" // Ensure this color scheme is defined in your theme for buttons
                  w="100%"
                  py={6}
                  size="lg" // Make button size consistent
                  borderRadius="full" // If your buttons are typically full radius
                >
                  Send Password Reset Link
                </Button>
              </VStack>
            </form>

            {message && (
              <Text mt={4} textAlign="center" color={message.startsWith('Error requesting') ? 'red.500' : 'brand.textDark'}>
                {message}
              </Text>
            )}

            <Text color="brand.textDark" mt={4}>
              Remember your password?{' '}
              <ChakraLink as={RouterLink} to="/login" color="brand.primaryDark" fontWeight="bold" _hover={{ textDecoration: 'underline', color: 'brand.primary'}}>
                Login here
              </ChakraLink>
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Center>
  );
};

export default ForgotPasswordPage;
