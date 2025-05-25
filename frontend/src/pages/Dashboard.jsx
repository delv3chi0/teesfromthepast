// frontend/src/pages/Dashboard.jsx

import { useState, useEffect } from 'react';
import { client } from '../api/client';
import { Box, Heading, Text, VStack, Divider, Button, useToast } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';

export default function Dashboard() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    console.log("Fetching profile...");
    client.get('/auth/profile')
      .then(response => {
        console.log("Profile data:", response.data);
        setProfile(response.data);
      })
      .catch(err => {
        console.error("Profile error:", err);
        setProfile(null);
      });
  }, []);

  const navigate = useNavigate();
  const toast = useToast();

  const handleGenerateCaption = () => {
    toast({
      title: "Feature coming soon!",
      description: "AI-generated captions are on the roadmap.",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box maxW="3xl" mx="auto" mt={8} px={4}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Heading size="lg">Dashboard</Heading>
        <Button size="sm" ml={4} onClick={() => navigate("/profile")}>My Profile</Button>
        <LogoutButton />
      </Box>

      {profile && <Text mb={4}>Welcome, {profile.username}!</Text>}

      <Divider my={6} />

      <VStack align="start" spacing={6}>
        {/* "Analytics Summary" Box REMOVED */}

        <Box>
          <Heading size="md">AI Tools</Heading>
          <Button mt={2} colorScheme="blue" onClick={handleGenerateCaption}>
            Try Caption Generator
          </Button>
        </Box>
      </VStack>
    </Box>
  );
}
