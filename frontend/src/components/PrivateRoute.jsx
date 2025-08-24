// frontend/src/components/PrivateRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { VStack, Spinner, Text } from "@chakra-ui/react";
import { useAuth } from "../context/AuthProvider";

export default function PrivateRoute({ children }) {
  const { token, user, loadingAuth } = useAuth();
  const location = useLocation();

  // Still booting auth → show spinner
  if (loadingAuth) {
    return (
      <VStack minH="60vh" justify="center">
        <Spinner size="xl" thickness="4px" />
        <Text mt={3} color="whiteAlpha.800">Loading authentication…</Text>
      </VStack>
    );
  }

  // Not logged in → go to login (preserve where they came from)
  if (!token) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  // Logged in but not verified → send to check-email
  // We pass the email as a query param purely for UX (prefill/resend buttons if you add them).
  const isVerified = !!user?.emailVerifiedAt;
  if (!isVerified) {
    const qp = new URLSearchParams();
    if (user?.email) qp.set("email", user.email);
    qp.set("unverified", "1");
    return <Navigate to={`/check-email?${qp.toString()}`} replace />;
  }

  // All good
  return children;
}
