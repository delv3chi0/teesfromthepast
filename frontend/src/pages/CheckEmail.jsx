// frontend/src/pages/CheckEmail.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Box, Heading, Text, Button, HStack, useToast, Icon } from '@chakra-ui/react';
import { client } from '../api/client';
import { MdMarkEmailUnread, MdRefresh } from 'react-icons/md';

export default function CheckEmail() {
  const qs = new URLSearchParams(location.search);
  const initialEmail = qs.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const sentOnce = useRef(false);
  const toast = useToast();

  async function resend() {
    if (!email) {
      toast({ title: 'No email on file', description: 'Log in again to retrieve your email.', status: 'warning' });
      return;
    }
    if (sending) return;
    setSending(true);
    try {
      await client.post('/auth/resend-verification', { email });
      toast({ title: 'Verification email sent', description: `Check ${email}`, status: 'success' });
    } catch (e) {
      toast({ title: 'Could not send email', description: e?.response?.data?.message || 'Try again shortly.', status: 'error' });
    } finally {
      setSending(false);
    }
  }

  // Auto-send once when we land here with an email in the query
  useEffect(() => {
    if (email && !sentOnce.current) {
      sentOnce.current = true;
      resend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  return (
    <Box py={16} px={6} maxW="3xl" mx="auto">
      <Heading size="lg" mb={3}>CHECK YOUR EMAIL.</Heading>
      <Text color="whiteAlpha.800" mb={2}>
        We sent you a verification link. Click it to activate your account.
      </Text>
      <Text color="whiteAlpha.700" mb={8}>
        Didn’t get it? Check your spam folder, or click “Resend verification”.
      </Text>
      <HStack spacing={4}>
        <Button
          onClick={resend}
          isLoading={sending}
          leftIcon={<Icon as={MdMarkEmailUnread} />}
          bg="brand.accentOrange"
          color="white"
          _hover={{ bg: 'brand.accentOrangeHover' }}
        >
          Resend verification
        </Button>
        <Button
          onClick={() => location.reload()}
          leftIcon={<Icon as={MdRefresh} />}
          variant="outline"
        >
          I’ve verified – refresh
        </Button>
      </HStack>
      <Text mt={8} fontSize="sm" color="whiteAlpha.600">
        Tip: the link opens a page at <code>/verify-email</code>. If the token is valid, you’ll be redirected to login.
      </Text>
    </Box>
  );
}
