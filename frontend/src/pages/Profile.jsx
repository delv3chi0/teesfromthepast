// frontend/src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Heading, Input, Button, Text, HStack, useToast, VStack, Icon } from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider'; // Added useAuth
import { FaSave, FaEdit, FaTimes, FaTachometerAlt } from 'react-icons/fa'; // Icons

export default function Profile() {
  const { user, logout } = useAuth(); // Get user for initial state & logout for 401s
  const [profileData, setProfileData] = useState(null); // Renamed to avoid conflict with form
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
    // User data is now primarily managed by AuthProvider.
    // We can use the 'user' from useAuth() directly if it's always up-to-date,
    // or re-fetch specifically for this page if needed (but AuthProvider already fetches on load/login)
    if (user) {
      setProfileData(user); // Use user data from AuthContext
      setForm({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      });
    } else {
      // If user becomes null (e.g. token removed by AuthProvider), fetch might fail or redirect
      client.get('/auth/profile').then(({ data }) => {
        setProfileData(data);
        setForm({ /* ... set form ... */ });
      }).catch(err => {
          console.error("Error fetching profile for edit:", err);
          if (err.response?.status === 401) { logout(); navigate('/login'); return; }
          toast({ title: "Error", description: "Could not load profile data.", status: "error", /*...*/ });
      });
    }
  }, [user, toast, logout, navigate]); // Depend on user from AuthContext

  const handleChange = (e) => { /* ... remains same ... */ };
  const handleSave = async () => { /* ... remains same, ensure updateData has correct fields ... */ };
  const handleCancel = () => { /* ... remains same, but use profileData ... */ };
  // Ensure handleSave and handleCancel are correct from your previous working version.
  // I'll paste the full logic again here for completeness with styling.

  const handleSaveFull = async () => {
    const updateData = {
        username: form.username,
        firstName: form.firstName,
        lastName: form.lastName,
        // Only include email if it's editable and changed
        // email: (form.email !== profileData.email) ? form.email : undefined,
    };
    // Filter out undefined fields, so backend doesn't try to set them to null
    const cleanUpdateData = Object.fromEntries(Object.entries(updateData).filter(([_, v]) => v !== undefined));


    try {
        const { data: updatedProfileFromServer } = await client.put('/auth/profile', cleanUpdateData);
        // IMPORTANT: Update the user in AuthContext so it's fresh everywhere
        // This assumes your AuthProvider exposes 'setUser' or a similar update function
        // For now, we'll update local state and rely on AuthProvider's next profile fetch
        // or a full refresh to get AuthContext fully updated.
        // A better way: const { user, setUser } = useAuth(); then call setUser(updatedProfileFromServer);
        // I added setUser to useAuth in one of the AuthProvider versions, let's assume it's there.
        // const { setUser: setAuthUser } = useAuth(); setAuthUser(updatedProfileFromServer)

        setProfileData(updatedProfileFromServer); 
        setForm({                   
            username: updatedProfileFromServer.username || '',
            email: updatedProfileFromServer.email || '',
            firstName: updatedProfileFromServer.firstName || '',
            lastName: updatedProfileFromServer.lastName || '',
        });
        setEditing(false);
        toast({ title: "Profile Updated", status: "success", /*...*/ });
    } catch (error) { /* ... error handling from your previous version ... */ }
  };

  const handleCancelFull = () => {
    if (profileData) {
        setForm({
          username: profileData.username || '',
          email: profileData.email || '',
          firstName: profileData.firstName || '',
          lastName: profileData.lastName || '',
        });
    }
    setEditing(false);
  };


  if (!profileData) return (
    <Box textAlign="center" mt={20}>
      <Spinner size="xl" /><Text mt={4}>Loading Profile…</Text>
    </Box>
  );

  return (
    // Outermost box for profile, on orange background, styled as a card
    <Box 
        maxW="lg" // Slightly wider than 'md' for more space
        mt={{base: 6, md: 8}} 
        p={{base:4, md:8}} // Responsive padding
        borderWidth="1px" 
        borderRadius="xl" // More rounded
        shadow="xl" // Enhanced shadow
        bg="brand.paper" // White card background
        mx="auto" // Center the card on the page
        // Removed mx="auto" from my earlier suggestion as this component is a child of MainLayout
        // If MainLayout's <Box as="main"> doesn't have mx="auto", this Profile card can have it.
        // Let's assume MainLayout's content area is full width, so this card is centered.
    >
      <Heading as="h1" size="xl" mb={8} textAlign="center" color="brand.textDark"> {/* Page Title */}
        Your Profile
      </Heading>

      <VStack spacing={5} as="form" onSubmit={(e) => { e.preventDefault(); if(editing) handleSaveFull(); }}> {/* Make VStack a form */}
        <Box w="100%">
            <Text fontWeight="bold" mb={1} color="brand.textDark">Username:</Text>
            <Input name="username" placeholder="Username" value={form.username} onChange={handleChange} isDisabled={!editing} bg="white" />
        </Box>
        <Box w="100%">
            <Text fontWeight="bold" mb={1} color="brand.textDark">Email:</Text>
            <Input name="email" placeholder="Email" value={form.email} isReadOnly bg="gray.100" />
        </Box>
        <Box w="100%">
            <Text fontWeight="bold" mb={1} color="brand.textDark">First Name:</Text>
            <Input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} isDisabled={!editing} bg="white" />
        </Box>
        <Box w="100%">
            <Text fontWeight="bold" mb={1} color="brand.textDark">Last Name:</Text>
            <Input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} isDisabled={!editing} bg="white" />
        </Box>
        {/* Password change could be a separate section/modal for better UX */}
        {/* {editing && (
            <Box w="100%">
                <Text fontWeight="bold" mb={1} color="brand.textDark">New Password (optional):</Text>
                <Input name="password" type="password" placeholder="Leave blank to keep current" onChange={handleChange} bg="white"/>
            </Box>
        )}
        */}

        <HStack spacing={4} mt={6} w="100%">
          {!editing ? (
            <Button 
                colorScheme="brandPrimary" // Dark brown button
                onClick={() => setEditing(true)} 
                leftIcon={<Icon as={FaEdit}/>}
                borderRadius="full"
                px={6} size="lg" flex={1}
            >Edit Profile</Button>
          ) : (
            <>
              <Button 
                bg="brand.accentYellow" 
                color="brand.textDark"
                _hover={{bg: "brand.accentYellowHover"}}
                onClick={handleSaveFull} 
                leftIcon={<Icon as={FaSave}/>}
                borderRadius="full"
                px={6} size="lg" flex={1} type="submit"
              >Save Changes</Button>
              <Button 
                variant="outline" 
                onClick={handleCancelFull} 
                leftIcon={<Icon as={FaTimes}/>}
                borderRadius="full"
                px={6} size="lg" flex={1}
                borderColor="brand.secondary" color="brand.secondary"
              >Cancel</Button>
            </>
          )}
        </HStack>
        <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')} 
            leftIcon={<Icon as={FaTachometerAlt} />}
            mt={4}
            color="brand.primaryDark"
        >Dashboard</Button>
      </VStack>
    </Box>
  );
}
