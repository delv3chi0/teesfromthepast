import React, { useState, useEffect } from 'react';
import {
  Box, Button, FormControl, FormLabel, FormErrorMessage, Input, Heading, Text,
  VStack, useToast, Center, Image, InputGroup, InputRightElement, IconButton,
  Alert, AlertIcon, AlertTitle, AlertDescription, Icon
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { client } from '../api/client';
import { FaEye, FaEyeSlash, FaCheckCircle } from 'react-icons/fa';

const MIN_LEN = 8;

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
    if (urlToken) setToken(urlToken);
    else setError('Invalid or missing password reset token. Please request a new reset link.');
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < MIN_LEN) {
      setError(`Password must be at least ${MIN_LEN} characters long.`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await client.post('/auth/reset-password', { token, password });
      setSuccessMessage(response.data.message || 'Your password has been reset successfully!');
      toast({ title: 'Password Reset Successful', status: 'success', duration: 5000, isClosable: true });
      setTimeout(() => navigate('/login'), 4000);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to reset password. The link may be invalid or expired.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (successMessage) {
      return (
        <VStack spacing={6} textAlign="center" py={10}>
          <Icon as={FaCheckCircle} boxSize="50px" color="green.400" />
          <Heading size="lg" color="brand.textLight">Success!</Heading>
          <Text color="green.400" fontWeight="bold" fontSize="lg">{successMessage}</Text>
          <Text color="whiteAlpha.800">Redirecting you to the login page...</Text>
        </VStack>
      );
    }

    if (!token) {
      return (
        <Alert status="error" variant="subtle" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" height="200px" bg="red.900" borderWidth="1px" borderColor="red.500" borderRadius="lg">
          <AlertIcon boxSize="40px" mr={0} color="red.300" />
          <AlertTitle mt={4} mb={1} fontSize="lg" color="white">Invalid Link</AlertTitle>
          <AlertDescription maxWidth="sm" color="whiteAlpha.800">{error}</AlertDescription>
        </Alert>
      );
    }

    return (
      <VStack spacing={6}>
        <Heading as="h1" size="xl" textAlign="center" color="brand.textLight">
          Reset Your Password
        </Heading>
        <Text textAlign="center" color="whiteAlpha.800">
          Please enter your new password below (minimum {MIN_LEN} characters).
        </Text>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <VStack spacing={5}>
            <FormControl
              isRequired
              isInvalid={!!error.toLowerCase().includes('password') || (password.length > 0 && password.length < MIN_LEN)}
            >
              <FormLabel color="whiteAlpha.800">New Password</FormLabel>
              <InputGroup size="lg">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`Enter new password (min. ${MIN_LEN} characters)`}
                  bg="brand.primaryDark"
                  borderColor="whiteAlpha.300"
                  _hover={{ borderColor: "whiteAlpha.400" }}
                  focusBorderColor="brand.accentYellow"
                />
                <InputRightElement>
                  <IconButton
                    variant="ghost"
                    color="whiteAlpha.600"
                    _hover={{ color: "whiteAlpha.900", bg: "whiteAlpha.200" }}
                    icon={showPassword ? <FaEyeSlash /> : <FaEye />}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  />
                </InputRightElement>
              </InputGroup>
              {password.length > 0 && password.length < MIN_LEN && (
                <FormErrorMessage>Password must be at least {MIN_LEN} characters.</FormErrorMessage>
              )}
            </FormControl>

            <FormControl
              isRequired
              isInvalid={password !== confirmPassword && confirmPassword !== ''}
            >
              <FormLabel color="whiteAlpha.800">Confirm New Password</FormLabel>
              <InputGroup size="lg">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  bg="brand.primaryDark"
                  borderColor="whiteAlpha.300"
                  _hover={{ borderColor: "whiteAlpha.400" }}
                  focusBorderColor="brand.accentYellow"
                />
                <InputRightElement>
                  <IconButton
                    variant="ghost"
                    color="whiteAlpha.600"
                    _hover={{ color: "whiteAlpha.900", bg: "whiteAlpha.200" }}
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

            {error && (
              <Alert status="error" borderRadius="md" bg="red.900" mt={2}>
                <AlertIcon color="red.300" />
                <Text color="whiteAlpha.900">{error}</Text>
              </Alert>
            )}

            <Button
              type="submit"
              isLoading={isLoading}
              loadingText="Resetting..."
              w="100%"
              size="lg"
              mt={4}
              bg="brand.accentOrange"
              color="white"
              _hover={{ bg: 'brand.accentOrangeHover' }}
            >
              Reset Password
            </Button>
          </VStack>
        </form>
      </VStack>
    );
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
          {renderContent()}
        </Box>
      </VStack>
    </Center>
  );
};

export default ResetPasswordPage;
