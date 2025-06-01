// frontend/src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Box, Heading, Input, Button, Text, Stack, useToast, VStack, Icon, 
    FormControl, FormLabel, Spinner, Checkbox, Divider // Added Checkbox and Divider
} from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaSave, FaEdit, FaTimes, FaTachometerAlt } from 'react-icons/fa';

// Initial empty address structure
const initialAddressState = {
  recipientName: '', street1: '', street2: '', city: '', state: '', zipCode: '', country: '', phone: ''
};

export default function Profile() {
  const { user, logout, setUser: setAuthUser } = useAuth(); 
  const [form, setForm] = useState({
    username: '',
    email: '', 
    firstName: '',
    lastName: '',
    shippingAddress: { ...initialAddressState }, // Initialize with empty address
    billingAddress: { ...initialAddressState },  // Initialize with empty address
  });
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true); // For the checkbox
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
        shippingAddress: { ...initialAddressState, ...(user.shippingAddress || {}) },
        billingAddress: { ...initialAddressState, ...(user.billingAddress || {}) },
      });
      // Check if addresses are identical to pre-check the box
      if (user.shippingAddress && user.billingAddress) {
        const sa = user.shippingAddress;
        const ba = user.billingAddress;
        if (sa.recipientName === ba.recipientName && sa.street1 === ba.street1 && sa.street2 === ba.street2 &&
            sa.city === ba.city && sa.state === ba.state && sa.zipCode === ba.zipCode && 
            sa.country === ba.country && sa.phone === ba.phone) {
          setBillingSameAsShipping(true);
        } else {
          setBillingSameAsShipping(false);
        }
      } else if (user.shippingAddress && !user.billingAddress) {
        // If only shipping is set, assume billing might be the same initially
        setBillingSameAsShipping(true);
      } else {
        setBillingSameAsShipping(true); // Default if no addresses
      }
      setIsLoading(false);
    } else if (!authStillLoading && !user) { 
      setIsLoading(false); 
    }
  }, [user, authStillLoading]); 

  const handleAddressChange = (e, addressType) => {
    const { name, value } = e.target;
    setForm(prevForm => ({
      ...prevForm,
      [addressType]: {
        ...prevForm[addressType],
        [name]: value,
      }
    }));
    // If "same as shipping" is checked and shipping address changes, update billing too
    if (billingSameAsShipping && addressType === 'shippingAddress') {
        setForm(prevForm => ({
            ...prevForm,
            billingAddress: { ...prevForm.shippingAddress }
        }));
    }
  };
  
  const handleChange = (e) => { // For top-level form fields
    setForm(currentForm => ({ ...currentForm, [e.target.name]: e.target.value }));
  };

  const handleBillingSameAsShippingChange = (e) => {
    setBillingSameAsShipping(e.target.checked);
    if (e.target.checked) {
      setForm(prevForm => ({
        ...prevForm,
        billingAddress: { ...prevForm.shippingAddress } // Copy shipping to billing
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updateData = {
        username: form.username,
        firstName: form.firstName,
        lastName: form.lastName,
        shippingAddress: form.shippingAddress,
        // If checkbox is checked, send a copy of shipping address as billing address
        // If not checked, send the independently entered billing address
        billingAddress: billingSameAsShipping ? { ...form.shippingAddress } : form.billingAddress,
    };
    
    try {
        const { data: updatedProfileFromServer } = await client.put('/auth/profile', updateData);
        if (setAuthUser) {
            setAuthUser(updatedProfileFromServer); // This should update the 'user' context
        }
        // Form state will be re-populated by useEffect when 'user' from context updates
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
          shippingAddress: { ...initialAddressState, ...(user.shippingAddress || {}) },
          billingAddress: { ...initialAddressState, ...(user.billingAddress || {}) },
        });
        // Re-evaluate checkbox state based on potentially reset user data
        if (user.shippingAddress && user.billingAddress) {
            const sa = user.shippingAddress;
            const ba = user.billingAddress;
            setBillingSameAsShipping(sa.recipientName === ba.recipientName && sa.street1 === ba.street1 && /* ... all fields ... */ sa.phone === ba.phone);
        } else {
            setBillingSameAsShipping(true);
        }
    }
    setEditing(false);
  };
  
  if (authStillLoading || isLoading) { /* ... loading spinner ... */ }
  if (!user) { /* ... not logged in message ... */ }

  // Helper to render address fields
  const renderAddressFields = (addressType, legend) => (
    <VStack spacing={4} align="stretch" mt={2}>
      <Heading as="h3" size="md" color="brand.textDark" mb={2} borderBottomWidth="1px" borderColor="brand.secondary" pb={2}>{legend}</Heading>
      <FormControl id={`${addressType}RecipientName`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Recipient Name:</FormLabel>
        <Input name="recipientName" placeholder="Full Name" value={form[addressType]?.recipientName || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
      </FormControl>
      <FormControl id={`${addressType}Street1`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Street Address 1:</FormLabel>
        <Input name="street1" placeholder="123 Main St" value={form[addressType]?.street1 || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
      </FormControl>
      <FormControl id={`${addressType}Street2`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Street Address 2 (Optional):</FormLabel>
        <Input name="street2" placeholder="Apt, Suite, Bldg." value={form[addressType]?.street2 || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
      </FormControl>
      <FormControl id={`${addressType}City`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>City:</FormLabel>
        <Input name="city" placeholder="City" value={form[addressType]?.city || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
      </FormControl>
      <FormControl id={`${addressType}State`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>State/Province:</FormLabel>
        <Input name="state" placeholder="State/Province" value={form[addressType]?.state || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
      </FormControl>
      <FormControl id={`${addressType}ZipCode`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Zip/Postal Code:</FormLabel>
        <Input name="zipCode" placeholder="Zip/Postal Code" value={form[addressType]?.zipCode || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
      </FormControl>
      <FormControl id={`${addressType}Country`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Country:</FormLabel>
        <Input name="country" placeholder="Country" value={form[addressType]?.country || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
      </FormControl>
      <FormControl id={`${addressType}Phone`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Phone (Optional):</FormLabel>
        <Input name="phone" type="tel" placeholder="Phone Number" value={form[addressType]?.phone || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
      </FormControl>
    </VStack>
  );

  // Loading and no-user states (simplified for brevity, use your existing ones)
  if (authStillLoading || isLoading) { 
    return <Box textAlign="center" mt={20} py={10}><Spinner size="xl" color="brand.primary" /><Text mt={4} color="brand.textLight">Loading Profile…</Text></Box>;
  }
  if (!user) {
    return <Box textAlign="center" mt={20} px={4}><Text color="brand.textLight" fontSize="lg">Could not load profile.</Text><Button mt={4} onClick={() => navigate('/login')}>Login</Button></Box>;
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
        {/* Personal Info Section */}
        <Heading as="h3" size="md" color="brand.textDark" mb={0} borderBottomWidth="1px" borderColor="brand.secondary" pb={2} w="100%" textAlign="left">Personal Information</Heading>
        <FormControl id="username">
            <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Username:</FormLabel>
            <Input name="username" value={form.username} onChange={handleChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
        </FormControl>
        <FormControl id="email">
            <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Email:</FormLabel>
            <Input name="email" value={form.email} isReadOnly bg="gray.100" borderColor="brand.secondary" borderRadius="md" size="lg"/>
        </FormControl>
        <FormControl id="firstName">
            <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>First Name:</FormLabel>
            <Input name="firstName" value={form.firstName} onChange={handleChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
        </FormControl>
        <FormControl id="lastName">
            <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Last Name:</FormLabel>
            <Input name="lastName" value={form.lastName} onChange={handleChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
        </FormControl>

        <Divider my={4} />
        {renderAddressFields('shippingAddress', 'Shipping Address')}
        
        <Divider my={4} />
        <FormControl display="flex" alignItems="center" mt={2}>
          <Checkbox 
            id="billingSameAsShipping"
            isChecked={billingSameAsShipping}
            onChange={handleBillingSameAsShippingChange}
            isDisabled={!editing}
            colorScheme="brandPrimary" // Use a color from your theme
            mr={2}
          >
            Billing address is the same as shipping address
          </Checkbox>
        </FormControl>

        {!billingSameAsShipping && renderAddressFields('billingAddress', 'Billing Address')}

        <Stack 
            direction={{ base: 'column', md: 'row' }} 
            spacing={4} 
            mt={6} 
            w="100%"
        >
          {!editing ? (
            <Button /* Edit Profile Button */ onClick={() => setEditing(true)} {...primaryButtonStyle} flex={1} w={{ base: "full", md: "auto" }} leftIcon={<Icon as={FaEdit}/>}>Edit Profile</Button>
          ) : (
            <>
              <Button /* Save Changes Button */ onClick={handleSave} {...primaryButtonStyle} flex={{ base: undefined, md: 1 }} w={{ base: "full", md: "auto" }} type="submit" isLoading={isSaving} loadingText="Saving..." leftIcon={<Icon as={FaSave}/>}>Save Changes</Button>
              <Button /* Cancel Button */ onClick={handleCancel} {...secondaryButtonStyle} flex={{ base: undefined, md: 1 }} w={{ base: "full", md: "auto" }} leftIcon={<Icon as={FaTimes}/>}>Cancel</Button>
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

// Shared button styles for consistency (you can define these based on our previous discussion)
const primaryButtonStyle = {
  bg: "brand.accentYellow",
  color: "brand.textDark",
  _hover:{ bg: "brand.accentYellowHover" },
  borderRadius:"full",
  px:8, size:"lg"
};

const secondaryButtonStyle = {
  variant:"outline",
  borderColor:"brand.primary",
  color:"brand.primary",
  _hover:{ bg: 'blackAlpha.50' },
  borderRadius:"full",
  px:8, size:"lg"
};
