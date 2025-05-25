// frontend/src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Heading, Input, Button, Text, HStack, useToast } from '@chakra-ui/react'; // Added useToast
import { client } from '../api/client';
import LogoutButton from '../components/LogoutButton';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    username: '',      // ADDED username
    email: '',         // ADDED email for display, but it won't be part of 'form' for submission unless editable
    firstName: '',
    lastName: '',
    // instagramHandle and tiktokHandle removed
  });
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  const toast = useToast(); // Initialize useToast

  // Load profile data once
  useEffect(() => {
    client.get('/auth/profile').then(({ data }) => {
      setProfile(data);
      setForm({
        username: data.username || '',         // ADDED username
        email: data.email || '',               // Store email for display
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        // instagramHandle and tiktokHandle removed
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
  }, [toast]); // Added toast to dependency array

  // Handle input change
  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  // Save or cancel
  const handleSave = async () => {
    // Prepare only the data that should be updated
    const updateData = {
        username: form.username,
        firstName: form.firstName,
        lastName: form.lastName,
        // Do not send email if it's not meant to be editable from this form
        // If email IS editable, add it here: email: form.email
    };

    try {
        const { data: updatedProfile } = await client.put('/auth/profile', updateData);
        setProfile(updatedProfile); // Update profile state with response from server
        setForm({                   // Update form state as well
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
    setForm({
      username: profile.username || '',       // ADDED username
      email: profile.email || '',             // Reset email for display
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      // instagramHandle and tiktokHandle removed
    });
    setEditing(false);
  };

  if (!profile) return <Text>Loading…</Text>;

  return (
    <Box maxW="md" mx="auto" mt={8} p={6} borderWidth="1px" borderRadius="md">
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
        name="email" // Name added, though it's read-only for now
        placeholder="Email"
        mb={3} // Reduced margin for consistent spacing
        value={form.email} // Display email from form state
        isReadOnly // Email is not editable in this version
        // If you want email to be editable:
        // onChange={handleChange}
        // isDisabled={!editing}
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
        mb={6} // Keep last input margin for overall spacing
        value={form.lastName}
        onChange={handleChange}
        isDisabled={!editing}
      />

      {/* Instagram and TikTok input fields removed */}

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

      <LogoutButton />
    </Box>
  );
}
