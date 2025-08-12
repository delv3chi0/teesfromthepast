// frontend/src/pages/LoginPage.jsx
import React, { useState } from "react";
import {
  Box, Button, FormControl, FormLabel, Input, Heading, VStack, useToast, InputGroup, InputRightElement, IconButton, Text
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { useLocation, useNavigate, Link as RouterLink } from "react-router-dom";
import { client } from "../api/client";
import { useAuth } from "../context/AuthProvider";

function pickToken(payload) {
  // Accept a variety of shapes from backend
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
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = new URLSearchParams(location.search).get("redirect") || "/shop";

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await client.post("/auth/login", { email, password: pw });
      const token = pickToken(res.data);
      if (!token) throw new Error("No token returned from server");
      setSession(token);
      toast({ title: "Welcome back!", status: "success", duration: 2000 });
      navigate(redirect, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Login failed";
      toast({ title: "Login Failed", description: msg, status: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <VStack minH="80vh" justify="center" px={4}>
      <Box w="100%" maxW="420px" bg="brand.paper" p={8} rounded="xl" boxShadow="lg">
        <Heading mb={6} textAlign="center">Welcome back</Heading>
        <form onSubmit={submit}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Email Address</FormLabel>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Password</FormLabel>
              <InputGroup>
                <Input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
                <InputRightElement>
                  <IconButton
                    aria-label={show ? "Hide password" : "Show password"}
                    icon={show ? <ViewOffIcon /> : <ViewIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={() => setShow((s) => !s)}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>
            <Button type="submit" colorScheme="orange" isLoading={busy}>
              Log In
            </Button>
            <Text fontSize="sm" color="whiteAlpha.700">
              Don’t have an account?{" "}
              <RouterLink to="/register" style={{ color: "#F6AD55" }}>
                Sign up now
              </RouterLink>
            </Text>
          </VStack>
        </form>
      </Box>
    </VStack>
  );
}
