// frontend/src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Heading, Input, Button, Text, HStack, useToast, VStack, Icon, FormControl, FormLabel, Spinner } from '@chakra-ui/react'; // Added FormControl, FormLabel
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaSave, FaEdit, FaTimes, FaTachometerAlt } from 'react-icons/fa';

export default function Profile() {
  const { user, logout, setUser: setAuthUser } = useAuth(); // Get setUser from AuthContext to update global state
  const [profileData, setProfileData] = useState(null);
  const [form, setForm] = useState({
    username: '', email: '', firstName: '', lastName: '',
  });
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Add saving state
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (user) {
      setProfileData(user);
      setForm({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      });
    } else {
        // This case might indicate user is not fully loaded yet or an issue.
        // Consider a loading state or redirect if user is definitively null after initial AuthProvider load.
    }
  }, [user]);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updateData = {
        username: form.username,
        firstName: form.firstName,
        lastName: form.lastName,
        // Email is not editable in this form, so we don't send it
        // If you add password change, include it conditionally:
        // password: form.newPassword ? form.newPassword : undefined, 
    };
    // Filter out any unchanged fields compared to profileData to send only modified data
    // Or just send all editable fields as the backend handles `value || existing_value`
    
    try {
        const { data: updatedProfileFromServer } = await client.put('/auth/profile', updateData);
        setAuthUser(updatedProfileFromServer); // Update global user state
        setProfileData(updatedProfileFromServer); 
        setForm({                   
            username: updatedProfileFromServer.username || '',
            email: updatedProfileFromServer.email || '', // Keep email in sync
            firstName: updatedProfileFromServer.firstName || '',
            lastName: updatedProfileFromServer.lastName || '',
        });
        setEditing(false);
        toast({ title: "Profile Updated", status: "success", duration: 3000, isClosable: true });
    } catch (error) {
        console.error("Error saving profile:", error);
        const errorMessage = error.response?.data?.message || "Could not save profile.";
        const errorDetails = error.response?.data?.errors ? 
            Object.values(error.response.data.errors).map(e => e.message).join(', ') : '';
        toast({ title: "Error Saving Profile", description: `${errorMessage} ${errorDetails ? `Details: ${errorDetails}` : ''}`, status: "error", duration: 5000, isClosable: true});
        if (error.response?.status === 401) { logout(); navigate('/login');}
    } finally {
        setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profileData) {
        setForm({
          username: profileData.username || '', email: profileData.email || '',
          firstName: profileData.firstName || '', lastName: profileData.lastName || '',
        });
    }
    setEditing(false);
  };

  if (!profileData) return <Box textAlign="center" mt={20}><Spinner size="xl" color="brand.primary"/><Text mt={4} color="brand.textLight">Loading Profile…</Text></Box>;

  return (
    <Box 
        maxW="lg" 
        mt={{base: 6, md: 8}} 
        p={{base: 6, md: 8}} 
        borderWidth="1px" 
        borderRadius="xl" 
        shadow="xl" 
        bg="brand.paper" // White card on orange background
        mx="auto" // Center the card on the page
    >
      <Heading as="h1" size="xl" mb={8} textAlign="center" color="brand.textDark">
        Your Profile
      </Heading>

      <VStack spacing={5} as="form" onSubmit={(e) => { e.preventDefault(); if(editing) handleSave(); }}>
        <FormControl id="username">
            <FormLabel fontWeight="bold" color="brand.textDark">Username:</FormLabel>
            <Input name="username" placeholder="Username" value={form.username} onChange={handleChange} isDisabled={!editing} bg="white" />
        </FormControl>
        <FormControl id="email">
            <FormLabel fontWeight="bold" color="brand.textDark">Email:</FormLabel>
            <Input name="email" placeholder="Email" value={form.email} isReadOnly bg="gray.100" />
        </FormControl>
        <FormControl id="firstName">
            <FormLabel fontWeight="bold" color="brand.textDark">First Name:</FormLabel>
            <Input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} isDisabled={!editing} bg="white" />
        </FormControl>
        <FormControl id="lastName">
            <FormLabel fontWeight="bold" color="brand.textDark">Last Name:</FormLabel>
            <Input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} isDisabled={!editing} bg="white" />
        </FormControl>

        <HStack spacing={4} mt={6} w="100%">
          {!editing ? (
            <Button 
                bg="brand.primary" color="brand.textLight" _hover={{bg: "brand.primaryLight"}}
                onClick={() => setEditing(true)} 
                leftIcon={<Icon as={FaEdit}/>}
                borderRadius="full" px={6} size="lg" flex={1} boxShadow="md"
            >Edit Profile</Button>
          ) : (
            <>
              <Button 
                bg="brand.accentYellow" color="brand.textDark" _hover={{bg: "brand.accentYellowHover"}}
                onClick={handleSave} 
                leftIcon={<Icon as={FaSave}/>}
                borderRadius="full" px={6} size="lg" flex={1} type="submit" isLoading={isSaving} loadingText="Saving..." boxShadow="md"
              >Save Changes</Button>
              <Button 
                variant="outline" onClick={handleCancel} leftIcon={<Icon as={FaTimes}/>}
                borderRadius="full" px={6} size="lg" flex={1}
                borderColor="brand.secondary" color="brand.secondary" _hover={{bg:"gray.100"}}
              >Cancel</Button>
            </>
          )}
        </HStack>
        <Button 
            variant="link" // Changed to link style for less emphasis
            onClick={() => navigate('/dashboard')} 
            leftIcon={<Icon as={FaTachometerAlt} />}
            mt={4}
            color="brand.primaryDark"
            size="lg"
        >Dashboard</Button>
      </VStack>
    </Box>
  );
}
