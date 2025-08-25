import React, { useState } from "react";
import {
  Box, Button, Center, FormControl, FormLabel, FormErrorMessage, Input, Heading, Text,
  Textarea, Select, VStack, useToast, Image, Icon, Link as ChakraLink, Alert, AlertIcon, AlertTitle, AlertDescription
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { FaPaperPlane, FaHome, FaCheckCircle } from "react-icons/fa";
import { client } from "../api/client";
import HCaptcha from "@hcaptcha/react-hcaptcha";

const SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY;

const ThemedInput = (props) => (<Input bg="brand.primaryDark" borderColor="whiteAlpha.300" _hover={{ borderColor: "whiteAlpha.400" }} focusBorderColor="brand.accentYellow" size="lg" {...props} />);
const ThemedTextarea = (props) => (<Textarea bg="brand.primaryDark" borderColor="whiteAlpha.300" _hover={{ borderColor: "whiteAlpha.400" }} focusBorderColor="brand.accentYellow" size="lg" {...props} />);
const ThemedSelect = (props) => (<Select bg="brand.primaryDark" borderColor="whiteAlpha.300" _hover={{ borderColor: "whiteAlpha.400" }} focusBorderColor="brand.accentYellow" size="lg" {...props} />);

const ContactPage = () => {
  const [formData, setFormData] = useState({ name: "", email: "", reason: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const toast = useToast();

  const contactReasons = ["General Inquiry", "Technical Support / Troubleshooting", "Feature Request / Site Improvement Suggestion", "Question about an Order", "Partnership / Collaboration", "Other"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) { setErrors((prev) => ({ ...prev, [name]: null })); }
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
    if (!captchaToken) {
      toast({ title: "Captcha Required", description: "Please complete the CAPTCHA.", status: "error", isClosable: true });
      return;
    }
    setIsLoading(true);
    try {
      const response = await client.post("/forms/contact", { ...formData, hcaptchaToken: captchaToken });
      toast({ title: "Message Sent!", description: response.data.message || "We'll get back to you soon.", status: "success", isClosable: true });
      setIsSubmitted(true);
    } catch (error) {
      toast({ title: "Error Sending Message", description: error.response?.data?.message || "Sorry, we couldn't send your message.", status: "error", isClosable: true });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", reason: "", message: "" });
    setErrors({});
    setIsSubmitted(false);
    setCaptchaToken(null);
  };

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
                <Button onClick={resetForm} bg="brand.accentYellow" color="brand.textDark" _hover={{ bg: "brand.accentYellowHover" }}>Send Another Message</Button>
              </VStack>
            ) : (
              <VStack spacing={6} as="form" onSubmit={handleSubmit}>
                <Heading as="h1" size="xl" textAlign="center" color="brand.textLight" mb={2}>Get In Touch</Heading>
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
                    {contactReasons.map((reason) => (<option key={reason} value={reason}>{reason}</option>))}
                  </ThemedSelect>
                  <FormErrorMessage>{errors.reason}</FormErrorMessage>
                </FormControl>

                <FormControl isRequired isInvalid={!!errors.message}>
                  <FormLabel htmlFor="message" color="whiteAlpha.800" fontWeight="semibold">Message</FormLabel>
                  <ThemedTextarea id="message" name="message" placeholder="Type your message here..." value={formData.message} onChange={handleChange} rows={6} />
                  <FormErrorMessage>{errors.message}</FormErrorMessage>
                </FormControl>

                <HCaptcha sitekey={SITE_KEY} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />

                <Button
                  type="submit"
                  isLoading={isLoading}
                  loadingText="Sending..."
                  w="full"
                  size="lg"
                  mt={2}
                  bg="brand.accentOrange"
                  color="white"
                  _hover={{ bg: "brand.accentOrangeHover" }}
                  leftIcon={<Icon as={FaPaperPlane} />}
                  isDisabled={!captchaToken}
                >
                  Send Message
                </Button>
              </VStack>
            )}
          </Box>
          <ChakraLink as={RouterLink} to="/" color="brand.accentYellow" fontWeight="semibold" _hover={{ textDecoration: "underline" }} display="flex" alignItems="center">
            <Icon as={FaHome} mr={2} />
            Back to Home
          </ChakraLink>
        </VStack>
      </Center>
    </Box>
  );
};

export default ContactPage;
