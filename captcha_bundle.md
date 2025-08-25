// frontend/src/pages/LoginPage.jsx
import React, { useState } from "react";
import {
  Box, Button, FormControl, FormLabel, Input, VStack, Heading, Text, useToast,
  Container, InputGroup, InputRightElement, IconButton, Image, Link as ChakraLink, Flex,
} from "@chakra-ui/react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate, Link as RouterLink, useLocation } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import { client } from "../api/client";
import { useAuth } from "../context/AuthProvider";

function pickToken(payload) {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  return (
    payload.token ||
    payload.accessToken ||
    payload.jwt ||
    payload.data?.token ||
    payload.data?.accessToken ||
    null
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const redirectParam = new URLSearchParams(location.search).get("redirect");
  const redirectTo = redirectParam || location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await client.post("/auth/login", { email, password });
      const token = pickToken(res.data);
      const jti = res.data?.sessionJti || null;
      if (!token) throw new Error("Login succeeded but no token was returned.");

      // Pass BOTH token and jti so headers are set before hydrateUser runs
      await setSession(token, jti);

      toast({
        title: "Login Successful",
        description: "Welcome back!",
        status: "success",
        duration: 2500,
        isClosable: true,
      });

      navigate(redirectTo, { replace: true });
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Invalid email or password.";
      toast({
        title: "Login Failed",
        description: msg,
        status: "error",
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
              maxH={{ base: "70px", md: "100px" }}
              mb={2}
              objectFit="contain"
            />
          </RouterLink>

          <Box as="form" onSubmit={handleSubmit} p={{ base: 6, md: 10 }} layerStyle="cardBlue" w="100%">
            <VStack spacing={6} w="100%">
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
                  autoComplete="email"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <InputGroup size="lg">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <InputRightElement>
                    <IconButton
                      variant="ghost"
                      icon={showPassword ? <FaEyeSlash /> : <FaEye />}
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    />
                  </InputRightElement>
                </InputGroup>

                <Text textAlign="right" mt={2}>
                  <ChakraLink
                    as={RouterLink}
                    to="/forgot-password"
                    fontSize="sm"
                    color="brand.accentYellow"
                    _hover={{ textDecoration: "underline" }}
                  >
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

              <Text pt={2} textAlign="center">
                Don&apos;t have an account?{" "}
                <ChakraLink
                  as={RouterLink}
                  to="/register"
                  color="brand.accentYellow"
                  fontWeight="bold"
                  _hover={{ textDecoration: "underline" }}
                >
                  Sign up now
                </ChakraLink>
              </Text>
            </VStack>
          </Box>
        </VStack>
      </Container>

      <Footer />
    </Flex>
  );
}
// frontend/src/pages/RegistrationPage.jsx
import { useState } from 'react';
import {
  Box, Button, FormControl, FormLabel, Input, VStack, Heading, Text, useToast,
  Container, InputGroup, InputRightElement, IconButton, Image, Link as ChakraLink, Flex
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthProvider';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import { client } from '../api/client';

const RegistrationPage = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setSession } = useAuth(); // optional auto-login if backend returns token
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Passwords do not match', status: 'error', duration: 5000, isClosable: true });
      return;
    }
    setLoading(true);
    try {
      const res = await client.post("/auth/register", {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      // Optional: don’t auto-login until verified. If you do want auto-login, uncomment:
      // const token = res.data?.token;
      // if (token) await setSession(token);

      // Kick verification email (idempotent; backend also queued one)
      try { await client.post('/auth/send-verification', { email: formData.email }); } catch {}

      toast({ title: 'Registration Successful', description: 'Check your email to verify your account.', status: 'success', duration: 3000, isClosable: true });
      navigate('/check-email');
    } catch (error) {
      toast({ title: 'Registration Failed', description: error.response?.data?.message || 'An unexpected error occurred.', status: 'error', duration: 5000, isClosable: true });
    } finally { setLoading(false); }
  };

  return (
    <Flex direction="column" minH="100vh" bg="brand.primary">
      <Container maxW="container.sm" centerContent flex="1" display="flex" flexDirection="column" justifyContent="center" py={{ base: 8, md: 12 }}>
        <VStack spacing={6} w="100%">
          <RouterLink to="/"><Image src="/logo.png" alt="Tees From The Past Logo" maxH="100px" mb={4} objectFit="contain" /></RouterLink>
          <VStack as="form" onSubmit={handleSubmit} spacing={6} layerStyle="cardBlue" w="100%" p={{ base: 6, md: 10 }}>
            <Heading as="h1" size="lg" textAlign="center" color="brand.textLight">Create Your Account</Heading>

            <FormControl isRequired><FormLabel>Username</FormLabel><Input name="username" onChange={handleChange} placeholder="Choose a unique username" size="lg"/></FormControl>
            <FormControl isRequired><FormLabel>Email Address</FormLabel><Input type="email" name="email" onChange={handleChange} placeholder="you@example.com" size="lg"/></FormControl>

            <FormControl isRequired>
              <FormLabel>Password</FormLabel>
              <InputGroup size="lg">
                <Input type={showPassword ? 'text' : 'password'} name="password" onChange={handleChange} placeholder="Create a password (min. 6 characters)" />
                <InputRightElement>
                  <IconButton variant="ghost" icon={showPassword ? <FaEyeSlash /> : <FaEye />} onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Confirm Password</FormLabel>
              <InputGroup size="lg">
                <Input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" onChange={handleChange} placeholder="Confirm your password" />
                <InputRightElement>
                  <IconButton variant="ghost" icon={showConfirmPassword ? <FaEyeSlash /> : <FaEye />} onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <Button type="submit" isLoading={loading} loadingText="Creating Account..." bg="brand.accentOrange" color="white" _hover={{ bg: 'brand.accentOrangeHover' }} width="full" size="lg">
              Sign Up
            </Button>

            <Text pt={2} textAlign="center" color="brand.textMuted">
              Already have an account?{' '}
              <ChakraLink as={RouterLink} to="/login" color="brand.accentYellow" fontWeight="bold" _hover={{ textDecoration: "underline" }}>Log in</ChakraLink>
            </Text>
          </VStack>
        </VStack>
      </Container>
      <Footer />
    </Flex>
  );
};

export default RegistrationPage;
import React, { useState } from 'react';
import {
    Box, Button, FormControl, FormLabel, Input, Heading, Text,
    VStack, useToast, Link as ChakraLink, Center, Image,
    Alert, AlertIcon, AlertTitle, AlertDescription, Flex, Container
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { client } from '../api/client';
import Footer from '../components/Footer.jsx';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageStatus, setMessageStatus] = useState('info'); 
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
                isClosable: true,
            });
            setIsLoading(false);
            return;
        }

        try {
            await client.post('/auth/request-password-reset', { email });
            setMessage('If an account with that email address exists, a password reset link has been sent. Please check your inbox (and spam folder).');
            setMessageStatus('success');
            setEmail('');
        } catch (error) {
            setMessage('If an account with that email address exists, a password reset link has been sent. If you continue to have trouble, please contact support.');
            setMessageStatus('info');
            console.error('Error requesting password reset:', error.response?.data?.message || error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Flex direction="column" minH="100vh" bg="brand.primary">
            <Container maxW="container.sm" centerContent flex="1" display="flex" flexDirection="column" justifyContent="center" py={{ base: 8, md: 12 }}>
                <VStack spacing={6} w="100%">
                    <RouterLink to="/">
                        <Image src="/logo.png" alt="Tees From The Past Logo" maxH="100px" mb={4} objectFit="contain" />
                    </RouterLink>
                    <Box
                        p={{base: 6, md: 10}}
                        borderWidth="1px"
                        borderColor="whiteAlpha.200"
                        borderRadius="xl"
                        boxShadow="lg"
                        bg="brand.cardBlue"
                        w="100%"
                    >
                        <VStack spacing={6}>
                            <Heading as="h1" size="lg" textAlign="center" color="brand.textLight">
                                Forgot Your Password?
                            </Heading>
                            
                            {!message ? (
                                <>
                                    <Text textAlign="center" color="brand.textMuted">
                                        No worries! Enter your email address below and we'll send you a link to reset it.
                                    </Text>
                                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                                        <VStack spacing={5}>
                                            <FormControl id="email-forgot" isRequired>
                                                <FormLabel>Email address</FormLabel>
                                                <Input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="you@example.com"
                                                    size="lg"
                                                />
                                            </FormControl>
                                            <Button
                                                type="submit"
                                                isLoading={isLoading}
                                                loadingText="Sending..."
                                                w="100%"
                                                size="lg"
                                                mt={4}
                                                colorScheme="brandAccentOrange"
                                            >
                                                Send Password Reset Link
                                            </Button>
                                        </VStack>
                                    </form>
                                </>
                            ) : (
                                <Alert
                                    status={messageStatus}
                                    variant="subtle"
                                    flexDirection="column"
                                    alignItems="center"
                                    justifyContent="center"
                                    textAlign="center"
                                    py={6}
                                    bg={messageStatus === 'success' ? 'green.900' : 'blue.900'}
                                    borderWidth="1px"
                                    borderColor={messageStatus === 'success' ? 'green.500' : 'blue.500'}
                                    borderRadius="lg"
                                >
                                    <AlertIcon boxSize="40px" mr={0} color={messageStatus === 'success' ? 'green.300' : 'blue.300'} />
                                    <AlertTitle mt={4} mb={2} fontSize="lg" color="white">
                                        {messageStatus === 'success' ? 'Request Sent!' : 'Check Your Email'}
                                    </AlertTitle>
                                    <AlertDescription maxWidth="sm" color="whiteAlpha.900">
                                        {message}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Text pt={4} textAlign="center" color="brand.textMuted">
                                Remember your password?{' '}
                                <ChakraLink as={RouterLink} to="/login" color="brand.accentYellow" fontWeight="bold" _hover={{ textDecoration: "underline" }}>
                                    Login here
                                </ChakraLink>
                            </Text>
                        </VStack>
                    </Box>
                </VStack>
            </Container>
            <Footer />
        </Flex>
    );
};

export default ForgotPasswordPage;
// frontend/src/pages/ContactPage.jsx

import React, { useState } from 'react';
import {
    Box, Button, Center, FormControl, FormLabel, FormErrorMessage, Input, Heading, Text,
    Textarea, Select, VStack, useToast, Image, Icon, Link as ChakraLink, Alert, AlertIcon, AlertTitle, AlertDescription
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaPaperPlane, FaHome, FaCheckCircle } from 'react-icons/fa';
import { client } from '../api/client';

/**
 * Contact Page
 * REFRACTORED:
 * - Page background and content card updated to match the site's dark theme.
 * - All text, link, and form element styles updated for dark mode visibility and consistency.
 * - Added a dedicated success state display for better user feedback after form submission.
 */

const ThemedInput = (props) => ( <Input bg="brand.primaryDark" borderColor="whiteAlpha.300" _hover={{ borderColor: "whiteAlpha.400" }} focusBorderColor="brand.accentYellow" size="lg" {...props} /> );
const ThemedTextarea = (props) => ( <Textarea bg="brand.primaryDark" borderColor="whiteAlpha.300" _hover={{ borderColor: "whiteAlpha.400" }} focusBorderColor="brand.accentYellow" size="lg" {...props} /> );
const ThemedSelect = (props) => ( <Select bg="brand.primaryDark" borderColor="whiteAlpha.300" _hover={{ borderColor: "whiteAlpha.400" }} focusBorderColor="brand.accentYellow" size="lg" {...props} /> );

const ContactPage = () => {
    const [formData, setFormData] = useState({ name: '', email: '', reason: '', message: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const toast = useToast();

    const contactReasons = [ "General Inquiry", "Technical Support / Troubleshooting", "Feature Request / Site Improvement Suggestion", "Question about an Order", "Partnership / Collaboration", "Other" ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) { setErrors(prev => ({ ...prev, [name]: null })); }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = "Name is required.";
        if (!formData.email.trim()) { newErrors.email = "Email is required."; } 
        else if (!/\S+@\S+\.\S+/.test(formData.email)) { newErrors.email = "Email address is invalid."; }
        if (!formData.reason) newErrors.reason = "Please select a reason for contact.";
        if (!formData.message.trim()) { newErrors.message = "Message is required."; } 
        else if (formData.message.trim().length < 10) { newErrors.message = "Message should be at least 10 characters long."; }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            toast({ title: "Validation Error", description: "Please check the form for errors.", status: "error", isClosable: true });
            return;
        }
        setIsLoading(true);
        try {
            const response = await client.post('/forms/contact', formData);
            toast({ title: 'Message Sent!', description: response.data.message || "We'll get back to you soon.", status: 'success', isClosable: true });
            setIsSubmitted(true); // Show success state instead of just clearing form
        } catch (error) {
            toast({ title: 'Error Sending Message', description: error.response?.data?.message || "Sorry, we couldn't send your message.", status: 'error', isClosable: true });
        } finally {
            setIsLoading(false);
        }
    };
    
    const resetForm = () => {
        setFormData({ name: '', email: '', reason: '', message: '' });
        setErrors({});
        setIsSubmitted(false);
    }

    return (
        <Box bg="brand.primary" minH="100vh" py={{ base: 8, md: 16 }}>
            <Center>
                <VStack spacing={8} w="100%" maxW={{ base: "95%", md: "xl" }}>
                    <RouterLink to="/">
                        <Image src="/logo.png" alt="Tees From The Past Logo" maxH={{ base: "100px", md: "120px" }} />
                    </RouterLink>
                    <Box p={{ base: 6, md: 10 }} borderWidth="1px" borderColor="whiteAlpha.200" borderRadius="xl" boxShadow="2xl" bg="brand.primaryLight" w="100%">
                        {isSubmitted ? (
                            <VStack spacing={6} textAlign="center" py={8}>
                                <Icon as={FaCheckCircle} boxSize="50px" color="green.400" />
                                <Heading size="lg" color="brand.textLight">Message Sent!</Heading>
                                <Text color="whiteAlpha.800" maxW="md">Thanks for reaching out. We've received your message and will get back to you as soon as possible.</Text>
                                <Button onClick={resetForm} bg="brand.accentYellow" color="brand.textDark" _hover={{ bg: 'brand.accentYellowHover' }}>Send Another Message</Button>
                            </VStack>
                        ) : (
                            <VStack spacing={6} as="form" onSubmit={handleSubmit}>
                                <Heading as="h1" size="xl" textAlign="center" color="brand.textLight" mb={2}>
                                    Get In Touch
                                </Heading>
                                <Text textAlign="center" color="whiteAlpha.800" fontSize="lg" maxW="lg" mx="auto">
                                    Have a question, suggestion, or just want to say hi? We'd love to hear from you!
                                </Text>

                                <FormControl isRequired isInvalid={!!errors.name}>
                                    <FormLabel htmlFor="name" color="whiteAlpha.800" fontWeight="semibold">Your Name</FormLabel>
                                    <ThemedInput id="name" name="name" placeholder="Enter your full name" value={formData.name} onChange={handleChange} />
                                    <FormErrorMessage>{errors.name}</FormErrorMessage>
                                </FormControl>

                                <FormControl isRequired isInvalid={!!errors.email}>
                                    <FormLabel htmlFor="email" color="whiteAlpha.800" fontWeight="semibold">Your Email</FormLabel>
                                    <ThemedInput id="email" name="email" type="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} />
                                    <FormErrorMessage>{errors.email}</FormErrorMessage>
                                </FormControl>

                                <FormControl isRequired isInvalid={!!errors.reason}>
                                    <FormLabel htmlFor="reason" color="whiteAlpha.800" fontWeight="semibold">Reason for Contact</FormLabel>
                                    <ThemedSelect id="reason" name="reason" placeholder="-- Select a Reason --" value={formData.reason} onChange={handleChange}>
                                        {contactReasons.map(reason => (<option key={reason} value={reason}>{reason}</option>))}
                                    </ThemedSelect>
                                    <FormErrorMessage>{errors.reason}</FormErrorMessage>
                                </FormControl>

                                <FormControl isRequired isInvalid={!!errors.message}>
                                    <FormLabel htmlFor="message" color="whiteAlpha.800" fontWeight="semibold">Message</FormLabel>
                                    <ThemedTextarea id="message" name="message" placeholder="Type your message here..." value={formData.message} onChange={handleChange} rows={6} />
                                    <FormErrorMessage>{errors.message}</FormErrorMessage>
                                </FormControl>

                                <Button
                                    type="submit"
                                    isLoading={isLoading}
                                    loadingText="Sending..."
                                    w="full"
                                    size="lg"
                                    mt={4}
                                    bg="brand.accentOrange"
                                    color="white"
                                    _hover={{ bg: 'brand.accentOrangeHover' }}
                                    leftIcon={<Icon as={FaPaperPlane} />}
                                >
                                    Send Message
                                </Button>
                            </VStack>
                        )}
                    </Box>
                    <ChakraLink as={RouterLink} to="/" color="brand.accentYellow" fontWeight="semibold" _hover={{ textDecoration: 'underline' }} display="flex" alignItems="center">
                        <Icon as={FaHome} mr={2} />
                        Back to Home
                    </ChakraLink>
                </VStack>
            </Center>
        </Box>
    );
};

export default ContactPage;
import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#184C4A', // Main dark background (a deep teal/green)
    secondary: '#1B3B3A', // Header/darker background (slightly lighter dark teal), used for modal backgrounds, and now for password inputs on dark.
    cardBlue: '#F8DFA7', // The light, warm card background (light beige/gold) - INTENTIONALLY LIGHT
    
    accentOrange: '#D16930', // Vibrant orange
    accentOrangeHover: '#E17A45', // Slightly lighter orange for hover

    accentYellow: '#FFE9A0', // Light yellow for accents
    accentYellowHover: '#FDD97A', // Slightly darker yellow for hover

    textLight: '#FDF6EE', // Very light text, for use on dark backgrounds (primary, secondary, ui.background, MODALS)
    textMuted: '#B7C4C4', // Muted text for subtle elements on dark backgrounds
    textDark: '#2A2A2A', // Dark text, for use on light backgrounds (like cardBlue, INPUT FIELDS)
    textBurnt: '#3B2F1B', // Even darker, burnt-sienna like text for strong contrast on light elements - NEW PRIMARY FOR HEADINGS ON LIGHT CARDS

    paper: '#2D3748', // This color matches the 'ui.background' you previously had, providing a muted dark background
  },
  ui: {
    background: '#1E3A39', // General UI background, similar to primary
  },
  // ... other standard colors (green, red, gray, orange, blue) - no changes here
  green: { 50: '#F0FFF4', 100: '#C6F6D5', 200: '#9AE6B4', 300: '#68D391', 400: '#48BB78', 500: '#38A169', 600: '#2F855A', 700: '#276749', 800: '#22543D', 900: '#1C4532' },
  red: { 50: '#FFF5F5', 100: '#FED7D7', 200: '#FC8181', 300: '#E53E3E', 400: '#C53030', 500: '#9B2C2C', 600: '#822727', 700: '#63171B', 800: '#441C20', 900: '#2C1717' },
  gray: { 50: '#F7FAFC', 100: '#EDF2F7', 200: '#E2E8F0', 300: '#CBD5E0', 400: '#A0AEC0', 500: '#718096', 600: '#4A5568', 700: '#2D3748', 800: '#1A202C', 900: '#171923' },
  orange: { 50: '#FFFAF0', 100: '#FEEBC8', 200: '#FBD38D', 300: '#F6AD55', 400: '#ED8936', 500: '#DD6B20', 600: '#C05621', 700: '#9C4221', 800: '#7B341E', 900: '#652B1E' },
  blue: { 50: '#EBF8FF', 100: '#BEE3F8', 200: '#90CDF4', 300: '#63B3ED', 400: '#4299E1', 500: '#3182CE', 600: '#2B6CB0', 700: '#2C5282', 800: '#2A4365', 900: '#1A365D' },
};

const fonts = {
  heading: "'Bungee', cursive",
  body: "'Montserrat', sans-serif",
};

const components = {
  Card: {
    baseStyle: {
      container: {
        bg: 'brand.cardBlue',
        color: 'brand.textDark',
        borderRadius: 'xl',
        boxShadow: 'lg',
      }
    }
  },
  Heading: {
    baseStyle: {
      fontFamily: fonts.heading,
      fontWeight: 'normal',
    },
    sizes: {
      pageTitle: {
        fontSize: { base: '3xl', md: '4xl' },
        lineHeight: 'shorter',
        mb: 8,
        color: 'brand.textLight',
      },
    },
  },
  Text: {
    baseStyle: {
      fontFamily: fonts.body,
      lineHeight: 'tall',
    },
  },
  Modal: {
    baseStyle: {
      dialog: {
        bg: 'brand.secondary',
        color: 'brand.textLight',
      },
      header: {
        color: 'brand.textLight',
        borderBottomWidth: '1px',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      body: {
        color: 'brand.textLight',
        'label': {
          color: 'brand.textLight !important',
        },
        'h1, h2, h3, h4, h5, h6': {
          color: 'brand.textLight !important',
        },
      },
      footer: {
        borderTopWidth: '1px',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      }
    }
  },
  Button: {
    variants: {
      solid: (props) => {
        if (props.colorScheme === 'brandAccentOrange') {
          return {
            bg: 'brand.accentOrange',
            color: 'white',
            _hover: { bg: 'brand.accentOrangeHover' }
          };
        }
        if (props.colorScheme === 'brandAccentYellow') {
          return {
            bg: 'brand.accentYellow',
            color: 'brand.textDark',
            _hover: { bg: 'brand.accentYellowHover' }
          };
        }
        return {};
      },
      outline: (props) => ({
        borderColor: 'brand.textMuted',
        color: 'brand.textLight',
        _hover: {
          bg: 'whiteAlpha.200',
          color: 'brand.accentYellow',
          borderColor: 'brand.accentYellow',
        },
      }),
    },
    defaultProps: {
      variant: 'solid',
    },
  },
  Table: {
    baseStyle: {
      th: {
        color: 'brand.textDark !important',
        borderColor: 'rgba(0,0,0,0.1) !important',
        textTransform: 'uppercase',
      },
      td: {
        color: 'brand.textDark !important',
        borderColor: 'rgba(0,0,0,0.05) !important',
      },
    },
  },
  Input: {
    variants: {
      outline: {
        field: {
          color: 'brand.textDark !important',
          bg: 'whiteAlpha.900 !important',
          borderColor: 'brand.textMuted',
          _placeholder: {
            color: 'brand.textMuted',
          },
          _hover: {
            borderColor: 'brand.accentOrange',
          },
          _focus: {
            borderColor: 'brand.accentOrange',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-accentOrange)',
          },
        },
      },
      filled: {
        field: {
          bg: 'rgba(0,0,0,0.1) !important',
          color: 'brand.textDark !important',
          borderColor: 'transparent',
          _hover: { bg: 'rgba(0,0,0,0.12) !important' },
          _focus: { bg: 'rgba(0,0,0,0.12) !important' },
          isReadOnly: true,
        },
      },
    },
    defaultProps: {
      variant: 'outline',
    },
  },
  Select: {
    variants: {
      outline: {
        field: {
          color: 'brand.textDark !important',
          bg: 'whiteAlpha.900 !important',
          borderColor: 'brand.textMuted',
          _hover: {
            borderColor: 'brand.accentOrange',
          },
          _focus: {
            borderColor: 'brand.accentOrange',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-accentOrange)',
          },
        },
      },
    },
  },
  Textarea: {
    variants: {
      outline: {
        field: {
          color: 'brand.textDark !important',
          bg: 'whiteAlpha.900 !important',
          borderColor: 'brand.textMuted',
          _placeholder: {
            color: 'brand.textMuted',
          },
          _hover: {
            borderColor: 'brand.accentOrange',
          },
          _focus: {
            borderColor: 'brand.accentOrange',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-accentOrange)',
          },
        },
      },
    },
  },
  NumberInput: {
    variants: {
      outline: {
        field: {
          color: 'brand.textDark !important',
          bg: 'whiteAlpha.900 !important',
          borderColor: 'brand.textMuted',
          _placeholder: {
            color: 'brand.textMuted',
          },
          _hover: {
            borderColor: 'brand.accentOrange',
          },
          _focus: {
            borderColor: 'brand.accentOrange',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-accentOrange)',
          },
        },
      },
    },
  },
  FormLabel: {
    baseStyle: {
      mb: 2,
      color: 'brand.textDark',
      fontWeight: 'medium',
    },
  },
  Stat: {
    baseStyle: {
      label: {
        color: 'brand.textDark',
      },
      number: {
        color: 'brand.textBurnt',
      }
    }
  },
  Accordion: {
    baseStyle: {
      container: {
        borderWidth: '0 !important',
      },
      button: {
        _hover: {
          bg: 'whiteAlpha.100',
        },
      },
      panel: {},
    },
  },
  Tag: {
    baseStyle: {
      container: {
        fontWeight: 'bold',
        borderRadius: 'full',
      },
    },
    variants: {
      subtle: (props) => ({
        container: {
          bg: `${props.colorScheme}.600`,
          color: 'white',
        }
      }),
      solid: (props) => ({
        container: {
          bg: `${props.colorScheme}.700`,
          color: 'white',
        }
      }),
      outline: (props) => ({
        container: {
          color: `${props.colorScheme}.600`,
          borderColor: `${props.colorScheme}.600`,
        }
      })
    },
    defaultProps: {
      variant: 'subtle',
    }
  },
  MenuList: {
    baseStyle: {
      bg: 'brand.cardBlue',
      color: 'brand.textDark',
      borderColor: 'rgba(0,0,0,0.1)',
      boxShadow: 'lg',
    },
  },
  MenuItem: {
    baseStyle: {
      _dark: {
        color: 'var(--chakra-colors-brand-textDark) !important',
        'p, span, div, strong': {
          color: 'var(--chakra-colors-brand-textDark) !important',
          '--chakra-colors-chakra-body-text': 'var(--chakra-colors-brand-textDark) !important',
        },
      },
      _hover: {
        bg: 'brand.secondary',
        color: 'brand.textLight',
        'p, span, div, strong': {
          color: 'var(--chakra-colors-brand-textLight) !important',
          '--chakra-colors-chakra-body-text': 'var(--chakra-colors-brand-textLight) !important',
        },
      },
      _focus: {
        bg: 'brand.secondary',
        color: 'brand.textLight',
        'p, div, span, strong': {
          color: 'var(--chakra-colors-brand-textLight) !important',
          '--chakra-colors-chakra-body-text': 'var(--chakra-colors-brand-textLight) !important',
        },
      },
      '&[data-chakra-menu-item="true"][color="red.600"]': {
        color: 'red.600 !important',
        'p, div, span, strong': {
          color: 'red.600 !important',
          '--chakra-colors-chakra-body-text': 'var(--chakra-colors-red-600) !important',
        },
        _hover: {
          bg: 'red.800',
          color: 'white',
          'p, div, span, strong': {
            color: 'white !important',
            '--chakra-colors-chakra-body-text': 'var(--chakra-colors-white) !important',
          },
        },
        _focus: {
          bg: 'red.800',
          color: 'white',
          'p, div, span, strong': {
            color: 'white !important',
            '--chakra-colors-chakra-body-text': 'var(--chakra-colors-white) !important',
          },
        }
      }
    },
  },
  MenuDivider: {
    baseStyle: {
      borderColor: 'rgba(0,0,0,0.1)',
    },
  },
  Spinner: {
    baseStyle: {
      color: 'brand.accentYellow',
    },
  },
};

const config = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const layerStyles = {
  cardBlue: {
    bg: 'brand.cardBlue',
    color: 'brand.textDark',
    borderRadius: 'xl',
    boxShadow: 'lg',
    p: 8,
    borderWidth: '1px',
    borderColor: 'transparent',
    transition: 'all 0.2s ease-in-out',
    _hover: {
      transform: 'translateY(-5px)',
      boxShadow: 'xl',
      borderColor: 'brand.accentYellow',
    },
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      color: 'brand.textBurnt !important',
      fontFamily: `${fonts.heading} !important`,
    },
    '& p, & div:not([role="group"]):not([class^="chakra-"]):not([data-chakra-component]), & span:not([role="group"]):not([class^="chakra-"]):not([data-chakra-component])': {
      color: 'brand.textDark !important',
      fontFamily: `${fonts.body} !important`,
    },
    '& svg': {
      color: 'brand.textBurnt !important',
    },
  },
  darkInnerSection: {
    bg: 'brand.secondary',
    color: 'brand.textLight',
    borderRadius: 'md',
    p: 6,
    borderWidth: '1px',
    borderColor: 'rgba(255,255,255,0.1)',
    boxShadow: 'sm',
    '& .chakra-form__label': {
      color: 'brand.textLight !important',
    },
  },
  darkModalContent: {
    bg: 'brand.primary',
    color: 'brand.textLight',
    borderRadius: 'md',
    p: 4,
    borderWidth: '1px',
    borderColor: 'rgba(255,255,255,0.1)',
  },
};

const theme = extendTheme({
  config,
  colors,
  fonts,
  components,
  layerStyles,
  styles: {
    global: {
      body: {
        bg: 'brand.primary',
        color: 'brand.textLight',
      },
      a: {
        color: 'brand.accentYellow',
        _hover: {
          textDecoration: 'underline',
        },
      },
    },
  },
});

export default theme;
import express from "express";
import rateLimit from "express-rate-limit";
import { body } from "express-validator";
import { protect } from "../middleware/authMiddleware.js";
import * as auth from "../controllers/authController.js";

// ✅ FIXED PATH: controllers (not routes)
import {
  sendVerification,
  verifyEmail,
  resendVerification,
} from "../controllers/emailVerificationController.js";

const router = express.Router();

/* ----------------------------- Validators ---------------------------- */
const vRegister = [
  body("username").trim().notEmpty().withMessage("Username is required"),
  body("email").isEmail().withMessage("Valid email required"),
  body("password")
    .isString()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

const vLogin = [
  body("email").isEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const vReqReset = [body("email").isEmail().withMessage("Valid email required")];

const vReset = [
  body("token").notEmpty().withMessage("Reset token required"),
  body("password")
    .isString()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

const vChange = [
  body("currentPassword").notEmpty().withMessage("Current password required"),
  body("newPassword")
    .isString()
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters"),
];

const vEmailOnly = [body("email").isEmail().withMessage("Valid email required")];
const vVerify = [
  body("email").isEmail().withMessage("Valid email required"),
  body("token").notEmpty().withMessage("Token required"),
];

/* ----------------------------- Safe wrapper -------------------------- */
const safe = (fnName) => {
  const fn = auth[fnName];
  if (typeof fn === "function") return fn;
  return (_req, res) =>
    res
      .status(501)
      .json({ message: `Handler '${fnName}' is not available on authController` });
};

/* ----------------------------- Rate limits --------------------------- */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});
const verifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset — dual limiter
const resetIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const resetEmailLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.body?.email || "").trim().toLowerCase(),
});

/* -------------------------------- Routes ---------------------------- */
// Auth
router.post("/register", registerLimiter, vRegister, safe("registerUser"));
router.post("/login", loginLimiter, vLogin, safe("loginUser"));
router.post("/logout", protect, safe("logoutUser"));

// Email verification (public)
router.post("/send-verification", verifyLimiter, vEmailOnly, sendVerification);
router.post("/resend-verification", verifyLimiter, vEmailOnly, resendVerification);
router.post("/verify-email", verifyLimiter, vVerify, verifyEmail);

// Profile
router.get("/profile", protect, safe("getUserProfile"));
router.put("/profile", protect, safe("updateUserProfile"));

// Password reset/change
router.post(
  "/request-password-reset",
  resetIpLimiter,
  resetEmailLimiter,
  vReqReset,
  safe("requestPasswordReset")
);
router.post("/reset-password", vReset, safe("resetPassword"));
router.put("/change-password", protect, vChange, safe("changePassword"));

// Session refresh
router.post("/refresh", protect, safe("refreshSession"));

export default router;
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import { Resend } from "resend";
import User from "../models/User.js";
import RefreshTokenModel from "../models/RefreshToken.js";
import { signAccessToken } from "../middleware/authMiddleware.js";
import { logAuthLogin, logAuthLogout, logAudit } from "../utils/audit.js";
import {
  passwordResetTemplate,
  passwordChangedTemplate,
} from "../utils/emailTemplates.js";
import { queueSendVerificationEmail } from "./emailVerificationController.js";

const RefreshToken = mongoose.models.RefreshToken || RefreshTokenModel;

// Resend client + config (SMTP not used)
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM;
const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:5173";

// Helpers
function clientNet(req) {
  const h = req.headers || {};
  const ip =
    h["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    "";
  const userAgent = h["x-client-ua"] || h["user-agent"] || "";
  return {
    ip,
    userAgent,
    hints: {
      tz: h["x-client-timezone"] || "",
      lang: h["x-client-lang"] || "",
      viewport: h["x-client-viewport"] || "",
      platform: h["x-client-platform"] || "",
      ua: userAgent,
      localTime: h["x-client-localtime"] || "",
      deviceMemory: h["x-client-devicememory"] || "",
      cpuCores: h["x-client-cpucores"] || "",
    },
  };
}
function sessionExpiry(days = 30) {
  return new Date(Date.now() + days * 86400000);
}
async function revokeAllUserSessions(userId) {
  // best practice: kill refresh tokens after password change/reset
  try {
    await RefreshToken.updateMany(
      { user: userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    ).exec();
  } catch (e) {
    console.error("[sessions] revoke all failed:", e);
  }
}

/** POST /api/auth/register */
export const registerUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  const { username, email, password, firstName = "", lastName = "" } = req.body;
  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) {
    res.status(400);
    throw new Error("User with that email or username already exists");
  }

  const user = await User.create({ username, email, password, firstName, lastName });

  const token = signAccessToken(user._id);
  const jti = crypto.randomUUID();
  const { ip, userAgent, hints } = clientNet(req);
  await RefreshToken.create({
    jti,
    user: user._id,
    ip,
    userAgent,
    client: hints,
    expiresAt: sessionExpiry(30),
    lastSeenAt: new Date(),
  });

  await logAudit(req, {
    action: "REGISTER",
    targetType: "User",
    targetId: String(user._id),
    meta: { email: user.email, sessionId: jti },
    actor: user._id,
  });
  await logAuthLogin(req, user, { via: "register", sessionId: jti });

  try {
    await queueSendVerificationEmail(user.email);
  } catch (e) {
    console.warn("[register] send verification email failed:", e?.message || e);
  }

  res.status(201).json({
    token,
    sessionJti: jti,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: !!user.isAdmin,
      emailVerifiedAt: user.emailVerifiedAt || null,
    },
  });
});

/** POST /api/auth/login */
export const loginUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const token = signAccessToken(user._id);
  const jti = crypto.randomUUID();
  const { ip, userAgent, hints } = clientNet(req);
  await RefreshToken.create({
    jti,
    user: user._id,
    ip,
    userAgent,
    client: hints,
    expiresAt: sessionExpiry(30),
    lastSeenAt: new Date(),
  });

  await logAuthLogin(req, user, { email, sessionId: jti });

  res.json({
    token,
    sessionJti: jti,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: !!user.isAdmin,
      emailVerifiedAt: user.emailVerifiedAt || null,
    },
  });
});

/** POST /api/auth/logout */
export const logoutUser = asyncHandler(async (req, res) => {
  const user = req.user || null;
  const sessionId = req.headers["x-session-id"] || "";
  await logAuthLogout(req, user, { sessionId });

  if (user?._id && sessionId) {
    const rt = await RefreshToken.findOne({
      jti: sessionId,
      user: user._id,
      revokedAt: null,
    }).exec();
    if (rt) {
      rt.revokedAt = new Date();
      await rt.save();
    }
  }
  res.json({ message: "Logged out" });
});

/** GET /api/auth/profile */
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json(user);
});

/** PUT /api/auth/profile */
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { username, email, firstName, lastName, shippingAddress, billingAddress } =
    req.body;
  if (username !== undefined) user.username = username;
  if (email !== undefined) user.email = email;
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (shippingAddress !== undefined) user.shippingAddress = shippingAddress;
  if (billingAddress !== undefined) user.billingAddress = billingAddress;

  const updated = await user.save();

  await logAudit(req, {
    action: "PROFILE_UPDATE",
    targetType: "User",
    targetId: String(user._id),
    meta: {},
    actor: user._id,
  });

  const toSend = updated.toObject();
  delete toSend.password;
  res.json(toSend);
});

/** POST /api/auth/request-password-reset */
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  const { email } = req.body;
  const user = await User.findOne({ email }).select(
    "+passwordResetToken +passwordResetExpires"
  );

  // Always respond generically to avoid user enumeration
  const generic = { message: "If the email exists, a reset link has been sent." };

  if (!user) return res.json(generic);

  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  user.passwordResetToken = tokenHash;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 60 min
  await user.save();

  await logAudit(req, {
    action: "PASSWORD_RESET_REQUEST",
    targetType: "User",
    targetId: String(user._id),
    meta: {},
    actor: user._id,
  });

  // Send email via Resend (best effort—do not leak errors to client)
  try {
    const resetUrl = `${APP_ORIGIN}/reset-password?token=${encodeURIComponent(
      raw
    )}`;
    const { subject, text, html } = passwordResetTemplate({
      resetUrl,
      ttlMin: 60,
    });
    const { error } = await resend.emails.send({
      from: `Tees From The Past <${FROM}>`,
      to: user.email,
      subject,
      text,
      html,
    });
    if (error) throw error;
  } catch (e) {
    console.error("[password-reset] email send failed:", e);
  }

  res.json(generic);
});

/** POST /api/auth/reset-password */
export const resetPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  const { token, password } = req.body;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select("+password");
  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired reset token");
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // SECURITY: revoke all sessions after a password reset
  await revokeAllUserSessions(user._id);

  await logAudit(req, {
    action: "PASSWORD_RESET",
    targetType: "User",
    targetId: String(user._id),
    meta: {},
    actor: user._id,
  });

  // Confirmation email (best effort)
  try {
    const { subject, text, html } = passwordChangedTemplate();
    const { error } = await resend.emails.send({
      from: `Tees From The Past <${FROM}>`,
      to: user.email,
      subject,
      text,
      html,
    });
    if (error) throw error;
  } catch (e) {
    console.error("[password-reset] confirmation email failed:", e);
  }

  res.json({ message: "Password updated" });
});

/** PUT /api/auth/change-password */
export const changePassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  const ok = await user.matchPassword(currentPassword);
  if (!ok) {
    res.status(400);
    throw new Error("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  // SECURITY: revoke all sessions after password change (forces re-login)
  await revokeAllUserSessions(user._id);

  await logAudit(req, {
    action: "PASSWORD_CHANGE",
    targetType: "User",
    targetId: String(user._id),
    meta: {},
    actor: user._id,
  });

  // Confirmation email (best effort)
  try {
    const { subject, text, html } = passwordChangedTemplate();
    const { error } = await resend.emails.send({
      from: `Tees From The Past <${FROM}>`,
      to: user.email,
      subject,
      text,
      html,
    });
    if (error) throw error;
  } catch (e) {
    console.error("[change-password] confirmation email failed:", e);
  }

  res.json({ message: "Password changed" });
});

/** POST /api/auth/refresh */
export const refreshSession = asyncHandler(async (req, res) => {
  const token = signAccessToken(req.user._id);

  const sessionId = req.headers["x-session-id"];
  if (sessionId) {
    const rt = await RefreshToken.findOne({
      jti: sessionId,
      user: req.user._id,
      revokedAt: null,
    }).exec();
    if (rt) {
      rt.expiresAt = sessionExpiry(30);
      rt.lastSeenAt = new Date();
      await rt.save();
    }
  }

  res.json({ token });
});
// backend/utils/audit.js
import mongoose from "mongoose";

let AuditLog;
try {
  AuditLog = mongoose.model("AuditLog");
} catch {
  const AuditLogSchema = new mongoose.Schema(
    {
      action: { type: String, required: true, index: true },
      actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
      actorDisplay: { type: String, default: "" },
      targetType: { type: String, default: "", index: true },
      targetId: { type: String, default: "", index: true },
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
      meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
  );
  AuditLogSchema.index({ createdAt: -1, action: 1, targetType: 1 });
  AuditLog = mongoose.model("AuditLog", AuditLogSchema);
}

export async function logAudit(
  req,
  { action, targetType = "", targetId = "", meta = {}, actor = null }
) {
  try {
    const ip = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || req.ip || "";
    const userAgent = req.headers["user-agent"] || "";
    const actorId = actor || req.user?._id || null;

    // Auto-capture current session id if present:
    const sid = req.headers["x-session-id"];
    const mergedMeta = { ...meta };
    if (sid && !mergedMeta.sessionId) mergedMeta.sessionId = String(sid);

    await AuditLog.create({
      action,
      actor: actorId,
      targetType,
      targetId: String(targetId || ""),
      ip,
      userAgent,
      meta: mergedMeta,
    });
  } catch (err) {
    console.warn("[audit] failed:", err?.message);
  }
}

export async function logAdminAction(req, payload) {
  return logAudit(req, payload);
}
export async function logAuthLogin(req, user, meta = {}) {
  return logAudit(req, { action: "LOGIN", targetType: "Auth", targetId: user?._id, meta, actor: user?._id });
}
export async function logAuthLogout(req, user, meta = {}) {
  return logAudit(req, { action: "LOGOUT", targetType: "Auth", targetId: user?._id, meta, actor: user?._id });
}
// backend/app.js
import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

// Core app routes
import authRoutes from "./routes/auth.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import designsRoutes from "./routes/designs.js";
import storefrontRoutes from "./routes/storefrontProductRoutes.js";
import checkoutRoutes from "./routes/checkout.js";
import stripeWebhookRoutes from "./routes/stripeWebhook.js";
import printfulRoutes from "./routes/printful.js";
import ordersRoutes from "./routes/orders.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import adminOrderRoutes from "./routes/adminOrderRoutes.js";
import adminDesignRoutes from "./routes/adminDesignRoutes.js";
import adminProductRoutes from "./routes/adminProductRoutes.js";
import contestRoutes from "./routes/contest.js";
import formRoutes from "./routes/formRoutes.js";
import emailVerificationRoutes from "./routes/emailVerificationRoutes.js";

// Admin utilities
import adminSessionRoutes from "./routes/adminSessionRoutes.js";
import adminAuditRoutes from "./routes/adminAuditRoutes.js";

// 👇 NEW: add express-rate-limit to gently throttle the contact form
import rateLimit from "express-rate-limit";

dotenv.config();
connectDB();

const app = express();

/**
 * Trust the first proxy (Render puts you behind exactly one).
 * This makes req.ip the REAL client IP and keeps express-rate-limit happy.
 */
app.set("trust proxy", 1); // <-- CHANGED from true to 1

// --- Health check ---
app.get("/health", (_req, res) => res.send("OK"));

/**
 * Dependency-free CORS:
 * - Allows your Vercel app + localhost
 * - Handles preflight
 * - Whitelists custom headers you use (Authorization + x-session-id)
 */
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ||
  "https://teesfromthepast.vercel.app,http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const DEFAULT_ALLOWED_HEADERS = [
  "content-type",
  "authorization",
  "x-requested-with",
  "x-session-id",
  "x-client-info",
  "x-client-timezone",
  "x-client-lang",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  const requested = req.headers["access-control-request-headers"];
  res.setHeader(
    "Access-Control-Allow-Headers",
    (requested && String(requested)) || DEFAULT_ALLOWED_HEADERS.join(", ")
  );
  // Using Bearer tokens, not cookies (no credentials needed)
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

/**
 * IMPORTANT: Mount Stripe webhook BEFORE any JSON body parser
 * so `express.raw()` inside the webhook route can read the untouched body.
 */
app.use("/api/stripe", stripeWebhookRoutes);

// JSON body parsing (after Stripe)
app.use(express.json({ limit: "10mb" }));

/**
 * 👇 NEW: Gentle rate-limit ONLY the contact form POST
 * - 30 requests per IP per minute (tune as you like)
 * - Standard headers on; legacy headers off
 * - With trust proxy = 1 above, the limiter sees the real client IP
 */
const contactLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30,           // allow 30 POSTs per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/forms/contact", contactLimiter);

// --- Public & user routes ---
app.use("/api/auth", authRoutes);
app.use("/api/auth", emailVerificationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/mydesigns", designsRoutes);
app.use("/api/storefront", storefrontRoutes); // /products, /shop-data, /product/:slug
app.use("/api/checkout", checkoutRoutes);
app.use("/api/printful", printfulRoutes);
app.use("/api/orders", ordersRoutes);

// --- Admin routes (protected) ---
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/designs", adminDesignRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/sessions", adminSessionRoutes);
app.use("/api/admin/audit", adminAuditRoutes);

// --- Public extras ---
app.use("/api/contest", contestRoutes);
app.use("/api/forms", formRoutes);

export default app;
// backend/index.js
import mongoose from "mongoose";
import "dotenv/config";
import app from "./app.js";

process.on("uncaughtException", (err) => {
  console.error("[Backend Log] Uncaught Exception:", err?.stack || err);
  process.exit(1);
});
process.on("unhandledRejection", (reason, p) => {
  console.error("[Backend Log] Unhandled Rejection at:", p, "reason:", reason?.stack || reason);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

console.log("[Backend Log] Server starting…");

// Start HTTP server immediately so Render health check can succeed even if DB is slow.
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  console.log(`[Backend Log] Server successfully bound and listening on http://0.0.0.0:${PORT}`);
});

// Connect Mongo (non-blocking for health)
if (!MONGO_URI) {
  console.error("[Startup] Missing MONGO_URI");
} else {
  console.log("[Startup] Using MONGO_URI for Mongo connection");
  mongoose
    .connect(MONGO_URI, {
      // reasonable defaults; no deprecations for modern mongoose
      serverSelectionTimeoutMS: 12000,
      maxPoolSize: 10,
    })
    .then(() => {
      console.log("MongoDB connected successfully");
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err?.message || err);
      // Do NOT exit here — keep serving health checks so Render doesn't kill us.
    });
}

// Graceful shutdown (Render sends SIGTERM on redeploy)
const shutdown = async () => {
  try {
    console.log("[Shutdown] Received SIGTERM. Closing server…");
    server.close(() => {
      console.log("[Shutdown] HTTP server closed");
    });
    await mongoose.connection.close();
    console.log("[Shutdown] MongoDB connection closed");
  } catch (e) {
    console.error("[Shutdown] Error during shutdown:", e?.stack || e);
  } finally {
    process.exit(0);
  }
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
