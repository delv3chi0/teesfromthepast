// frontend/src/pages/ContactPage.jsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  Center,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Heading,
  Text,
  Textarea,
  Select,
  VStack,
  useToast,
  Image,
  Icon,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaPaperPlane, FaHome } from 'react-icons/fa';
import { client } from '../api/client'; // Ensure your Axios client is imported

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reason: '',
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const toast = useToast();

  const contactReasons = [
    "General Inquiry",
    "Technical Support / Troubleshooting",
    "Feature Request / Site Improvement Suggestion",
    "Question about an Order",
    "Partnership / Collaboration",
    "Other",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required.";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email address is invalid.";
    }
    if (!formData.reason) newErrors.reason = "Please select a reason for contact.";
    if (!formData.message.trim()) {
      newErrors.message = "Message is required.";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Message should be at least 10 characters long.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please check the form for errors.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      // API call to your backend endpoint
      const response = await client.post('/forms/contact', formData); 

      toast({
        title: 'Message Sent!',
        description: response.data.message || "Thanks for reaching out. We'll get back to you soon.",
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      setFormData({ name: '', email: '', reason: '', message: '' }); // Clear form
      setErrors({}); // Clear any previous validation errors
    } catch (error) {
      toast({
        title: 'Error Sending Message',
        description: error.response?.data?.message || "Sorry, we couldn't send your message. Please try again later.",
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      console.error("Error submitting contact form:", error.response?.data || error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box bg="brand.accentOrange" minH="100vh" py={{ base: 8, md: 16 }}>
      <Center>
        <VStack spacing={8} w="100%" maxW={{ base: "90%", md: "xl" }}>
          <RouterLink to="/">
            <Image src="/logo.png" alt="Tees From The Past Logo" maxH={{ base: "100px", md: "120px" }} mb={0} />
          </RouterLink>
          <Box
            p={{ base: 6, md: 10 }}
            borderWidth={1}
            borderRadius="xl"
            boxShadow="2xl"
            bg="brand.paper"
            w="100%"
          >
            <VStack spacing={6} as="form" onSubmit={handleSubmit}>
              <Heading as="h1" size="xl" textAlign="center" color="brand.textDark" mb={2}>
                Get In Touch
              </Heading>
              <Text textAlign="center" color="brand.textDark" fontSize="lg" maxW="lg" mx="auto">
                Have a question, suggestion, or just want to say hi? We'd love to hear from you!
              </Text>

              <FormControl isRequired isInvalid={!!errors.name}>
                <FormLabel htmlFor="name" color="brand.textDark" fontWeight="semibold">Your Name</FormLabel>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  bg="white"
                  borderColor="brand.secondary"
                  focusBorderColor="brand.primaryDark"
                  _focus={{ boxShadow: 'outline' }}
                  size="lg"
                />
                <FormErrorMessage>{errors.name}</FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={!!errors.email}>
                <FormLabel htmlFor="email" color="brand.textDark" fontWeight="semibold">Your Email</FormLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  bg="white"
                  borderColor="brand.secondary"
                  focusBorderColor="brand.primaryDark"
                  _focus={{ boxShadow: 'outline' }}
                  size="lg"
                />
                <FormErrorMessage>{errors.email}</FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={!!errors.reason}>
                <FormLabel htmlFor="reason" color="brand.textDark" fontWeight="semibold">Reason for Contact</FormLabel>
                <Select
                  id="reason"
                  name="reason"
                  placeholder="-- Select a Reason --"
                  value={formData.reason}
                  onChange={handleChange}
                  bg="white"
                  borderColor="brand.secondary"
                  focusBorderColor="brand.primaryDark"
                  _focus={{ boxShadow: 'outline' }}
                  size="lg"
                >
                  {contactReasons.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </Select>
                <FormErrorMessage>{errors.reason}</FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={!!errors.message}>
                <FormLabel htmlFor="message" color="brand.textDark" fontWeight="semibold">Message</FormLabel>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Type your message here..."
                  value={formData.message}
                  onChange={handleChange}
                  bg="white"
                  borderColor="brand.secondary"
                  focusBorderColor="brand.primaryDark"
                  _focus={{ boxShadow: 'outline' }}
                  size="lg"
                  rows={6}
                />
                <FormErrorMessage>{errors.message}</FormErrorMessage>
              </FormControl>

              <Button
                type="submit"
                isLoading={isLoading}
                loadingText="Sending..."
                colorScheme="brandPrimary"
                w="full"
                size="lg"
                py={6}
                mt={4}
                borderRadius="full"
                leftIcon={<Icon as={FaPaperPlane} />}
                boxShadow="md"
                _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
              >
                Send Message
              </Button>
            </VStack>
          </Box>
          <ChakraLink as={RouterLink} to="/" color="brand.primaryDark" fontWeight="semibold" _hover={{ color: 'brand.primary' }} display="flex" alignItems="center">
            <Icon as={FaHome} mr={2} />
            Back to Home
          </ChakraLink>
        </VStack>
      </Center>
    </Box>
  );
};

export default ContactPage;
