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
  const [form, setForm] = useState({
    username: '',
    email: '', 
    firstName: '',
    lastName: '',
  });
  const [isLoading, setIsLoading] = useState(true); 
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      });
      setIsLoading(false);
    } else if (!isLoading && !authStillLoading) { 
      // If still no user after auth check is complete, it's an issue
      // PrivateRoute should handle redirect, but as a safeguard for display:
      setIsLoading(false); 
    }
  }, [user, isLoading]); // Dependency on isLoading and authStillLoading for initial setup

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
    if (user) { 
        setForm({
          username: user.username || '', 
          email: user.email || '',
          firstName: user.firstName || '', 
          lastName: user.lastName || '',
        });
    }
    setEditing(false);
  };
  
  const { loadingAuth: authStillLoading } = useAuth();

  // Enhanced loading state: Show spinner if auth is loading OR if user isn't set yet and we expect it
  if (authStillLoading || (isLoading && !user)) { 
    return (
      <Box textAlign="center" mt={20} py={10}>
        <Spinner size="xl" color="brand.primary" thickness="4px" speed="0.65s" emptyColor="gray.200"/>
        <Text mt={4} color="brand.textLight">Loading Profile…</Text>
      </Box>
    );
  }
  
  if (!user) { // If auth is done loading, and there's still no user
      return (
          <Box textAlign="center" mt={20} px={4}>
              <Text color="brand.textLight" fontSize="lg">Could not load profile. You may need to log in again.</Text>
              <Button mt={4} bg="brand.accentYellow" color="brand.textDark" _hover={{ bg: "brand.accentYellowHover"}} borderRadius="full" size="lg" onClick={() => navigate('/login')}>Go to Login</Button>
          </Box>
      );
  }

  return (
    <Box 
        maxW="lg" 
        mt={{base: 4, md: 6}} 
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

      <VStack spacing={5} as="form" onSubmit={(e) => { e.preventDefault(); if(editing) handleSave(); }}>
        <FormControl id="username">
            <FormLabel fontWeight="bold" color="brand.textDark">Username:</FormLabel>
            <Input name="username" placeholder="Username" value={form.username} onChange={handleChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
        </FormControl>
        <FormControl id="email">
            <FormLabel fontWeight="bold" color="brand.textDark">Email:</FormLabel>
            <Input name="email" placeholder="Email" value={form.email} isReadOnly bg="gray.100" borderColor="brand.secondary" borderRadius="md" size="lg"/>
        </FormControl>
        <FormControl id="firstName">
            <FormLabel fontWeight="bold" color="brand.textDark">First Name:</FormLabel>
            <Input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
        </FormControl>
        <FormControl id="lastName">
            <FormLabel fontWeight="bold" color="brand.textDark">Last Name:</FormLabel>
            <Input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
        </FormControl>

        <HStack spacing={4} mt={6} w="100%">
          {!editing ? (
            <Button 
                bg="brand.accentYellow"      // Primary Action Style
                color="brand.textDark"       // Primary Action Style
                _hover={{bg: "brand.accentYellowHover"}}
                onClick={() => setEditing(true)} 
                leftIcon={<Icon as={FaEdit}/>}
                borderRadius="full"         // Primary Action Style
                px={8} size="lg" flex={1} 
            >Edit Profile</Button>
          ) : (
            <>
              <Button 
                bg="brand.accentYellow"      // Primary Action Style
                color="brand.textDark"       // Primary Action Style
                _hover={{bg: "brand.accentYellowHover"}}
                onClick={handleSave} 
                leftIcon={<Icon as={FaSave}/>}
                borderRadius="full"         // Primary Action Style
                px={8} size="lg" flex={1} type="submit" isLoading={isSaving} loadingText="Saving..."
              >Save Changes</Button>
              <Button 
                variant="outline"             // Secondary Action Style
                borderColor="brand.primary"   // Secondary Action Style
                color="brand.primary"       // Secondary Action Style
                _hover={{ bg: 'blackAlpha.50' }} // Subtle hover for outline on light bg
                onClick={handleCancel} 
                leftIcon={<Icon as={FaTimes}/>}
                borderRadius="full"         // Secondary Action Style
                px={8} size="lg" flex={1}
              >Cancel</Button>
            </>
          )}
        </HStack>
        <Button 
            variant="link" 
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
