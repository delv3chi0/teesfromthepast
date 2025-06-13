import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Heading, Input, Button, Text, Stack, useToast, VStack, Icon, FormControl, FormLabel, Spinner, Checkbox, Divider, SimpleGrid, InputGroup, InputRightElement, IconButton, Collapse, useDisclosure, Flex } from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaSave, FaEdit, FaTimes, FaKey, FaEye, FaEyeSlash, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const initialAddressState = { recipientName: '', street1: '', street2: '', city: '', state: '', zipCode: '', country: '', phone: '' };
const isAddressEmpty = (address) => !address || Object.values(address).every(v => v === '');

const ReadOnlyInput = (props) => (
    <Input
        isReadOnly
        bg="whiteAlpha.100"
        borderColor="transparent"
        opacity={0.7}
        cursor="default"
        {...props}
    />
);

const ThemedInput = (props) => (
    <Input
        bg="brand.secondary" // Using a slightly darker input bg for better contrast on the card
        borderColor="whiteAlpha.300"
        _hover={{ borderColor: "whiteAlpha.400" }}
        focusBorderColor="brand.accentYellow"
        {...props}
    />
);

export default function Profile() {
    const { user, setUser: setAuthUser } = useAuth();
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
        try { const { data } = await client.put('/auth/profile', payload); setAuthUser(prev => ({...prev, ...data})); setEditing(false); toast({ title: "Profile Updated", status: "success", isClosable: true }); }
        catch (error) { toast({ title: "Error Saving Profile", description: error.response?.data?.message, status: "error", isClosable: true }); }
        finally { setIsSaving(false); }
    };
    
    const handleCancel = () => {
        setEditing(false);
        const shipping = { ...initialAddressState, ...(user.shippingAddress || {}) };
        const billing = { ...initialAddressState, ...(user.billingAddress || {}) };
        setForm({ username: user.username || '', email: user.email || '', firstName: user.firstName || '', lastName: user.lastName || '', shippingAddress: shipping, billingAddress: billing });
    };
    
    const handlePasswordFormChange = (e) => { const { name, value } = e.target; setPasswordForm(prev => ({ ...prev, [name]: value })); };
    
    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmNewPassword) { toast({ title: "New passwords do not match", status: "error", isClosable: true }); return; }
        if (passwordForm.newPassword.length < 6) { toast({ title: "Password too short", description: "New password must be at least 6 characters.", status: "error", isClosable: true }); return; }
        setIsPasswordSaving(true);
        try { await client.put('/auth/change-password', { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }); toast({ title: "Password Changed Successfully", status: "success", isClosable: true }); setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' }); onPasswordSectionToggle(); } catch (error) { toast({ title: "Password Change Failed", description: error.response?.data?.message, status: "error", isClosable: true }); } finally { setIsPasswordSaving(false); }
    };

    if (loadingAuth || isLoading) { return <VStack justifyContent="center" minH="60vh"><Spinner size="xl" color="brand.accentYellow" /></VStack>; }
    if (!user) { return <Text color="brand.textLight">Please log in to view your profile.</Text>; }

    const renderAddressFields = (addressType) => (
        <VStack spacing={4} align="stretch" w="100%">
            <FormControl><FormLabel>Recipient Name</FormLabel>{editing && !(addressType === 'billingAddress' && billingSameAsShipping) ? <ThemedInput name="recipientName" value={form[addressType]?.recipientName || ''} onChange={(e) => handleAddressChange(e, addressType)} /> : <ReadOnlyInput value={form[addressType]?.recipientName || ''} />}</FormControl>
            <FormControl><FormLabel>Street Address</FormLabel>{editing && !(addressType === 'billingAddress' && billingSameAsShipping) ? <ThemedInput name="street1" value={form[addressType]?.street1 || ''} onChange={(e) => handleAddressChange(e, addressType)} /> : <ReadOnlyInput value={form[addressType]?.street1 || ''} />}</FormControl>
            <SimpleGrid columns={{base: 1, md: 3}} spacing={4}>
                <FormControl><FormLabel>City</FormLabel>{editing && !(addressType === 'billingAddress' && billingSameAsShipping) ? <ThemedInput name="city" value={form[addressType]?.city || ''} onChange={(e) => handleAddressChange(e, addressType)} /> : <ReadOnlyInput value={form[addressType]?.city || ''} />}</FormControl>
                <FormControl><FormLabel>State</FormLabel>{editing && !(addressType === 'billingAddress' && billingSameAsShipping) ? <ThemedInput name="state" value={form[addressType]?.state || ''} onChange={(e) => handleAddressChange(e, addressType)} /> : <ReadOnlyInput value={form[addressType]?.state || ''} />}</FormControl>
                <FormControl><FormLabel>Zip</FormLabel>{editing && !(addressType === 'billingAddress' && billingSameAsShipping) ? <ThemedInput name="zipCode" value={form[addressType]?.zipCode || ''} onChange={(e) => handleAddressChange(e, addressType)} /> : <ReadOnlyInput value={form[addressType]?.zipCode || ''} />}</FormControl>
            </SimpleGrid>
            <FormControl><FormLabel>Country</FormLabel>{editing && !(addressType === 'billingAddress' && billingSameAsShipping) ? <ThemedInput name="country" value={form[addressType]?.country || ''} onChange={(e) => handleAddressChange(e, addressType)} /> : <ReadOnlyInput value={form[addressType]?.country || ''} />}</FormControl>
        </VStack>
    );
    
    const renderPasswordInput = (name, value, setter, show, toggleShow) => (
        <InputGroup>
            <ThemedInput name={name} type={show ? "text":"password"} value={value} onChange={setter} />
            <InputRightElement><IconButton variant="ghost" color="whiteAlpha.600" _hover={{color: "whiteAlpha.900", bg:"whiteAlpha.200"}} icon={show ? <FaEyeSlash />:<FaEye />} onClick={toggleShow}/></InputRightElement>
        </InputGroup>
    );

    return (
        <VStack spacing={8} align="stretch">
            <Heading as="h1" size="2xl" color="brand.textLight">My Profile</Heading>
            
            {/* MODIFIED: Changed bg="brand.primaryLight" to bg="brand.cardBlue" */}
            <Box bg="brand.cardBlue" p={{base: 5, md: 8}} borderRadius="xl">
                <VStack spacing={6} align="stretch" as="form" onSubmit={(e) => { e.preventDefault(); if(editing) handleSave(); }}>
                    <Heading as="h2" size="lg" color="brand.textLight">Account Information</Heading>
                    <FormControl><FormLabel>Username</FormLabel>{editing ? <ThemedInput name="username" value={form.username} onChange={handleTopLevelChange}/> : <ReadOnlyInput value={form.username}/>}</FormControl>
                    <FormControl><FormLabel>Email</FormLabel><ReadOnlyInput name="email" type="email" value={form.email} /></FormControl>
                    <SimpleGrid columns={{base: 1, md: 2}} spacing={4}>
                        <FormControl><FormLabel>First Name</FormLabel>{editing ? <ThemedInput name="firstName" value={form.firstName} onChange={handleTopLevelChange}/> : <ReadOnlyInput value={form.firstName}/>}</FormControl>
                        <FormControl><FormLabel>Last Name</FormLabel>{editing ? <ThemedInput name="lastName" value={form.lastName} onChange={handleTopLevelChange}/> : <ReadOnlyInput value={form.lastName}/>}</FormControl>
                    </SimpleGrid>

                    <Divider my={6} borderColor="whiteAlpha.300"/>
                    <Heading as="h3" size="lg" color="brand.textLight">Shipping Address</Heading>
                    {renderAddressFields('shippingAddress')}
                    
                    <Divider my={6} borderColor="whiteAlpha.300" />
                    <Heading as="h3" size="lg" color="brand.textLight">Billing Address</Heading>
                    <Checkbox isChecked={billingSameAsShipping} onChange={handleBillingSameAsShippingChange} isDisabled={!editing} size="lg" colorScheme="yellow">
                        Billing address is the same as shipping
                    </Checkbox>
                    <Collapse in={!billingSameAsShipping} animateOpacity>
                        {renderAddressFields('billingAddress')}
                    </Collapse>
                    
                    <Stack direction={{base: 'column', md: 'row'}} spacing={4} mt={8} w="full">
                        {!editing ? (
                            <Button onClick={() => setEditing(true)} colorScheme="brandAccentYellow" leftIcon={<Icon as={FaEdit}/>} size="lg">Edit Profile</Button>
                        ) : (
                            <>
                                <Button type="submit" colorScheme="brandAccentOrange" isLoading={isSaving} leftIcon={<Icon as={FaSave}/>} size="lg">Save Changes</Button>
                                <Button variant="ghost" onClick={handleCancel} leftIcon={<Icon as={FaTimes}/>} size="lg" _hover={{bg: 'whiteAlpha.200'}}>Cancel</Button>
                            </>
                        )}
                    </Stack>
                </VStack>
            </Box>

            {/* MODIFIED: Changed bg="brand.primaryLight" to bg="brand.cardBlue" */}
            <Box bg="brand.cardBlue" p={{base: 5, md: 8}} borderRadius="xl">
                <Flex as="button" onClick={onPasswordSectionToggle} align="center" justify="space-between" w="100%">
                    <Heading as="h2" size="lg" color="brand.textLight"><Icon as={FaKey} mr={3} verticalAlign="middle"/>Change Password</Heading>
                    <Icon as={isPasswordSectionOpen ? FaChevronUp : FaChevronDown} boxSize={6} />
                </Flex>
                <Collapse in={isPasswordSectionOpen} animateOpacity>
                    <Box as="form" onSubmit={handleChangePassword} pt={6}>
                        <VStack spacing={4} align="stretch">
                            <FormControl isRequired><FormLabel>Current Password</FormLabel>{renderPasswordInput("currentPassword", passwordForm.currentPassword, handlePasswordFormChange, showCurrentPassword, () => setShowCurrentPassword(!showCurrentPassword))}</FormControl>
                            <FormControl isRequired><FormLabel>New Password</FormLabel>{renderPasswordInput("newPassword", passwordForm.newPassword, handlePasswordFormChange, showNewPassword, () => setShowNewPassword(!showNewPassword))}</FormControl>
                            <FormControl isRequired><FormLabel>Confirm New Password</FormLabel>{renderPasswordInput("confirmNewPassword", passwordForm.confirmNewPassword, handlePasswordFormChange, showConfirmNewPassword, () => setShowConfirmNewPassword(!showConfirmNewPassword))}</FormControl>
                            <Button type="submit" colorScheme="brandAccentOrange" w="auto" alignSelf="flex-start" isLoading={isPasswordSaving}>Update Password</Button>
                        </VStack>
                    </Box>
                </Collapse>
            </Box>
        </VStack>
    );
}
