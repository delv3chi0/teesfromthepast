// frontend/src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Box, Heading, Input, Button, Text, Stack, useToast, VStack, Icon, 
    FormControl, FormLabel, Spinner, Checkbox, Divider, SimpleGrid // Added SimpleGrid
} from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaSave, FaEdit, FaTimes, FaTachometerAlt } from 'react-icons/fa';

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
    shippingAddress: { ...initialAddressState },
    billingAddress: { ...initialAddressState },
  });
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [isLoading, setIsLoading] = useState(true); 
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { loadingAuth: authStillLoading } = useAuth(); 

  useEffect(() => {
    if (user) {
      const populatedForm = {
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        shippingAddress: { ...initialAddressState, ...(user.shippingAddress || {}) },
        billingAddress: { ...initialAddressState, ...(user.billingAddress || {}) },
      };
      setForm(populatedForm);

      const sa = populatedForm.shippingAddress;
      const ba = populatedForm.billingAddress;
      if (user.shippingAddress && user.billingAddress && Object.keys(sa).every(key => sa[key] === ba[key])) {
        setBillingSameAsShipping(true);
      } else if (user.shippingAddress && !user.billingAddress) {
        setBillingSameAsShipping(true);
        setForm(prev => ({...prev, billingAddress: {...prev.shippingAddress}})); // Pre-fill if only shipping exists
      } else if (!user.shippingAddress && !user.billingAddress) {
        setBillingSameAsShipping(true);
      } 
      else {
        setBillingSameAsShipping(false);
      }
      setIsLoading(false);
    } else if (!authStillLoading && !user) { 
      setIsLoading(false); 
    }
  }, [user, authStillLoading]); 

  const handleTopLevelChange = (e) => {
    const { name, value } = e.target;
    setForm(prevForm => ({ ...prevForm, [name]: value }));
    // If firstName or lastName changes & billingSameAsShipping, update recipientName in billing if it was based on them.
    // This part can get complex, for now, simple update. User can uncheck if they need different billing recipient.
    if (billingSameAsShipping && (name === "firstName" || name === "lastName")) {
        setForm(prevForm => ({
            ...prevForm,
            shippingAddress: {
                ...prevForm.shippingAddress,
                recipientName: `${prevForm.firstName} ${prevForm.lastName}`.trim() || prevForm.shippingAddress.recipientName
            },
            billingAddress: {
                ...prevForm.billingAddress, // This will be a copy of shipping soon if checkbox is true
                recipientName: `${prevForm.firstName} ${prevForm.lastName}`.trim() || prevForm.billingAddress.recipientName
            }
        }));
    }
  };

  const handleAddressChange = (e, addressType) => {
    const { name, value } = e.target;
    setForm(prevForm => {
      const updatedAddress = {
        ...prevForm[addressType],
        [name]: value,
      };
      if (billingSameAsShipping && addressType === 'shippingAddress') {
        return {
          ...prevForm,
          shippingAddress: updatedAddress,
          billingAddress: { ...updatedAddress } // Keep billing same as shipping
        };
      }
      return { ...prevForm, [addressType]: updatedAddress };
    });
  };
  
  const handleBillingSameAsShippingChange = (e) => {
    const isChecked = e.target.checked;
    setBillingSameAsShipping(isChecked);
    if (isChecked) {
      setForm(prevForm => ({
        ...prevForm,
        billingAddress: { ...prevForm.shippingAddress } 
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
        billingAddress: billingSameAsShipping ? { ...form.shippingAddress } : form.billingAddress,
    };
    
    try {
        const { data: updatedProfileFromServer } = await client.put('/api/auth/profile', updateData);
        if (setAuthUser) {
            setAuthUser(updatedProfileFromServer); 
        }
        setEditing(false);
        toast({ title: "Profile Updated", description: "Your changes have been saved.", status: "success", duration: 3000, isClosable: true });
    } catch (error) { /* ... error handling ... */ } finally { setIsSaving(false); }
  };

  const handleCancel = () => { /* ... (same as before, but ensure addresses are reset correctly from user context) ... */ 
    if (user) { 
        const sa = { ...initialAddressState, ...(user.shippingAddress || {}) };
        const ba = { ...initialAddressState, ...(user.billingAddress || {}) };
        setForm({
          username: user.username || '', email: user.email || '',
          firstName: user.firstName || '', lastName: user.lastName || '',
          shippingAddress: sa, billingAddress: ba,
        });
        if (user.shippingAddress && user.billingAddress && Object.keys(sa).every(key => sa[key] === ba[key])) {
            setBillingSameAsShipping(true);
        } else { setBillingSameAsShipping(false); }
    }
    setEditing(false);
  };
  
  if (authStillLoading || isLoading) { /* ... loading spinner ... */ }
  if (!user) { /* ... not logged in message ... */ }

  const renderAddressFields = (addressType, legend, includeNameFields = false) => (
    <VStack spacing={4} align="stretch" w="100%">
      <Heading as="h3" size="md" color="brand.textDark" mb={2} borderBottomWidth="1px" borderColor="brand.secondary" pb={2} w="100%" textAlign="left">{legend}</Heading>
      
      {includeNameFields && (
        <>
          <FormControl id="firstName">
            <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>First Name:</FormLabel>
            <Input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleTopLevelChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
          </FormControl>
          <FormControl id="lastName">
            <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Last Name:</FormLabel>
            <Input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleTopLevelChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
          </FormControl>
        </>
      )}

      <FormControl id={`${addressType}RecipientName`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Recipient Name (for this address):</FormLabel>
        <Input name="recipientName" placeholder="Full Name for Delivery/Billing" value={form[addressType]?.recipientName || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
      </FormControl>
      <FormControl id={`${addressType}Street1`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Street Address 1:</FormLabel>
        <Input name="street1" placeholder="123 Main St" value={form[addressType]?.street1 || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
      </FormControl>
      <FormControl id={`${addressType}Street2`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Street Address 2 (Optional):</FormLabel>
        <Input name="street2" placeholder="Apt, Suite, Bldg." value={form[addressType]?.street2 || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
      </FormControl>
      
      <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
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
      </SimpleGrid>
      
      <FormControl id={`${addressType}Country`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Country:</FormLabel>
        <Input name="country" placeholder="Country" value={form[addressType]?.country || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
      </FormControl>
      <FormControl id={`${addressType}Phone`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Phone (Optional but Recommended):</FormLabel>
        <Input name="phone" type="tel" placeholder="Phone Number" value={form[addressType]?.phone || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
      </FormControl>
    </VStack>
  );

  // Simplified loading and no-user states from your Turn 86 code
  if (authStillLoading || isLoading) { 
    return <Box textAlign="center" mt={20} py={10}><Spinner size="xl" color="brand.primary" /><Text mt={4} color="brand.textLight">Loading Profile…</Text></Box>;
  }
  if (!user) {
    return <Box textAlign="center" mt={20} px={4}><Text color="brand.textLight" fontSize="lg">Could not load profile. You may need to log in again.</Text><Button mt={4} bg="brand.accentYellow" color="brand.textDark" _hover={{ bg: "brand.accentYellowHover"}} borderRadius="full" size="lg" onClick={() => navigate('/login')}>Go to Login</Button></Box>;
  }


  return (
    <Box 
        maxW="2xl" // INCREASED MAX WIDTH
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
        Your Profile & Addresses
      </Heading>

      <VStack spacing={{ base: 6, md: 8 }} as="form" onSubmit={(e) => { e.preventDefault(); if(editing) handleSave(); }}> {/* Increased base spacing */}
        
        {/* Account Information Section */}
        <VStack spacing={4} align="stretch" w="100%">
            <Heading as="h3" size="md" color="brand.textDark" mb={0} borderBottomWidth="1px" borderColor="brand.secondary" pb={2} w="100%" textAlign="left">Account Information</Heading>
            <FormControl id="username" mt={2}>
                <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Username:</FormLabel>
                <Input name="username" value={form.username} onChange={handleTopLevelChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg"/>
            </FormControl>
            <FormControl id="email">
                <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Email:</FormLabel>
                <Input name="email" value={form.email} isReadOnly bg="gray.100" borderColor="brand.secondary" borderRadius="md" size="lg"/>
            </FormControl>
        </VStack>
        
        <Divider my={4} />
        {/* Shipping Address Section (includes First Name, Last Name) */}
        {renderAddressFields('shippingAddress', 'Shipping Address & Contact', true)} 
        
        <Divider my={4} />
        {/* Billing Address Section */}
        <VStack spacing={4} align="stretch" w="100%">
            <Heading as="h3" size="md" color="brand.textDark" mb={0} borderBottomWidth="1px" borderColor="brand.secondary" pb={2} w="100%" textAlign="left">Billing Address</Heading>
            <FormControl display="flex" alignItems="center" mt={2}>
            <Checkbox 
                id="billingSameAsShipping"
                isChecked={billingSameAsShipping}
                onChange={handleBillingSameAsShippingChange}
                isDisabled={!editing}
                colorScheme="brandPrimary" 
                size="lg" // Made checkbox larger
            >
                Billing address is the same as shipping address
            </Checkbox>
            </FormControl>

            {!billingSameAsShipping && renderAddressFields('billingAddress', '')} 
            {/* No legend for billing if different, as main legend "Billing Address" is above checkbox */}
        </VStack>


        <Stack 
            direction={{ base: 'column', md: 'row' }} 
            spacing={4} 
            mt={8} // Increased top margin for button group
            w="100%"
        >
          {!editing ? (
            <Button onClick={() => setEditing(true)} {...primaryButtonStyle} flex={1} w={{ base: "full", md: "auto" }} leftIcon={<Icon as={FaEdit}/>}>Edit Profile & Addresses</Button>
          ) : (
            <>
              <Button onClick={handleSave} {...primaryButtonStyle} flex={{ base: undefined, md: 1 }} w={{ base: "full", md: "auto" }} type="submit" isLoading={isSaving} loadingText="Saving..." leftIcon={<Icon as={FaSave}/>}>Save Changes</Button>
              <Button onClick={handleCancel} {...secondaryButtonStyle} flex={{ base: undefined, md: 1 }} w={{ base: "full", md: "auto" }} leftIcon={<Icon as={FaTimes}/>}>Cancel</Button>
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

const primaryButtonStyle = {
  bg: "brand.accentYellow", color: "brand.textDark", _hover:{ bg: "brand.accentYellowHover" },
  borderRadius:"full", px:8, size:"lg"
};
const secondaryButtonStyle = {
  variant:"outline", borderColor:"brand.primary", color:"brand.primary",
  _hover:{ bg: 'blackAlpha.50' }, borderRadius:"full", px:8, size:"lg"
};
