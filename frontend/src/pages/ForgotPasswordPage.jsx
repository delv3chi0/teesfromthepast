import React, { useEffect, useState } from "react";
import {
  Box, Button, FormControl, FormLabel, Input, Heading, Text,
  VStack, useToast, Link as ChakraLink, Image,
  Alert, AlertIcon, AlertTitle, AlertDescription, Flex, Container
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { client } from "../api/client";
import Footer from "../components/Footer.jsx";
import HCaptcha from "@hcaptcha/react-hcaptcha";

const SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY;

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageStatus, setMessageStatus] = useState("info");
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const toast = useToast();

  useEffect(() => {
    const probe = async () => {
      try {
        const { data } = await client.get("/auth/captcha-check", {
          params: { context: "reset", email },
        });
        setShowCaptcha(!!data?.needCaptcha);
      } catch {}
    };
    if (email) probe();
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        status: "error",
        isClosable: true,
      });
      setIsLoading(false);
      return;
    }

    try {
      await client.post("/auth/request-password-reset", {
        email,
        hcaptchaToken: showCaptcha ? captchaToken : undefined,
      });
      setMessage(
        "If an account with that email address exists, a password reset link has been sent. Please check your inbox (and spam folder)."
      );
      setMessageStatus("success");
      setEmail("");
    } catch (error) {
      const errorData = error?.response?.data;
      const needCaptcha = !!errorData?.needCaptcha || error?.response?.status === 428;
      const captchaFailed = !!errorData?.captchaFailed;
      
      if (needCaptcha) {
        setShowCaptcha(true);
        // Only reset captcha token if the backend specifically indicates captcha verification failed
        if (captchaFailed) {
          setCaptchaToken(null);
          setCaptchaKey((k) => k + 1);
        }
      }
      setMessage(
        "If an account with that email address exists, a password reset link has been sent. If you continue to have trouble, please contact support."
      );
      setMessageStatus("info");
      console.error("Error requesting password reset:", errorData?.message || error.message);
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
            p={{ base: 6, md: 10 }}
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
                  <form onSubmit={handleSubmit} style={{ width: "100%" }}>
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

                      {showCaptcha && (
                        <HCaptcha
                          key={captchaKey}
                          sitekey={SITE_KEY}
                          onVerify={setCaptchaToken}
                          onExpire={() => setCaptchaToken(null)}
                        />
                      )}

                      <Button
                        type="submit"
                        isLoading={isLoading}
                        loadingText="Sending..."
                        w="100%"
                        size="lg"
                        mt={2}
                        colorScheme="brandAccentOrange"
                        isDisabled={showCaptcha && !captchaToken}
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
                  bg={messageStatus === "success" ? "green.900" : "blue.900"}
                  borderWidth="1px"
                  borderColor={messageStatus === "success" ? "green.500" : "blue.500"}
                  borderRadius="lg"
                >
                  <AlertIcon boxSize="40px" mr={0} color={messageStatus === "success" ? "green.300" : "blue.300"} />
                  <AlertTitle mt={4} mb={2} fontSize="lg" color="white">
                    {messageStatus === "success" ? "Request Sent!" : "Check Your Email"}
                  </AlertTitle>
                  <AlertDescription maxWidth="sm" color="whiteAlpha.900">
                    {message}
                  </AlertDescription>
                </Alert>
              )}

              <Text pt={4} textAlign="center" color="brand.textMuted">
                Remember your password?{" "}
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
