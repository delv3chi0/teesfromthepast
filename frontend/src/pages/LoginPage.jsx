// frontend/src/pages/LoginPage.jsx
import React, { useState } from "react";
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
  Flex,
} from "@chakra-ui/react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate, Link as RouterLink, useLocation } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import { client, setSessionHeader } from "../api/client";
import { useAuth } from "../context/AuthProvider";

// Accept a variety of backend shapes for the token
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

// Safely pull the session JTI the backend returns
function pickSessionJti(payload) {
  if (!payload) return null;
  return payload.sessionJti || payload.data?.sessionJti || null;
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

  // support both router-state "from" and query param ?redirect=
  const fromState = location.state?.from?.pathname;
  const redirectParam = new URLSearchParams(location.search).get("redirect");
  const redirectTo = redirectParam || fromState || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await client.post("/auth/login", { email, password });
      const token = pickToken(res.data);
      const jti = pickSessionJti(res.data);
      if (!token) throw new Error("Login succeeded but no token was returned.");

      // Store auth token using your auth context
      setSession(token);

      // ALSO set the X-Session-ID header so the server can update lastSeen/client hints
      if (jti) setSessionHeader(jti);

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
          {/* Restored logo */}
          <RouterLink to="/">
            <Image
              src="/logo.png"
              alt="Tees From The Past Logo"
              maxH={{ base: "70px", md: "100px" }}
              mb={2}
              objectFit="contain"
              htmlWidth="auto"
              htmlHeight="auto"
            />
          </RouterLink>

          <Box
            as="form"
            onSubmit={handleSubmit}
            p={{ base: 6, md: 10 }}
            layerStyle="cardBlue"
            w="100%"
          >
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
                Don't have an account?{" "}
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
