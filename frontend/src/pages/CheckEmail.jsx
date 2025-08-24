import React from 'react';
import { Box, Heading, Text } from '@chakra-ui/react';

export default function CheckEmail() {
  return (
    <Box p={8}>
      <Heading size="lg" mb={2}>Check your email</Heading>
      <Text>We sent you a verification link. Click it to activate your account.</Text>
      <Text mt={2} color="gray.400">Didn’t get it? Check your spam folder, or click “Resend verification” from your profile.</Text>
    </Box>
  );
}
