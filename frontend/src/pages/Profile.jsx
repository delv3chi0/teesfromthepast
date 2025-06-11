// frontend/src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Heading, Input, Button, Text, Stack, useToast, VStack, Icon, FormControl, FormLabel, Spinner, Checkbox, Divider, SimpleGrid, InputGroup, InputRightElement, IconButton as ChakraIconButton, Collapse, useDisclosure, Flex, Card, CardBody } from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaSave, FaEdit, FaTimes, FaKey, FaEye, FaEyeSlash, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const initialAddressState = { recipientName: '', street1: '', street2: '', city: '', state: '', zipCode: '', country: '', phone: '' };
const isAddressEmpty = (address) => !address || Object.values(address).every(v => v === '');

export default function Profile() {
  const { user, logout, setUser: setAuthUser } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', firstName: '', lastName: '', shippingAddress: { ...initialAddressState }, billingAddress: { ...initialAddressState } });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
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
  const { loadingAuth } = useAuth();

  useEffect(() => {
    if (user) {
      const shipping = { ...initialAddressState, ...(user.shippingAddress || {}) };
      const billing = { ...initialAddressState, ...(user.billingAddress || {}) };
      setForm({ username: user.username || '', email: user.email || '', firstName: user.firstName || '', lastName: user.lastName || '', shippingAddress: shipping, billingAddress: billing });
      const addressesAreIdentical = JSON.stringify(shipping) === JSON.stringify(billing);
      setBillingSameAsShipping(addressesAreIdentical);
      setIsLoading(false);
    } else if (!loadingAuth && !user) {
      setIsLoading(false);
    }
  }, [user, loadingAuth]);

  const handleTopLevelChange = (e) => { const { name, value } = e.target; setForm(prev => ({ ...prev, [name]: value })); };
  const handleAddressChange = (e, addressType) => { const { name, value } = e.target; setForm(prevForm => { const updatedAddress = { ...prevForm[addressType], [name]: value }; if (billingSameAsShipping && addressType === 'shippingAddress') { return { ...prevForm, shippingAddress: updatedAddress, billingAddress: { ...updatedAddress } }; } return { ...prevForm, [addressType]: updatedAddress }; }); };
  const handleBillingSameAsShippingChange = (e) => { const isChecked = e.target.checked; setBillingSameAsShipping(isChecked); if (isChecked) { setForm(prev => ({ ...prev, billingAddress: { ...prev.shippingAddress } })); } };
  const handleSave = async () => {
    setIsSaving(true);
    const getFinalAddress = (address) => isAddressEmpty(address) ? undefined : address;
    const payload = { username: form.username, firstName: form.firstName, lastName: form.lastName, shippingAddress: getFinalAddress(form.shippingAddress), billingAddress: billingSameAsShipping ? getFinalAddress(form.shippingAddress) : getFinalAddress(form.billingAddress) };
    try { const { data } = await client.put('/auth/profile', payload); setAuthUser(prev => ({...prev, ...data})); setEditing(false); toast({ title: "Profile Updated", status: "success" }); } 
    catch (error) { toast({ title: "Error Saving Profile", description: error.response?.data?.message, status: "error" }); } 
    finally { setIsSaving(false); }
  };
  const handleCancel = () => { setEditing(false); /* Logic to revert form state */ };
  const handlePasswordFormChange = (e) => { const { name, value } = e.target; setPasswordForm(prev => ({ ...prev, [name]: value })); };
  const handleChangePassword = async (e) => { e.preventDefault(); if (passwordForm.newPassword !== passwordForm.confirmNewPassword) { toast({ title: "Passwords do not match", status: "error" }); return; } setIsPasswordSaving(true); try { await client.put('/auth/change-password', { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }); toast({ title: "Password Changed", status: "success" }); setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' }); onPasswordSectionToggle(); } catch (error) { toast({ title: "Password Change Failed", description: error.response?.data?.message, status: "error" }); } finally { setIsPasswordSaving(false); } };

  if (loadingAuth || isLoading) { return <VStack justifyContent="center" minH="60vh"><Spinner size="xl" /></VStack>; }
  if (!user) { return <Text>Please log in to view your profile.</Text>; }

  const renderAddressFields = (addressType, legend) => (
    <VStack spacing={4} align="stretch" w="100%">
      {legend && <Heading as="h3" size="md" mb={2}>{legend}</Heading>}
      <FormControl><FormLabel>Recipient Name</FormLabel><Input name="recipientName" value={form[addressType]?.recipientName || ''} onChange={(e) => handleAddressChange(e, addressType)} isReadOnly={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} /></FormControl>
      <FormControl><FormLabel>Street Address</FormLabel><Input name="street1" value={form[addressType]?.street1 || ''} onChange={(e) => handleAddressChange(e, addressType)} isReadOnly={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} /></FormControl>
      <SimpleGrid columns={3} spacing={4}><FormControl><FormLabel>City</FormLabel><Input name="city" value={form[addressType]?.city || ''} onChange={(e) => handleAddressChange(e, addressType)} isReadOnly={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} /></FormControl><FormControl><FormLabel>State</FormLabel><Input name="state" value={form[addressType]?.state || ''} onChange={(e) => handleAddressChange(e, addressType)} isReadOnly={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} /></FormControl><FormControl><FormLabel>Zip</FormLabel><Input name="zipCode" value={form[addressType]?.zipCode || ''} onChange={(e) => handleAddressChange(e, addressType)} isReadOnly={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} /></FormControl></SimpleGrid>
      <FormControl><FormLabel>Country</FormLabel><Input name="country" value={form[addressType]?.country || ''} onChange={(e) => handleAddressChange(e, addressType)} isReadOnly={!editing || (addressType === 'billingAddress' && billingSameAsShipping)} /></FormControl>
    </VStack>
  );

  return (
    <Box>
      <Heading as="h1" size="pageTitle">My Profile</Heading>
      <VStack spacing={6} align="stretch">
        <Card><CardBody p={{base: 4, md: 8}}>
          <VStack spacing={4} align="stretch" as="form" onSubmit={(e) => { e.preventDefault(); if(editing) handleSave(); }}>
            <Heading as="h2" size="lg">Account Information</Heading>
            <FormControl><FormLabel>Username</FormLabel><Input name="username" value={form.username} onChange={handleTopLevelChange} isReadOnly={!editing} /></FormControl>
            <FormControl><FormLabel>Email</FormLabel><Input name="email" type="email" value={form.email} isReadOnly /></FormControl>
            <FormControl><FormLabel>First Name</FormLabel><Input name="firstName" value={form.firstName} onChange={handleTopLevelChange} isReadOnly={!editing} /></FormControl>
            <FormControl><FormLabel>Last Name</FormLabel><Input name="lastName" value={form.lastName} onChange={handleTopLevelChange} isReadOnly={!editing} /></FormControl>
            <Divider my={4} borderColor="brand.primaryLight"/>
            {renderAddressFields('shippingAddress', 'Shipping Address')}
            <Divider my={4} borderColor="brand.primaryLight" />
            <Heading as="h2" size="lg">Billing Address</Heading>
            <Checkbox isChecked={billingSameAsShipping} onChange={handleBillingSameAsShippingChange} isDisabled={!editing}>Billing address is the same as shipping</Checkbox>
            {!billingSameAsShipping && renderAddressFields('billingAddress')}
            <Stack direction="row" spacing={4} mt={6} w="full">
              {!editing ? (<Button onClick={() => setEditing(true)} colorScheme="brandAccentYellow" color="brand.textDark" leftIcon={<Icon as={FaEdit}/>}>Edit Profile</Button>) : 
              (<><Button type="submit" colorScheme="brandAccentOrange" isLoading={isSaving} leftIcon={<Icon as={FaSave}/>}>Save Changes</Button><Button variant="ghost" onClick={handleCancel} leftIcon={<Icon as={FaTimes}/>}>Cancel</Button></>)}
            </Stack>
          </VStack>
        </CardBody></Card>
        <Card><CardBody>
          <Flex as="button" onClick={onPasswordSectionToggle} align="center" justify="space-between" w="100%"><Heading as="h2" size="lg"><Icon as={FaKey} mr={3} />Change Password</Heading><Icon as={isPasswordSectionOpen ? FaChevronUp : FaChevronDown} /></Flex>
          <Collapse in={isPasswordSectionOpen} animateOpacity><Box as="form" onSubmit={handleChangePassword} pt={4}><VStack spacing={4} align="stretch">
              <FormControl><FormLabel>Current Password</FormLabel><InputGroup><Input name="currentPassword" type={showCurrentPassword ? "text":"password"} value={passwordForm.currentPassword} onChange={handlePasswordFormChange} /><InputRightElement><ChakraIconButton variant="ghost" icon={showCurrentPassword ? <FaEyeSlash />:<FaEye />} onClick={()=>setShowCurrentPassword(!showCurrentPassword)}/></InputRightElement></InputGroup></FormControl>
              <FormControl><FormLabel>New Password</FormLabel><InputGroup><Input name="newPassword" type={showNewPassword ? "text":"password"} value={passwordForm.newPassword} onChange={handlePasswordFormChange} /><InputRightElement><ChakraIconButton variant="ghost" icon={showNewPassword ? <FaEyeSlash />:<FaEye />} onClick={()=>setShowNewPassword(!showNewPassword)}/></InputRightElement></InputGroup></FormControl>
              <FormControl><FormLabel>Confirm New Password</FormLabel><InputGroup><Input name="confirmNewPassword" type={showConfirmNewPassword ? "text":"password"} value={passwordForm.confirmNewPassword} onChange={handlePasswordFormChange} /><InputRightElement><ChakraIconButton variant="ghost" icon={showConfirmNewPassword ? <FaEyeSlash />:<FaEye />} onClick={()=>setShowConfirmNewPassword(!showConfirmNewPassword)}/></InputRightElement></InputGroup></FormControl>
              <Button type="submit" colorScheme="brandAccentOrange" w="auto" alignSelf="flex-start" isLoading={isPasswordSaving}>Update Password</Button>
          </VStack></Box></Collapse>
        </CardBody></Card>
      </VStack>
    </Box>
  );
}
