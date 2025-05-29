// frontend/src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Box, Heading, Input, Button, Text, HStack, useToast, VStack, Icon, 
    FormControl, FormLabel, Spinner // Ensure FormControl and FormLabel are imported
} from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaSave, FaEdit, FaTimes, FaTachometerAlt } from 'react-icons/fa';

export default function Profile() {
  const { user, logout, setUser: setAuthUser } = useAuth(); // Get user and setUser for global state update
  const [profileData, setProfileData] = useState(null); 
  const [form, setForm] = useState({
    username: '',
    email: '', 
    firstName: '',
    lastName: '',
    // newPassword: '', // Optional: For password change
  });
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
        // newPassword: '', // Reset password field
      });
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
        // email is not editable in this form
    };
    // if (form.newPassword) { // If you add password change functionality
    //   updateData.password = form.newPassword;
    // }
    
    try {
        const { data: updatedProfileFromServer } = await client.put('/auth/profile', updateData);
        if (setAuthUser) { // Check if setAuthUser exists
            setAuthUser(updatedProfileFromServer); // Update global user state
        }
        setProfileData(updatedProfileFromServer); 
        setForm({                   
            username: updatedProfileFromServer.username || '',
            email: updatedProfileFromServer.email || '',
            firstName: updatedProfileFromServer.firstName || '',
            lastName: updatedProfileFromServer.lastName || '',
            // newPassword: '',
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
          // newPassword: '',
        });
    }
    setEditing(false);
  };

  if (!profileData && !user) { // If no profileData (initial load) AND no user from context yet
      return (
        <Box textAlign="center" mt={20}>
            <Spinner size="xl" color="brand.primary"/><Text mt={4} color="brand.textLight">Loading Profile…</Text>
        </Box>
      );
  }
  // If profileData is still null but user context exists, means useEffect is setting it up
  if (!profileData && user) {
      // This state ensures that if 'user' from context updates, the form initializes correctly.
      // The useEffect will populate profileData and form state.
      // Could also show a brief specific loader here if the delay is noticeable.
      return <Box textAlign="center" mt={20}><Spinner size="xl" color="brand.primary"/><Text mt={4} color="brand.textLight">Initializing Profile Form…</Text></Box>;
  }
  if (!profileData) return null; // Fallback if something unexpected happens

  return (
    <Box 
        maxW="lg" 
        mt={{base: 6, md: 8}} 
        p={{base: 6, md: 8}} // Increased padding for better spacing
        borderWidth="1px" 
        borderRadius="xl" 
        shadow="xl" 
        bg="brand.paper" // This makes the profile area a "white card" on the orange background
        mx="auto" // Center the card
    >
      <Heading as="h1" size="xl" mb={8} textAlign="center" color="brand.textDark"> 
        Your Profile
      </Heading>

      <VStack spacing={6} as="form" onSubmit={(e) => { e.preventDefault(); if(editing) handleSave(); }}> {/* Increased spacing */}
        <FormControl id="username">
            <FormLabel fontWeight="bold" color="brand.textDark">Username:</FormLabel>
            <Input name="username" placeholder="Username" value={form.username} onChange={handleChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark"/>
        </FormControl>
        <FormControl id="email">
            <FormLabel fontWeight="bold" color="brand.textDark">Email:</FormLabel>
            <Input name="email" placeholder="Email" value={form.email} isReadOnly bg="gray.100" borderColor="brand.secondary"/>
        </FormControl>
        <FormControl id="firstName">
            <FormLabel fontWeight="bold" color="brand.textDark">First Name:</FormLabel>
            <Input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark"/>
        </FormControl>
        <FormControl id="lastName">
            <FormLabel fontWeight="bold" color="brand.textDark">Last Name:</FormLabel>
            <Input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark"/>
        </FormControl>

        {/* Add password change fields here if/when you implement that feature */}

        <HStack spacing={4} mt={8} w="100%"> {/* Increased top margin */}
          {!editing ? (
            <Button 
                bg="brand.primary" color="brand.textLight" _hover={{bg: "brand.primaryLight"}}
                onClick={() => setEditing(true)} 
                leftIcon={<Icon as={FaEdit}/>}
                borderRadius="full" px={8} size="lg" flex={1} boxShadow="md"
            >Edit Profile</Button>
          ) : (
            <>
              <Button 
                bg="brand.accentYellow" color="brand.textDark" _hover={{bg: "brand.accentYellowHover"}}
                onClick={handleSave} 
                leftIcon={<Icon as={FaSave}/>}
                borderRadius="full" px={8} size="lg" flex={1} type="submit" isLoading={isSaving} loadingText="Saving..." boxShadow="md"
              >Save Changes</Button>
              <Button 
                variant="outline" onClick={handleCancel} leftIcon={<Icon as={FaTimes}/>}
                borderRadius="full" px={8} size="lg" flex={1}
                borderColor="brand.secondary" color="brand.secondary" _hover={{bg:"blackAlpha.50"}} // Subtle hover for outline
              >Cancel</Button>
            </>
          )}
        </HStack>
        <Button 
            variant="link" 
            onClick={() => navigate('/dashboard')} 
            leftIcon={<Icon as={FaTachometerAlt} />}
            mt={6} // Increased margin
            color="brand.primaryDark"
            size="lg"
        >Dashboard</Button>
      </VStack>
    </Box>
  );
}
