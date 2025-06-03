// frontend/src/pages/ResetPasswordPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Heading,
  Text,
  VStack,
  useToast,
  Center,
  Image,
  InputGroup,
  InputRightElement,
  IconButton as ChakraIconButton,
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { client } from '../api/client'; // Your Axios client
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    } else {
      setError('Invalid or missing password reset token. Please request a new reset link.');
      toast({
        title: 'Invalid Link',
        description: 'Password reset token is missing from the URL.',
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
    }
  }, [searchParams, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      toast({ title: 'Password Mismatch', description: "Passwords do not match.", status: 'error', duration: 3000, isClosable: true });
      return;
    }
    if (password.length < 6) { // Consistent with backend validation
        setError('Password must be at least 6 characters long.');
        toast({ title: 'Password Too Short', description: "Password must be at least 6 characters.", status: 'error', duration: 3000, isClosable: true });
        return;
    }

    setIsLoading(true);
    try {
      const response = await client.post('/auth/reset-password', { token, password });
      setSuccessMessage(response.data.message || 'Your password has been reset successfully! You can now log in.');
      toast({
        title: 'Password Reset Successful',
        description: response.data.message || 'You can now log in with your new password.',
        status: 'success',
        duration: 7000,
        isClosable: true,
      });
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to reset password. The link may be invalid or expired.';
      setError(errorMessage);
      toast({
        title: 'Password Reset Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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
              Reset Your Password
            </Heading>

            {!token && error && ( // Show error if token was invalid from the start
                <Text color="red.500" textAlign="center" fontWeight="medium">{error}</Text>
            )}

            {token && !successMessage && ( // Only show form if token exists and no success message yet
              <>
                <Text textAlign="center" color="brand.textDark">
                  Please enter your new password below.
                </Text>
                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                  <VStack spacing={4}>
                    <FormControl id="new-password" isRequired isInvalid={!!error.includes('password') || (password !== confirmPassword && confirmPassword !== '')}>
                      <FormLabel color="brand.textDark">New Password</FormLabel>
                      <InputGroup size="lg">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter new password"
                          bg="white"
                          borderColor="gray.300"
                          focusBorderColor="brand.primaryDark"
                          _focus={{ boxShadow: 'outline' }}
                        />
                        <InputRightElement>
                          <ChakraIconButton
                            variant="ghost"
                            icon={showPassword ? <FaEyeSlash /> : <FaEye />}
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>

                    <FormControl id="confirm-password" isRequired isInvalid={password !== confirmPassword && confirmPassword !== ''}>
                      <FormLabel color="brand.textDark">Confirm New Password</FormLabel>
                      <InputGroup size="lg">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          bg="white"
                          borderColor="gray.300"
                          focusBorderColor="brand.primaryDark"
                          _focus={{ boxShadow: 'outline' }}
                        />
                        <InputRightElement>
                          <ChakraIconButton
                            variant="ghost"
                            icon={showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          />
                        </InputRightElement>
                      </InputGroup>
                      {password !== confirmPassword && confirmPassword !== '' && (
                        <FormErrorMessage>Passwords do not match.</FormErrorMessage>
                      )}
                    </FormControl>

                    {error && <Text color="red.500" textAlign="center" fontWeight="medium">{error}</Text>}


                    <Button
                      type="submit"
                      isLoading={isLoading}
                      loadingText="Resetting..."
                      colorScheme="brandPrimary"
                      w="100%"
                      py={6}
                      size="lg"
                      borderRadius="full"
                      mt={2} // Add some margin before button
                    >
                      Reset Password
                    </Button>
                  </VStack>
                </form>
              </>
            )}

            {successMessage && (
              <VStack spacing={4} textAlign="center">
                <Text color="green.500" fontWeight="bold" fontSize="lg">{successMessage}</Text>
                <ChakraLink as={RouterLink} to="/login" color="brand.primaryDark" fontWeight="bold" _hover={{textDecoration: "underline"}}>
                  Proceed to Login
                </ChakraLink>
              </VStack>
            )}

          </VStack>
        </Box>
      </VStack>
    </Center>
  );
};

export default ResetPasswordPage;
