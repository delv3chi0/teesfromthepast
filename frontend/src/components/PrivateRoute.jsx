// frontend/src/components/PrivateRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { VStack, Spinner, Text } from "@chakra-ui/react";
import { useAuth } from "../context/AuthProvider";

export default function PrivateRoute({ children }) {
  const { token, loadingAuth } = useAuth();
  const location = useLocation();

  if (loadingAuth) {
    return (
      <VStack minH="60vh" justify="center">
        <Spinner size="xl" thickness="4px" />
        <Text mt={3} color="whiteAlpha.800">Loading authentication…</Text>
      </VStack>
    );
  }
  if (!token) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return children;
}
