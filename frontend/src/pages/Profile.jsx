// frontend/src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Heading, Input, Button, Text, HStack, useToast } from '@chakra-ui/react';
import { client } from '../api/client';
// LogoutButton import is no longer needed if it's only used here and now removed
// import LogoutButton from '../components/LogoutButton'; 

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    username: '',
    email: '', 
    firstName: '',
    lastName: '',
  });
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    client.get('/auth/profile').then(({ data }) => {
      setProfile(data);
      setForm({
        username: data.username || '',
        email: data.email || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
      });
    }).catch(err => {
        console.error("Error fetching profile for edit:", err);
        toast({
            title: "Error",
            description: "Could not load profile data.",
            status: "error",
            duration: 3000,
            isClosable: true,
        });
    });
  }, [toast]);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    const updateData = {
        username: form.username,
        firstName: form.firstName,
        lastName: form.lastName,
    };

    try {
        const { data: updatedProfile } = await client.put('/auth/profile', updateData);
        setProfile(updatedProfile); 
        setForm({                   
            username: updatedProfile.username || '',
            email: updatedProfile.email || '',
            firstName: updatedProfile.firstName || '',
            lastName: updatedProfile.lastName || '',
        });
        setEditing(false);
        toast({
            title: "Profile Updated",
            status: "success",
            duration: 3000,
            isClosable: true,
        });
    } catch (error) {
        console.error("Error saving profile:", error);
        const errorMessage = error.response?.data?.message || "Could not save profile.";
        const errorDetails = error.response?.data?.errors ? 
            Object.values(error.response.data.errors).map(e => e.message).join(', ') : '';
        
        toast({
            title: "Error Saving Profile",
            description: `${errorMessage} ${errorDetails ? `Details: ${errorDetails}` : ''}`,
            status: "error",
            duration: 5000,
            isClosable: true,
        });
    }
  };

  const handleCancel = () => {
    if (profile) {
        setForm({
          username: profile.username || '',
          email: profile.email || '',
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
        });
    }
    setEditing(false);
  };

  if (!profile) return <Text>Loading…</Text>;

  return (
    <Box maxW="md" /* mx="auto" removed for left alignment */ mt={8} p={6} borderWidth="1px" borderRadius="md">
      <Heading size="lg" mb={6}>Your Profile</Heading>

      <Text fontWeight="bold" mt={4}>Username:</Text>
      <Input
        name="username"
        placeholder="Username"
        mb={3}
        value={form.username}
        onChange={handleChange}
        isDisabled={!editing}
      />
      
      <Text fontWeight="bold" mt={4}>Email:</Text>
      <Input
        name="email"
        placeholder="Email"
        mb={3}
        value={form.email}
        isReadOnly 
      />

      <Text fontWeight="bold" mt={4}>First Name:</Text>
      <Input
        name="firstName"
        placeholder="First Name"
        mb={3}
        value={form.firstName}
        onChange={handleChange}
        isDisabled={!editing}
      />

      <Text fontWeight="bold" mt={4}>Last Name:</Text>
      <Input
        name="lastName"
        placeholder="Last Name"
        mb={6}
        value={form.lastName}
        onChange={handleChange}
        isDisabled={!editing}
      />

      <HStack spacing={4} mb={4}>
        {!editing ? (
          <Button colorScheme="blue" onClick={() => setEditing(true)}>Edit</Button>
        ) : (
          <>
            <Button colorScheme="green" onClick={handleSave}>Save</Button>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          </>
        )}
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>Dashboard</Button>
      </HStack>

      {/* <LogoutButton /> REMOVED THIS LINE */}
    </Box>
  );
}
