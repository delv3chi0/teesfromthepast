// frontend/src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Box, Heading, Input, Button, Text, HStack, useToast, VStack, Icon, 
    FormControl, FormLabel, Spinner 
} from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaSave, FaEdit, FaTimes, FaTachometerAlt } from 'react-icons/fa';

export default function Profile() {
  const { user, logout, setUser: setAuthUser } = useAuth(); 
  // Initialize form state with empty strings
  const [form, setForm] = useState({
    username: '',
    email: '', 
    firstName: '',
    lastName: '',
  });
  const [isLoading, setIsLoading] = useState(true); // To manage loading state of profile data
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    console.log("[Profile.jsx] useEffect triggered, user from context:", user);
    if (user) {
      console.log("[Profile.jsx] User context exists, setting form data.");
      setForm({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      });
      setIsLoading(false);
    } else if (localStorage.getItem('token')) {
      // This case handles if user directly navigates to /profile and AuthProvider is still initializing
      // AuthProvider will eventually set 'user' or log out if token is invalid.
      // We show loading until 'user' is populated by AuthProvider or this fetch completes/fails.
      console.log("[Profile.jsx] No user in context yet, token exists. AuthProvider might be loading user.");
      // It's generally better to rely on AuthProvider to set the user globally.
      // This fallback fetch can be removed if AuthProvider is robustly setting 'user' on refresh.
      // For now, let's keep a simplified path: rely on 'user' from context.
      // If 'user' is null and loadingAuth from AuthProvider is false, PrivateRoute would redirect.
      // So, if we reach here and 'user' is null, it means AuthProvider is still loading or failed.
      // Let's ensure we don't get stuck in a loop if AuthProvider fails and user remains null.
      if (!isLoading) setIsLoading(true); // Show loading if user is null but we expect it
    } else {
      // No user, no token - PrivateRoute should have redirected, but as a fallback:
      console.log("[Profile.jsx] No user and no token. Should redirect.");
      setIsLoading(false);
      // navigate('/login'); // PrivateRoute handles this
    }
  }, [user]); // Only depend on 'user' from AuthContext

  const handleChange = (e) => {
    setForm(currentForm => ({ ...currentForm, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updateData = {
        username: form.username,
        firstName: form.firstName,
        lastName: form.lastName,
    };
    
    try {
        const { data: updatedProfileFromServer } = await client.put('/auth/profile', updateData);
        if (setAuthUser) {
            setAuthUser(updatedProfileFromServer); 
        }
        // Update form directly from server response to ensure it's the source of truth
        setForm({                   
            username: updatedProfileFromServer.username || '',
            email: updatedProfileFromServer.email || '', 
            firstName: updatedProfileFromServer.firstName || '',
            lastName: updatedProfileFromServer.lastName || '',
        });
        setEditing(false);
        toast({ title: "Profile Updated", description: "Your changes have been saved.", status: "success", duration: 3000, isClosable: true });
    } catch (error) {
        console.error("Error saving profile:", error);
        const errorMessage = error.response?.data?.message || "Could not save profile.";
        toast({ title: "Error Saving Profile", description: errorMessage, status: "error", duration: 5000, isClosable: true});
        if (error.response?.status === 401) { logout(); navigate('/login');}
    } finally {
        setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) { // Reset form to the data from user context
        setForm({
          username: user.username || '', 
          email: user.email || '',
          firstName: user.firstName || '', 
          lastName: user.lastName || '',
        });
    }
    setEditing(false);
  };

  // If AuthProvider is still establishing auth status, useAuth() might return loadingAuth: true
  // PrivateRoute should be handling this, but an extra check here for initial data can be useful.
  // The primary check is if 'user' from context is populated.
  const { loadingAuth: authStillLoading } = useAuth();
  if (authStillLoading || (isLoading && !user)) { 
    return (
      <Box textAlign="center" mt={20} py={10}>
        <Spinner size="xl" color="brand.primary" thickness="4px" speed="0.65s" emptyColor="gray.200"/>
        <Text mt={4} color="brand.textLight">Loading Profile…</Text>
      </Box>
    );
  }
  
  // If auth check is done, but no user (e.g. token was invalid & cleared by AuthProvider)
  // PrivateRoute should have redirected, but this is a safeguard.
  if (!user) {
      return (
          <Box textAlign="center" mt={20} px={4}>
              <Text color="brand.textLight" fontSize="lg">Could not load profile. You may need to log in again.</Text>
              <Button mt={4} onClick={() => navigate('/login')}>Go to Login</Button>
          </Box>
      );
  }

  return (
    <Box 
        maxW="lg" 
        mt={{base: 4, md: 6}} // Reduced top margin slightly
        p={{base: 6, md: 8}} 
        borderWidth="1px" 
        borderRadius="xl" 
        shadow="xl" 
        bg="brand.paper" 
        mx="auto" 
    >
      <Heading as="h1" size="xl" mb={8} textAlign="left" w="100%" color="brand.textDark"> 
        Your Profile
      </Heading>

      <VStack spacing={5} as="form" onSubmit={(e) => { e.preventDefault(); if(editing) handleSave(); }}> {/* Reduced spacing slightly */}
        <FormControl id="username">
            <FormLabel fontWeight="bold" color="brand.textDark">Username:</FormLabel>
            <Input name="username" placeholder="Username" value={form.username} onChange={handleChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md"/>
        </FormControl>
        <FormControl id="email">
            <FormLabel fontWeight="bold" color="brand.textDark">Email:</FormLabel>
            <Input name="email" placeholder="Email" value={form.email} isReadOnly bg="gray.100" borderColor="brand.secondary" borderRadius="md"/>
        </FormControl>
        <FormControl id="firstName">
            <FormLabel fontWeight="bold" color="brand.textDark">First Name:</FormLabel>
            <Input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md"/>
        </FormControl>
        <FormControl id="lastName">
            <FormLabel fontWeight="bold" color="brand.textDark">Last Name:</FormLabel>
            <Input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md"/>
        </FormControl>

        <HStack spacing={4} mt={6} w="100%"> {/* Reduced top margin slightly */}
          {!editing ? (
            <Button 
                bg="brand.primary" color="brand.textLight" _hover={{bg: "brand.primaryLight"}}
                onClick={() => setEditing(true)} 
                leftIcon={<Icon as={FaEdit}/>}
                borderRadius="full" px={8} size="lg" flex={1} 
            >Edit Profile</Button>
          ) : (
            <>
              <Button 
                bg="brand.accentYellow" color="brand.textDark" _hover={{bg: "brand.accentYellowHover"}}
                onClick={handleSave} 
                leftIcon={<Icon as={FaSave}/>}
                borderRadius="full" px={8} size="lg" flex={1} type="submit" isLoading={isSaving} loadingText="Saving..."
              >Save Changes</Button>
              <Button 
                variant="outline" onClick={handleCancel} leftIcon={<Icon as={FaTimes}/>}
                borderRadius="full" px={8} size="lg" flex={1}
                borderColor="brand.secondary" color="brand.secondary" _hover={{bg:"blackAlpha.100"}}
              >Cancel</Button>
            </>
          )}
        </HStack>
        <Button 
            variant="link" 
            onClick={() => navigate('/dashboard')} 
            leftIcon={<Icon as={FaTachometerAlt} />}
            mt={4} // Reduced margin
            color="brand.primaryDark"
            size="lg"
        >Dashboard</Button>
      </VStack>
    </Box>
  );
}
