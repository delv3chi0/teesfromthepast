import React, { useEffect, useState } from 'react';
import { Box, Heading, Text, Button, Input, VStack, useToast } from '@chakra-ui/react';
import { client } from '../api/client';
import { useNavigate } from 'react-router-dom';

export default function VerifyEmailPage() {
  const qs = new URLSearchParams(location.search);
  const [email, setEmail] = useState(qs.get('email') || '');
  const [token, setToken] = useState(qs.get('token') || '');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => { if (email && token) handleVerify(); /* eslint-disable-next-line */}, []);

  async function handleVerify() {
    if (!email || !token) return;
    setLoading(true);
    try {
      await client.post('/auth/verify-email', { email, token });
      toast({ title: 'Email verified!', status: 'success' });
      navigate('/login');
    } catch (e) {
      toast({ title: 'Verification failed', description: e?.response?.data?.message || 'Try again.', status: 'error' });
    } finally { setLoading(false); }
  }

  return (
    <Box p={8}>
      <Heading size="lg" mb={4}>Verify your email</Heading>
      <VStack align="stretch" spacing={3} maxW="md">
        <Input placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <Input placeholder="Token" value={token} onChange={(e)=>setToken(e.target.value)} />
        <Button onClick={handleVerify} isLoading={loading}>Verify</Button>
      </VStack>
      <Text mt={6} color="gray.400">If you came here from the email link, the fields fill automatically.</Text>
    </Box>
  );
}
