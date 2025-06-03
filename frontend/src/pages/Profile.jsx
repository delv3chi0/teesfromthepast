// frontend/src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Heading, Input, Button, Text, Stack, useToast, VStack, Icon,
    FormControl, FormLabel, Spinner, Checkbox, Divider, SimpleGrid,
    InputGroup, InputRightElement, IconButton as ChakraIconButton // Added for password visibility
} from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaSave, FaEdit, FaTimes, FaTachometerAlt, FaKey, FaEye, FaEyeSlash } from 'react-icons/fa'; // Added FaKey, FaEye, FaEyeSlash

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
  // New state for password change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  // ----

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
      const addressesAreIdentical = user.shippingAddress && user.billingAddress &&
        Object.keys(sa).every(key => sa[key] === ba[key]);

      if (addressesAreIdentical) {
        setBillingSameAsShipping(true);
      } else if (user.shippingAddress && !user.billingAddress) {
        setBillingSameAsShipping(true);
        setForm(prev => ({...prev, billingAddress: {...prev.shippingAddress}}));
      } else if (!user.shippingAddress && !user.billingAddress) {
        setBillingSameAsShipping(true);
      } else {
        setBillingSameAsShipping(false);
      }
      setIsLoading(false);
    } else if (!authStillLoading && !user) {
      setIsLoading(false);
    }
  }, [user, authStillLoading]);

  const handleTopLevelChange = (e) => { /* ... (existing code, unchanged) ... */ };
  const handleAddressChange = (e, addressType) => { /* ... (existing code, unchanged) ... */ };
  const handleBillingSameAsShippingChange = (e) => { /* ... (existing code, unchanged) ... */ };
  // --- PASTE YOUR EXISTING handleTopLevelChange, handleAddressChange, handleBillingSameAsShippingChange here ---
  const handleTopLevelChange = (e) => {
    const { name, value } = e.target;
    setForm(prevForm => {
      const newForm = { ...prevForm, [name]: value };
      if (billingSameAsShipping && (name === "firstName" || name === "lastName")) {
        const newRecipientName = `${newForm.firstName} ${newForm.lastName}`.trim();
        if (newForm.shippingAddress) newForm.shippingAddress.recipientName = newRecipientName || newForm.shippingAddress.recipientName;
        if (newForm.billingAddress) newForm.billingAddress.recipientName = newRecipientName || newForm.billingAddress.recipientName;
      }
      return newForm;
    });
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
          billingAddress: { ...updatedAddress }
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
  // --- END OF PASTED HANDLERS ---


  const handleSave = async () => { /* ... (existing code, unchanged) ... */ };
  const handleCancel = () => { /* ... (existing code, unchanged) ... */ };

  // --- PASTE YOUR EXISTING handleSave and handleCancel here ---
  const handleSave = async () => {
    setIsSaving(true);
    let finalShippingAddress = { ...form.shippingAddress };
    if (!finalShippingAddress.recipientName && (form.firstName || form.lastName)) {
        finalShippingAddress.recipientName = `${form.firstName} ${form.lastName}`.trim();
    }

    let finalBillingAddress;
    if (billingSameAsShipping) {
        finalBillingAddress = { ...finalShippingAddress };
    } else {
        finalBillingAddress = { ...form.billingAddress };
        if (!finalBillingAddress.recipientName && (form.firstName || form.lastName)) {
            finalBillingAddress.recipientName = `${form.firstName} ${form.lastName}`.trim();
        }
    }
   
    const updateData = {
        username: form.username,
        firstName: form.firstName,
        lastName: form.lastName,
        // Only send address if it has some data, or send null to clear
        shippingAddress: Object.values(finalShippingAddress).some(val => val !== '' && val !== undefined) ? finalShippingAddress : null,
        billingAddress: Object.values(finalBillingAddress).some(val => val !== '' && val !== undefined) ? finalBillingAddress : null,
    };
   
    try {
        const { data: updatedProfileFromServer } = await client.put('/auth/profile', updateData);
       
        if (setAuthUser) {
            setAuthUser(prevAuthUser => ({...prevAuthUser, ...updatedProfileFromServer}));
        }
        setEditing(false);
        toast({ title: "Profile Updated", description: "Your changes have been saved.", status: "success", duration: 3000, isClosable: true });
    } catch (error) {
        console.error("Error saving profile:", error.response?.data || error.message || error);
        const errorMessage = error.response?.data?.message || "Could not save profile.";
        toast({ title: "Error Saving Profile", description: errorMessage, status: "error", duration: 5000, isClosable: true});
        if (error.response?.status === 401) { logout(); navigate('/login');}
    } finally {
        setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
        const sa = { ...initialAddressState, ...(user.shippingAddress || {}) };
        const ba = { ...initialAddressState, ...(user.billingAddress || {}) };
        setForm({
          username: user.username || '', email: user.email || '',
          firstName: user.firstName || '', lastName: user.lastName || '',
          shippingAddress: sa, billingAddress: ba,
        });
        const addressesAreIdentical = user.shippingAddress && user.billingAddress &&
            Object.keys(sa).every(key => sa[key] === ba[key]);

        if (addressesAreIdentical) setBillingSameAsShipping(true);
        else if (user.shippingAddress && !user.billingAddress) setBillingSameAsShipping(true);
        else if (!user.shippingAddress && !user.billingAddress) setBillingSameAsShipping(true);
        else setBillingSameAsShipping(false);
    }
    setEditing(false);
    // Reset password form as well
    setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
  };
  // --- END OF PASTED HANDLERS ---


  // --- NEW: Handle Password Change ---
  const handlePasswordFormChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword) {
      toast({ title: "Missing Fields", description: "Please fill all password fields.", status: "warning", duration: 3000, isClosable: true });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      toast({ title: "Password Mismatch", description: "New passwords do not match.", status: "error", duration: 3000, isClosable: true });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: "Password Too Short", description: "New password must be at least 6 characters.", status: "warning", duration: 3000, isClosable: true });
      return;
    }

    setIsPasswordSaving(true);
    try {
      // You'll need to create this backend endpoint: PUT /api/auth/change-password
      await client.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast({ title: "Password Changed", description: "Your password has been updated successfully.", status: "success", duration: 3000, isClosable: true });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' }); // Reset form
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Could not change password. Please check your current password.";
      toast({ title: "Password Change Failed", description: errorMessage, status: "error", duration: 5000, isClosable: true });
    } finally {
      setIsPasswordSaving(false);
    }
  };
  // --- END: Handle Password Change ---

  if (authStillLoading || isLoading) { /* ... (existing code, unchanged) ... */ }
  if (!user) { /* ... (existing code, unchanged) ... */ }
  const renderAddressFields = (addressType, legend, includeNameFields = false) => (  /* ... (existing code, unchanged) ... */ );

  // --- PASTE YOUR EXISTING LOADING/NO USER RETURN AND renderAddressFields HERE ---
  if (authStillLoading || isLoading) {
    return <Box textAlign="center" mt={20} py={10}><Spinner size="xl" color="brand.primary" /><Text mt={4} color="brand.textLight">Loading Profile…</Text></Box>;
  }
  if (!user) {
    return <Box textAlign="center" mt={20} px={4}><Text color="brand.textLight" fontSize="lg">Could not load profile. You may need to log in again.</Text><Button mt={4} bg="brand.accentYellow" color="brand.textDark" _hover={{ bg: "brand.accentYellowHover"}} borderRadius="full" size="lg" onClick={() => navigate('/login')}>Go to Login</Button></Box>;
  }

  const renderAddressFields = (addressType, legend, includeNameFields = false) => (
    <VStack spacing={4} align="stretch" w="100%">
      <Heading as="h3" size="md" color="brand.textDark" mb={2} borderBottomWidth="1px" borderColor="brand.secondary" pb={2} w="100%" textAlign="left">{legend}</Heading>
     
      {includeNameFields && (
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
          <FormControl id="firstName">
            <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>First Name:</FormLabel>
            <Input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleTopLevelChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete="given-name"/>
          </FormControl>
          <FormControl id="lastName">
            <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Last Name:</FormLabel>
            <Input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleTopLevelChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete="family-name"/>
          </FormControl>
        </SimpleGrid>
      )}

      <FormControl id={`${addressType}RecipientName`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Recipient Name (for this address):</FormLabel>
        <Input name="recipientName" placeholder="Full Name for Delivery/Billing" value={form[addressType]?.recipientName || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete={`${addressType === 'shippingAddress' ? 'shipping name' : 'billing name'}`}/>
      </FormControl>
      <FormControl id={`${addressType}Street1`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Street Address 1:</FormLabel>
        <Input name="street1" placeholder="123 Main St" value={form[addressType]?.street1 || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete={`${addressType === 'shippingAddress' ? 'shipping address-line1' : 'billing address-line1'}`}/>
      </FormControl>
      <FormControl id={`${addressType}Street2`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Street Address 2 (Optional):</FormLabel>
        <Input name="street2" placeholder="Apt, Suite, Bldg." value={form[addressType]?.street2 || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete={`${addressType === 'shippingAddress' ? 'shipping address-line2' : 'billing address-line2'}`}/>
      </FormControl>
     
      <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
        <FormControl id={`${addressType}City`}>
          <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>City:</FormLabel>
          <Input name="city" placeholder="City" value={form[addressType]?.city || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete={`${addressType === 'shippingAddress' ? 'shipping address-level2' : 'billing address-level2'}`}/>
        </FormControl>
        <FormControl id={`${addressType}State`}>
          <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>State/Province:</FormLabel>
          <Input name="state" placeholder="State/Province" value={form[addressType]?.state || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete={`${addressType === 'shippingAddress' ? 'shipping address-level1' : 'billing address-level1'}`}/>
        </FormControl>
        <FormControl id={`${addressType}ZipCode`}>
          <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Zip/Postal Code:</FormLabel>
          <Input name="zipCode" placeholder="Zip/Postal Code" value={form[addressType]?.zipCode || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete={`${addressType === 'shippingAddress' ? 'shipping postal-code' : 'billing postal-code'}`}/>
        </FormControl>
      </SimpleGrid>
     
      <FormControl id={`${addressType}Country`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Country:</FormLabel>
        <Input name="country" placeholder="Country" value={form[addressType]?.country || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete={`${addressType === 'shippingAddress' ? 'shipping country-name' : 'billing country-name'}`}/>
      </FormControl>
      <FormControl id={`${addressType}Phone`}>
        <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Phone (Optional but Recommended):</FormLabel>
        <Input name="phone" type="tel" placeholder="Phone Number" value={form[addressType]?.phone || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete={`${addressType === 'shippingAddress' ? 'shipping tel' : 'billing tel'}`}/>
      </FormControl>
    </VStack>
  );
  // --- END OF PASTED SECTIONS ---


  return (
    <Box
        maxW="2xl"
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

      {/* Profile Details Form */}
      <VStack spacing={{ base: 6, md: 8 }} as="form" onSubmit={(e) => { e.preventDefault(); if(editing) handleSave(); }}>
       
        <VStack spacing={4} align="stretch" w="100%">
            <Heading as="h3" size="md" color="brand.textDark" mb={0} borderBottomWidth="1px" borderColor="brand.secondary" pb={2} w="100%" textAlign="left">Account Information</Heading>
            <FormControl id="username-profile" mt={2}> {/* Updated id for uniqueness */}
                <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Username:</FormLabel>
                <Input name="username" value={form.username} onChange={handleTopLevelChange} isDisabled={!editing} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete="username"/>
            </FormControl>
            <FormControl id="email-profile"> {/* Updated id for uniqueness */}
                <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Email:</FormLabel>
                <Input name="email" type="email" value={form.email} isReadOnly bg="gray.100" borderColor="brand.secondary" borderRadius="md" size="lg" autoComplete="email"/>
            </FormControl>
        </VStack>
       
        <Divider my={4} />
        {renderAddressFields('shippingAddress', 'Shipping Address & Contact', true)}
       
        <Divider my={4} />
        <VStack spacing={4} align="stretch" w="100%">
            <Heading as="h3" size="md" color="brand.textDark" mb={0} borderBottomWidth="1px" borderColor="brand.secondary" pb={2} w="100%" textAlign="left">Billing Address</Heading>
            <FormControl display="flex" alignItems="center" mt={2}>
            <Checkbox
                id="billingSameAsShipping"
                isChecked={billingSameAsShipping}
                onChange={handleBillingSameAsShippingChange}
                isDisabled={!editing}
                colorScheme="brandPrimary" // Make sure brandPrimary is defined for Checkbox
                size="lg"
            >
                Billing address is the same as shipping address
            </Checkbox>
            </FormControl>
            {!billingSameAsShipping && renderAddressFields('billingAddress', '')}
        </VStack>

        <Stack
            direction={{ base: 'column', md: 'row' }}
            spacing={4}
            mt={8}
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
      </VStack>

      {/* --- NEW: Change Password Section --- */}
      <Divider my={{ base: 6, md: 8 }} />
      <Box as="form" onSubmit={handleChangePassword}>
        <VStack spacing={4} align="stretch" w="100%">
          <Heading as="h3" size="md" color="brand.textDark" mb={2} borderBottomWidth="1px" borderColor="brand.secondary" pb={2} w="100%" textAlign="left">
            <Icon as={FaKey} mr={2} /> Change Password
          </Heading>
          <FormControl id="currentPassword">
            <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Current Password:</FormLabel>
            <InputGroup size="lg">
              <Input
                name="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={handlePasswordFormChange}
                placeholder="Enter your current password"
                bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md"
              />
              <InputRightElement>
                <ChakraIconButton
                  variant="ghost"
                  icon={showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>
          <FormControl id="newPasswordProfile"> {/* Unique ID */}
            <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>New Password:</FormLabel>
            <InputGroup size="lg">
              <Input
                name="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={handlePasswordFormChange}
                placeholder="Enter new password (min. 6 characters)"
                bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md"
              />
              <InputRightElement>
                <ChakraIconButton
                  variant="ghost"
                  icon={showNewPassword ? <FaEyeSlash /> : <FaEye />}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>
          <FormControl id="confirmNewPasswordProfile"> {/* Unique ID */}
            <FormLabel fontWeight="bold" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Confirm New Password:</FormLabel>
            <InputGroup size="lg">
              <Input
                name="confirmNewPassword"
                type={showConfirmNewPassword ? "text" : "password"}
                value={passwordForm.confirmNewPassword}
                onChange={handlePasswordFormChange}
                placeholder="Confirm new password"
                bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md"
              />
              <InputRightElement>
                <ChakraIconButton
                  variant="ghost"
                  icon={showConfirmNewPassword ? <FaEyeSlash /> : <FaEye />}
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>
          <Button
            type="submit"
            {...primaryButtonStyle} // Use your existing button style
            w={{ base: "full", md: "auto" }}
            alignSelf={{base: "stretch", md: "flex-start"}} // Align button to start on md+
            isLoading={isPasswordSaving}
            loadingText="Updating Password..."
            leftIcon={<Icon as={FaSave} />}
          >
            Update Password
          </Button>
        </VStack>
      </Box>
      {/* --- END: Change Password Section --- */}


      <Button
          variant="link"
          onClick={() => navigate('/dashboard')}
          leftIcon={<Icon as={FaTachometerAlt} />}
          mt={{base: 8, md: 10}} // Increased margin
          color="brand.primaryDark"
          size="lg"
      >Dashboard</Button>
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
