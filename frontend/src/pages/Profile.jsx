// frontend/src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Heading, Input, Button, Text, Stack, useToast, VStack, Icon,
    FormControl, FormLabel, Spinner, Checkbox, Divider, SimpleGrid,
    InputGroup, InputRightElement, IconButton as ChakraIconButton,
    Collapse,
    useDisclosure,
    Flex
} from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaSave, FaEdit, FaTimes, FaTachometerAlt, FaKey, FaEye, FaEyeSlash, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const initialAddressState = {
  recipientName: '', street1: '', street2: '', city: '', state: '', zipCode: '', country: '', phone: ''
};

const isAddressEmpty = (address) => {
    if (!address) return true;
    return Object.values(address).every(value => value === '' || value === null || value === undefined);
};

export default function Profile() {
  const { user, logout, setUser: setAuthUser } = useAuth();
  const [form, setForm] = useState({
    username: '', email: '', firstName: '', lastName: '',
    shippingAddress: { ...initialAddressState }, billingAddress: { ...initialAddressState },
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmNewPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const { isOpen: isPasswordSectionOpen, onToggle: onPasswordSectionToggle } = useDisclosure();
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
        username: user.username || '', email: user.email || '', firstName: user.firstName || '',
        lastName: user.lastName || '',
        shippingAddress: { ...initialAddressState, ...(user.shippingAddress || {}) },
        billingAddress: { ...initialAddressState, ...(user.billingAddress || {}) },
      };
      setForm(populatedForm);
      const sa = populatedForm.shippingAddress;
      const ba = populatedForm.billingAddress;
      if (isAddressEmpty(sa) && isAddressEmpty(ba)) {
          setBillingSameAsShipping(true);
      } else if (!isAddressEmpty(sa) && isAddressEmpty(ba)) {
          setBillingSameAsShipping(true);
          setForm(prev => ({...prev, billingAddress: {...prev.shippingAddress}}));
      } else if (sa && ba && Object.keys(sa).length > 0 && Object.keys(ba).length > 0) {
          const addressesAreIdentical = Object.keys(initialAddressState).every(key => sa[key] === ba[key]);
          setBillingSameAsShipping(addressesAreIdentical);
      } else {
          setBillingSameAsShipping(false);
      }
      setIsLoading(false);
    } else if (!authStillLoading && !user) {
      setIsLoading(false);
    }
  }, [user, authStillLoading]);

  const handleTopLevelChange = (e) => {
    const { name, value } = e.target;
    setForm(prevForm => {
      const newForm = { ...prevForm, [name]: value };
      if (name === "firstName" || name === "lastName") {
        const newRecipientName = `${newForm.firstName} ${newForm.lastName}`.trim();
        const oldRecipientName = `${prevForm.firstName} ${prevForm.lastName}`.trim();
        if (billingSameAsShipping) {
            if (!prevForm.shippingAddress.recipientName || prevForm.shippingAddress.recipientName === oldRecipientName) {
                if(newForm.shippingAddress) newForm.shippingAddress.recipientName = newRecipientName; else newForm.shippingAddress = { recipientName: newRecipientName };
                if(newForm.billingAddress) newForm.billingAddress.recipientName = newRecipientName; else newForm.billingAddress = { recipientName: newRecipientName };
            }
        } else {
            if (prevForm.shippingAddress && (!prevForm.shippingAddress.recipientName || prevForm.shippingAddress.recipientName === oldRecipientName)) {
                 if(newForm.shippingAddress) newForm.shippingAddress.recipientName = newRecipientName; else newForm.shippingAddress = { recipientName: newRecipientName };
            }
        }
      }
      return newForm;
    });
  };

  const handleAddressChange = (e, addressType) => {
    const { name, value } = e.target;
    setForm(prevForm => {
      const updatedAddress = { ...prevForm[addressType], [name]: value };
      if (billingSameAsShipping && addressType === 'shippingAddress') {
        return { ...prevForm, shippingAddress: updatedAddress, billingAddress: { ...updatedAddress } };
      }
      return { ...prevForm, [addressType]: updatedAddress };
    });
  };
 
  const handleBillingSameAsShippingChange = (e) => {
    const isChecked = e.target.checked;
    setBillingSameAsShipping(isChecked);
    if (isChecked) {
      setForm(prevForm => ({ ...prevForm, billingAddress: { ...prevForm.shippingAddress } }));
    } else {
        setForm(prevForm => ({ ...prevForm, billingAddress: { ...initialAddressState, ...(user?.billingAddress || {}) } }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const getFinalAddress = (addressData, currentForm) => {
        let finalAddress = { ...addressData };
        if (!finalAddress.recipientName && (currentForm.firstName || currentForm.lastName)) {
            finalAddress.recipientName = `${currentForm.firstName} ${currentForm.lastName}`.trim();
        }
        return isAddressEmpty(finalAddress) ? null : finalAddress;
    };
    const finalShippingAddress = getFinalAddress(form.shippingAddress, form);
    const finalBillingAddress = billingSameAsShipping ? finalShippingAddress : getFinalAddress(form.billingAddress, form);
    const updateData = {
        username: form.username, firstName: form.firstName, lastName: form.lastName,
        shippingAddress: finalShippingAddress, billingAddress: finalBillingAddress,
    };
    try {
        const { data: updatedProfileFromServer } = await client.put('/auth/profile', updateData);
        if (setAuthUser) { setAuthUser(prevAuthUser => ({...prevAuthUser, ...updatedProfileFromServer})); }
        setEditing(false);
        toast({ title: "Profile Updated", status: "success", duration: 3000, isClosable: true });
    } catch (error) {
        const errorMessage = error.response?.data?.message || "Could not save profile.";
        toast({ title: "Error Saving Profile", description: errorMessage, status: "error", duration: 5000, isClosable: true});
        if (error.response?.status === 401) { logout(); navigate('/login');}
    } finally { setIsSaving(false); }
  };

  const handleCancel = () => {
    if (user) {
        const populatedForm = {
            username: user.username || '', email: user.email || '', firstName: user.firstName || '',
            lastName: user.lastName || '',
            shippingAddress: { ...initialAddressState, ...(user.shippingAddress || {}) },
            billingAddress: { ...initialAddressState, ...(user.billingAddress || {}) },
        };
        setForm(populatedForm);
        const sa = populatedForm.shippingAddress;
        const ba = populatedForm.billingAddress;
        if (isAddressEmpty(sa) && isAddressEmpty(ba)) {
            setBillingSameAsShipping(true);
        } else if (!isAddressEmpty(sa) && isAddressEmpty(ba)) {
            setBillingSameAsShipping(true);
        } else if (sa && ba && Object.keys(sa).length > 0 && Object.keys(ba).length > 0) {
            const addressesAreIdentical = Object.keys(initialAddressState).every(key => sa[key] === ba[key]);
            setBillingSameAsShipping(addressesAreIdentical);
        } else {
            setBillingSameAsShipping(false);
        }
    }
    setEditing(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    setShowCurrentPassword(false); setShowNewPassword(false); setShowConfirmNewPassword(false);
    if (isPasswordSectionOpen) onPasswordSectionToggle();
  };

  const handlePasswordFormChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword) {
      toast({ title: "Missing Fields", description: "Please fill all password fields.", status: "warning", duration: 3000, isClosable: true }); return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      toast({ title: "Password Mismatch", description: "New passwords do not match.", status: "error", duration: 3000, isClosable: true }); return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: "Password Too Short", description: "New password must be at least 6 characters.", status: "warning", duration: 3000, isClosable: true }); return;
    }
    setIsPasswordSaving(true);
    try {
      await client.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword,
      });
      toast({ title: "Password Changed", description: "Your password has been updated successfully.", status: "success", duration: 3000, isClosable: true });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setShowCurrentPassword(false); setShowNewPassword(false); setShowConfirmNewPassword(false);
      if (isPasswordSectionOpen) onPasswordSectionToggle(); 
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Could not change password. Please check your current password.";
      toast({ title: "Password Change Failed", description: errorMessage, status: "error", duration: 5000, isClosable: true });
    } finally { setIsPasswordSaving(false); }
  };

  if (authStillLoading || isLoading) {
    return <Box textAlign="center" py={10}><Spinner size="xl" color="brand.primary" /><Text mt={4} color="brand.textDark">Loading Profile…</Text></Box>;
  }
  if (!user) {
    return <Box textAlign="center" py={10} px={4}><Text color="brand.textDark" fontSize="lg">Could not load profile. You may need to log in again.</Text><Button mt={4} bg="brand.accentYellow" color="brand.textDark" _hover={{ bg: "brand.accentYellowHover"}} borderRadius="full" size="lg" onClick={() => navigate('/login')}>Go to Login</Button></Box>;
  }

  const renderAddressFields = (addressType, legend, includeNameFields = false) => (
    <VStack spacing={4} align="stretch" w="100%">
      {legend && <Heading as="h3" size="md" color="brand.textDark" mb={2} borderBottomWidth="1px" borderColor="brand.secondary" pb={2} w="100%" textAlign="left">{legend}</Heading>}
      {includeNameFields && (
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
          <FormControl id={editing ? `firstName-edit-${addressType}` : `firstName-view-${addressType}`}>
            <FormLabel fontWeight="medium" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>First Name:</FormLabel>
            <Input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleTopLevelChange} isReadOnly={!editing} bg={!editing ? "gray.100" : "white"} borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete="given-name"/>
          </FormControl>
          <FormControl id={editing ? `lastName-edit-${addressType}` : `lastName-view-${addressType}`}>
            <FormLabel fontWeight="medium" color="brand.textDark" fontSize={{ base: "sm", md: "md" }}>Last Name:</FormLabel>
            <Input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleTopLevelChange} isReadOnly={!editing} bg={!editing ? "gray.100" : "white"} borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete="family-name"/>
          </FormControl>
        </SimpleGrid>
      )}
      <FormControl id={`${addressType}RecipientName`}><FormLabel fontWeight="medium" color="brand.textDark">Recipient Name:</FormLabel><Input name="recipientName" value={form[addressType]?.recipientName || ''} onChange={(e) => handleAddressChange(e, addressType)} isReadOnly={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg={(!editing || (addressType === 'billingAddress' && billingSameAsShipping)) ? "gray.100" : "white"} borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete={`${addressType === 'shippingAddress' ? 'shipping name' : 'billing name'}`}/></FormControl>
      <FormControl id={`${addressType}Street1`}><FormLabel fontWeight="medium" color="brand.textDark">Street Address 1:</FormLabel><Input name="street1" value={form[addressType]?.street1 || ''} onChange={(e) => handleAddressChange(e, addressType)} isReadOnly={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg={(!editing || (addressType === 'billingAddress' && billingSameAsShipping)) ? "gray.100" : "white"} borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete={`${addressType === 'shippingAddress' ? 'shipping address-line1' : 'billing address-line1'}`}/></FormControl>
      <FormControl id={`${addressType}Street2`}><FormLabel fontWeight="medium" color="brand.textDark">Street Address 2 (Apt, Suite):</FormLabel><Input name="street2" value={form[addressType]?.street2 || ''} onChange={(e) => handleAddressChange(e, addressType)} isReadOnly={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg={(!editing || (addressType === 'billingAddress' && billingSameAsShipping)) ? "gray.100" : "white"} borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete={`${addressType === 'shippingAddress' ? 'shipping address-line2' : 'billing address-line2'}`}/></FormControl>
      <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
        <FormControl id={`${addressType}City`}><FormLabel fontWeight="medium" color="brand.textDark">City:</FormLabel><Input name="city" value={form[addressType]?.city || ''} onChange={(e) => handleAddressChange(e, addressType)} isReadOnly={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg={(!editing || (addressType === 'billingAddress' && billingSameAsShipping)) ? "gray.100" : "white"} borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete={`${addressType === 'shippingAddress' ? 'shipping address-level2' : 'billing address-level2'}`}/></FormControl>
        <FormControl id={`${addressType}State`}><FormLabel fontWeight="medium" color="brand.textDark">State/Province:</FormLabel><Input name="state" value={form[addressType]?.state || ''} onChange={(e) => handleAddressChange(e, addressType)} isReadOnly={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg={(!editing || (addressType === 'billingAddress' && billingSameAsShipping)) ? "gray.100" : "white"} borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete={`${addressType === 'shippingAddress' ? 'shipping address-level1' : 'billing address-level1'}`}/></FormControl>
        <FormControl id={`${addressType}ZipCode`}><FormLabel fontWeight="medium" color="brand.textDark">Zip/Postal Code:</FormLabel><Input name="zipCode" value={form[addressType]?.zipCode || ''} onChange={(e) => handleAddressChange(e, addressType)} isReadOnly={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg={(!editing || (addressType === 'billingAddress' && billingSameAsShipping)) ? "gray.100" : "white"} borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete={`${addressType === 'shippingAddress' ? 'shipping postal-code' : 'billing postal-code'}`}/></FormControl>
      </SimpleGrid>
      <FormControl id={`${addressType}Country`}><FormLabel fontWeight="medium" color="brand.textDark">Country:</FormLabel><Input name="country" value={form[addressType]?.country || ''} onChange={(e) => handleAddressChange(e, addressType)} isReadOnly={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg={(!editing || (addressType === 'billingAddress' && billingSameAsShipping)) ? "gray.100" : "white"} borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete={`${addressType === 'shippingAddress' ? 'shipping country-name' : 'billing country-name'}`}/></FormControl>
      <FormControl id={`${addressType}Phone`}><FormLabel fontWeight="medium" color="brand.textDark">Phone (Optional):</FormLabel><Input name="phone" type="tel" value={form[addressType]?.phone || ''} onChange={(e) => handleAddressChange(e, addressType)} isReadOnly={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} bg={(!editing || (addressType === 'billingAddress' && billingSameAsShipping)) ? "gray.100" : "white"} borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="lg" autoComplete={`${addressType === 'shippingAddress' ? 'shipping tel' : 'billing tel'}`}/></FormControl>
    </VStack>
  );

  return (
    // This Box is the new overall container for the page content,
    // allowing the Heading to be outside the "paper" card.
    <Box w="100%"> 
      <Heading
        as="h1"
        size="pageTitle" // Using the new custom size from theme.js
        color="brand.textLight"
        textAlign="left"
        w="100%"
        mb={{ base: 4, md: 6 }} // Consistent bottom margin
      >
        My Profile
      </Heading>

      <Box 
        maxW="xl" // Your original maxW for the content card
        p={{base: 4, md: 8}} 
        borderWidth="1px" 
        borderRadius="xl" 
        shadow="xl" 
        bg="brand.paper" 
        mx="auto" // Center the card
      >
        {/* Profile Details Form */}
        <VStack spacing={6} as="form" onSubmit={(e) => { e.preventDefault(); if(editing) handleSave(); else e.preventDefault(); }}>
          <Box w="100%">
            <Heading as="h2" size="lg" color="brand.textDark" mb={4} borderBottomWidth="2px" borderColor="brand.accentOrange" pb={2}>
              Account Information
            </Heading>
            <VStack spacing={4} align="stretch">
              <FormControl id="username-profile">
                  <FormLabel fontWeight="semibold" color="brand.textDark">Username:</FormLabel>
                  <Input name="username" value={form.username} onChange={handleTopLevelChange} isReadOnly={!editing} bg={!editing ? "gray.100" : "white"} borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md" size="md"/>
              </FormControl>
              <FormControl id="email-profile">
                  <FormLabel fontWeight="semibold" color="brand.textDark">Email:</FormLabel>
                  <Input name="email" type="email" value={form.email} isReadOnly bg="gray.100" borderColor="brand.secondary" borderRadius="md" size="md"/>
              </FormControl>
            </VStack>
          </Box>
        
          <Divider my={3} />
          {renderAddressFields('shippingAddress', 'Shipping Address & Contact', true)}
        
          <Divider my={3} />
          <Box w="100%">
              <Heading as="h2" size="lg" color="brand.textDark" mb={4} borderBottomWidth="2px" borderColor="brand.accentOrange" pb={2}>
                  Billing Address
              </Heading>
              <VStack spacing={4} align="stretch">
                  <FormControl display="flex" alignItems="center">
                      <Checkbox
                          id="billingSameAsShipping"
                          isChecked={billingSameAsShipping}
                          onChange={handleBillingSameAsShippingChange}
                          isDisabled={!editing}
                          colorScheme="brandPrimary"
                          size="lg"
                      >
                          <Text fontSize="md" color="brand.textDark">Billing address is the same as shipping</Text>
                      </Checkbox>
                  </FormControl>
                  {!billingSameAsShipping && renderAddressFields('billingAddress', '', false)} 
              </VStack>
          </Box>

          <Stack direction={{ base: 'column', sm: 'row' }} spacing={4} mt={6} w="100%">
            {!editing ? (
              <Button onClick={() => setEditing(true)} {...primaryButtonStyle} flex={1} leftIcon={<Icon as={FaEdit}/>}>Edit Profile</Button>
            ) : (
              <>
                <Button onClick={handleSave} {...primaryButtonStyle} flex={1} type="submit" isLoading={isSaving} loadingText="Saving..." leftIcon={<Icon as={FaSave}/>}>Save Profile</Button>
                <Button onClick={handleCancel} {...secondaryButtonStyle} flex={1} leftIcon={<Icon as={FaTimes}/>}>Cancel</Button>
              </>
            )}
          </Stack>
        </VStack> {/* End of Profile Details Form VStack */}

        <Divider my={6} />

        {/* Change Password Section (Collapsible) */}
        <Box w="100%">
          <Flex
              as="button" onClick={onPasswordSectionToggle} align="center" justify="space-between"
              w="100%" py={3} borderBottomWidth="2px" borderColor="brand.accentOrange"
              _hover={{ bg: "gray.50" }} borderRadius="md" mb={isPasswordSectionOpen ? 4 : 0}
          >
            <Heading as="h2" size="lg" color="brand.textDark" display="flex" alignItems="center">
              <Icon as={FaKey} mr={3} /> Change Password
            </Heading>
            <Icon as={isPasswordSectionOpen ? FaChevronUp : FaChevronDown} />
          </Flex>
          <Collapse in={isPasswordSectionOpen} animateOpacity>
            <Box as="form" onSubmit={handleChangePassword} py={4} px={2}>
              <VStack spacing={4} align="stretch">
                <FormControl id="currentPassword-profile"><FormLabel fontWeight="semibold" color="brand.textDark">Current Password:</FormLabel><InputGroup size="md"><Input name="currentPassword" type={showCurrentPassword ? "text":"password"} value={passwordForm.currentPassword} onChange={handlePasswordFormChange} placeholder="Enter your current password" bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md"/><InputRightElement><ChakraIconButton variant="ghost" icon={showCurrentPassword ? <FaEyeSlash />:<FaEye />} onClick={()=>setShowCurrentPassword(!showCurrentPassword)} aria-label="Toggle current password visibility"/></InputRightElement></InputGroup></FormControl>
                <FormControl id="newPassword-profile"><FormLabel fontWeight="semibold" color="brand.textDark">New Password:</FormLabel><InputGroup size="md"><Input name="newPassword" type={showNewPassword ? "text":"password"} value={passwordForm.newPassword} onChange={handlePasswordFormChange} placeholder="Min. 6 characters" bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md"/><InputRightElement><ChakraIconButton variant="ghost" icon={showNewPassword ? <FaEyeSlash />:<FaEye />} onClick={()=>setShowNewPassword(!showNewPassword)} aria-label="Toggle new password visibility"/></InputRightElement></InputGroup></FormControl>
                <FormControl id="confirmNewPassword-profile"><FormLabel fontWeight="semibold" color="brand.textDark">Confirm New Password:</FormLabel><InputGroup size="md"><Input name="confirmNewPassword" type={showConfirmNewPassword ? "text":"password"} value={passwordForm.confirmNewPassword} onChange={handlePasswordFormChange} placeholder="Confirm new password" bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" borderRadius="md"/><InputRightElement><ChakraIconButton variant="ghost" icon={showConfirmNewPassword ? <FaEyeSlash />:<FaEye />} onClick={()=>setShowConfirmNewPassword(!showConfirmNewPassword)} aria-label="Toggle confirm new password visibility"/></InputRightElement></InputGroup></FormControl>
                <Button type="submit" {...primaryButtonStyle} w={{base:"full",md:"auto"}} alignSelf={{base:"stretch",md:"flex-start"}} isLoading={isPasswordSaving} loadingText="Updating..." leftIcon={<Icon as={FaSave}/>} mt={2}>Update Password</Button>
              </VStack>
            </Box>
          </Collapse>
        </Box> {/* End of Change Password Section Box */}

        <Button variant="link" onClick={() => navigate('/dashboard')} leftIcon={<Icon as={FaTachometerAlt} />} mt={10} color="brand.primaryDark" size="lg">
          Back to Dashboard
        </Button>
      </Box> {/* End of the main content card Box */}
    </Box> // End of the new root Box for the page
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
