// frontend/src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Box, Heading, Input, Button, Text, Stack, useToast, VStack, Icon, 
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
    // shippingAddress and billingAddress should be initialized here if you expect them in the form
    // For now, keeping it as per Turn 86 which didn't have address fields yet in this component
  });
  const [isLoading, setIsLoading] = useState(true); 
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { loadingAuth: authStillLoading } = useAuth(); 

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        // Populate with address data if available from user object
        // shippingAddress: user.shippingAddress || { recipientName: '', street1: '', ...etc. },
        // billingAddress: user.billingAddress || { recipientName: '', street1: '', ...etc. },
      });
      setIsLoading(false);
    } else if (!authStillLoading && !user) { 
      setIsLoading(false); 
    }
  }, [user, authStillLoading]); 

  const handleChange = (e) => {
    setForm(currentForm => ({ ...currentForm, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updateData = {
        username: form.username,
        firstName: form.firstName,
        lastName: form.lastName,
        // Include address data if form handles it:
        // shippingAddress: form.shippingAddress,
        // billingAddress: form.billingAddress,
    };
    
    try {
        const { data: updatedProfileFromServer } = await client.put('/auth/profile', updateData);
        if (setAuthUser) {
            setAuthUser(updatedProfileFromServer); 
        }
        // Repopulate form from server response to ensure consistency, including addresses
        setForm({                   
            username: updatedProfileFromServer.username || '',
            email: updatedProfileFromServer.email || '', 
            firstName: updatedProfileFromServer.firstName || '',
            lastName: updatedProfileFromServer.lastName || '',
            // shippingAddress: updatedProfileFromServer.shippingAddress || { recipientName: '', ...etc. },
            // billingAddress: updatedProfileFromServer.billingAddress || { recipientName: '', ...etc. },
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
          // Reset addresses from user context too
          // shippingAddress: user.shippingAddress || { recipientName: '', ...etc. },
          // billingAddress: user.billingAddress || { recipientName: '', ...etc. },
        });
    }
    setEditing(false);
  };
  
  if (authStillLoading || isLoading) { 
    return (
      <Box textAlign="center" mt={20} py={10}>
        <Spinner size="xl" color="brand.primary" thickness="4px" speed="0.65s" emptyColor="gray.200"/>
        <Text mt={4} color="brand.textLight">Loading Profile…</Text>
      </Box>
    );
  }
  
  if (!user) { 
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
        p={{base: 4, sm: 6, md: 8}} 
        borderWidth="1px" 
        borderRadius="xl" 
        shadow="xl" 
        bg="brand.paper" 
        mx="auto" 
    >
      <Heading 
        as="h1" 
        size={{ base: "lg", md: "xl" }}      
        mb={{ base: 4, md: 6 }}           
        textAlign="left" 
        w="100%" 
        color="brand.textDark"
      > 
        Your Profile 
      </Heading>

      <VStack spacing={{ base: 4, md: 5 }} as="form" onSubmit={(e) => { e.preventDefault(); if(editing) handleSave(); }}>
        <FormControl id="username">
            <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Username:</FormLabel>
            <Input name="username" placeholder="Username" value={form.username} onChange={handleChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
        </FormControl>
        <FormControl id="email">
            <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Email:</FormLabel>
            <Input name="email" placeholder="Email" value={form.email} isReadOnly bg="gray.100" borderColor="brand.secondary" borderRadius="md" size="lg"/>
        </FormControl>
        <FormControl id="firstName">
            <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>First Name:</FormLabel>
            <Input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
        </FormControl>
        <FormControl id="lastName">
            <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Last Name:</FormLabel>
            <Input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
        </FormControl>

        {/* Note: Shipping and Billing address fields are not yet added here. 
            That was planned as the *next* step after this mobile responsiveness pass for Profile.jsx.
            The backend changes for addresses are done, but this frontend component doesn't have the UI for them yet.
        */}

        <Stack 
            direction={{ base: 'column', md: 'row' }} 
            spacing={4} 
            mt={6} 
            w="100%"
        >
          {!editing ? (
            <Button 
                bg="brand.accentYellow"
                color="brand.textDark"
                _hover={{bg: "brand.accentYellowHover"}}
                onClick={() => setEditing(true)} 
                leftIcon={<Icon as={FaEdit}/>}
                borderRadius="full"
                px={8} size="lg" 
                w={{ base: "full", md: "auto" }} 
                flex={editing ? undefined : 1} 
            >Edit Profile</Button>
          ) : (
            <>
              <Button 
                bg="brand.accentYellow"
                color="brand.textDark"
                _hover={{bg: "brand.accentYellowHover"}}
                onClick={handleSave} 
                leftIcon={<Icon as={FaSave}/>}
                borderRadius="full"
                px={8} size="lg" 
                w={{ base: "full", md: "auto" }} 
                flex={{ base: undefined, md: 1 }} 
                type="submit" isLoading={isSaving} loadingText="Saving..."
              >Save Changes</Button>
              <Button 
                variant="outline"
                borderColor="brand.primary"
                color="brand.primary"
                _hover={{ bg: 'blackAlpha.50' }} 
                onClick={handleCancel} 
                leftIcon={<Icon as={FaTimes}/>}
                borderRadius="full"
                px={8} size="lg" 
                w={{ base: "full", md: "auto" }} 
                flex={{ base: undefined, md: 1 }} 
              >Cancel</Button>
            </>
          )}
        </Stack>
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
