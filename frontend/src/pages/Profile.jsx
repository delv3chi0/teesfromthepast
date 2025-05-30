// frontend/src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Box, Heading, Input, Button, Text, HStack, useToast, VStack, Icon, 
    FormControl, FormLabel, Spinner // Added Spinner for loading state
} from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaSave, FaEdit, FaTimes, FaTachometerAlt } from 'react-icons/fa';

export default function Profile() {
  const { user, logout, setUser: setAuthUser } = useAuth(); // Get user and setUser for global state update
  const [profileData, setProfileData] = useState(null); // To store the fetched profile
  const [form, setForm] = useState({
    username: '',
    email: '', 
    firstName: '',
    lastName: '',
    // newPassword: '', // For an optional password change field
  });
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    // When the user object from AuthContext changes (e.g., after login or profile fetch in AuthProvider)
    // or if profileData hasn't been set yet but user exists (e.g. direct navigation to profile)
    if (user && !profileData) { // If user exists in context but we haven't populated profileData yet
        setProfileData(user);
        setForm({
            username: user.username || '',
            email: user.email || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            // newPassword: '', 
        });
    } else if (user && profileData && user._id !== profileData._id) {
        // If user in context changed to a different user, update profileData
        setProfileData(user);
         setForm({
            username: user.username || '',
            email: user.email || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
        });
    } else if (!user && !profileData) {
        // Attempt to fetch profile if no user in context (e.g. direct nav before AuthProvider fully loads user)
        // This might be redundant if AuthProvider's useEffect already handles it comprehensively
        console.log("Profile.jsx: No user in context, attempting initial profile fetch if token exists.");
        client.get('/auth/profile').then(({ data }) => {
            setProfileData(data);
            setAuthUser(data); // Update global context
            setForm({
                username: data.username || '',
                email: data.email || '',
                firstName: data.firstName || '',
                lastName: data.lastName || '',
            });
        }).catch(err => {
            console.error("Error fetching profile on direct load:", err);
            if (err.response?.status === 401) {
                logout();
                navigate('/login');
            } else {
                toast({ title: "Error", description: "Could not load profile data.", status: "error", duration: 3000, isClosable: true });
            }
        });
    }
  }, [user, profileData, setAuthUser, toast, logout, navigate]);


  const handleChange = (e) => {
    setForm(currentForm => ({ ...currentForm, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updateData = {
        username: form.username,
        firstName: form.firstName,
        lastName: form.lastName,
        // Email is read-only, so not included in updateData unless you make it editable
        // If you add password change:
        // if (form.newPassword) { updateData.password = form.newPassword; }
    };
    
    try {
        const { data: updatedProfileFromServer } = await client.put('/auth/profile', updateData);
        
        if (setAuthUser) {
            setAuthUser(updatedProfileFromServer); // Update global user state in AuthProvider
        }
        setProfileData(updatedProfileFromServer); // Update local profileData state
        setForm({ // Reset form to new server data
            username: updatedProfileFromServer.username || '',
            email: updatedProfileFromServer.email || '', 
            firstName: updatedProfileFromServer.firstName || '',
            lastName: updatedProfileFromServer.lastName || '',
            // newPassword: '',
        });
        setEditing(false);
        toast({ title: "Profile Updated", description: "Your changes have been saved.", status: "success", duration: 3000, isClosable: true });
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
    if (profileData) { // Reset form to last known good profile data
        setForm({
          username: profileData.username || '', 
          email: profileData.email || '',
          firstName: profileData.firstName || '', 
          lastName: profileData.lastName || '',
          // newPassword: '',
        });
    }
    setEditing(false);
  };

  // Show loading spinner if profileData isn't available yet (and user context might still be loading)
  if (!profileData) { 
    return (
      <Box textAlign="center" mt={20} py={10}>
        <Spinner size="xl" color="brand.primary" thickness="4px" speed="0.65s" emptyColor="gray.200"/>
        <Text mt={4} color="brand.textLight">Loading Profile…</Text>
      </Box>
    );
  }

  return (
    <Box 
        maxW="lg" 
        mt={{base: 6, md: 8}} 
        p={{base: 6, md: 8}} 
        borderWidth="1px" 
        borderRadius="xl" 
        shadow="xl" 
        bg="brand.paper" // Profile form area is a "white card"
        mx="auto" // Center the card on the orange background from MainLayout
    >
      <Heading as="h1" size="xl" mb={8} textAlign="left" w="100%" color="brand.textDark"> 
        Your Profile
      </Heading>

      <VStack spacing={6} as="form" onSubmit={(e) => { e.preventDefault(); if(editing) handleSave(); }}>
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

        {/* Placeholder for future password change functionality
        {editing && (
            <FormControl id="newPassword">
                <FormLabel fontWeight="bold" color="brand.textDark">New Password (optional):</FormLabel>
                <Input name="newPassword" type="password" placeholder="Leave blank to keep current" value={form.newPassword} onChange={handleChange} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark"/>
            </FormControl>
        )}
        */}

        <HStack spacing={4} mt={8} w="100%"> {/* Increased top margin for buttons */}
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
                borderColor="brand.secondary" color="brand.secondary" _hover={{bg:"blackAlpha.50"}}
              >Cancel</Button>
            </>
          )}
        </HStack>
        <Button 
            variant="link" 
            onClick={() => navigate('/dashboard')} 
            leftIcon={<Icon as={FaTachometerAlt} />}
            mt={6}
            color="brand.primaryDark"
            size="lg"
        >Dashboard</Button>
      </VStack>
    </Box>
  );
}
