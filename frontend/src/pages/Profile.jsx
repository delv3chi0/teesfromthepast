// frontend/src/pages/Profile.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Heading, Input, Button, Text, Stack, useToast, VStack, Icon, FormControl, FormLabel, Spinner, Checkbox, Divider, SimpleGrid, InputGroup, InputRightElement, IconButton as ChakraIconButton, Collapse, useDisclosure, Flex } from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaSave, FaEdit, FaTimes, FaKey, FaEye, FaEyeSlash, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const initialAddressState = { recipientName: '', street1: '', street2: '', city: '', state: '', zipCode: '', country: '', phone: '' };
const isAddressEmpty = (address) => !address || Object.values(address).every(v => v === '');

// This component is specifically for inputs that need LIGHT text on a DARK background.
// We'll use this for ALL inputs on the profile page now.
const ThemedInput = (props) => (
    <Input
        bg="brand.secondary" // Dark background for input fields
        borderColor="whiteAlpha.300"
        color="brand.textLight" // CRITICAL: Text color is light for dark background
        _placeholder={{ color: "brand.textMuted" }}
        _hover={{ borderColor: "brand.accentYellow" }}
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
        try { const { data } = await client.put('/auth/profile', payload); setAuthUser(prev => ({ ...prev, ...data })); setEditing(false); toast({ title: "Profile Updated", status: "success", isClosable: true }); }
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
        // Changed to use 'darkInnerSection' for all editable/viewable fields
        <Box layerStyle="darkInnerSection" w="100%">
            <VStack spacing={4} align="stretch" w="100%">
                <FormControl><FormLabel>Recipient Name</FormLabel>{editing && !(addressType === 'billingAddress' && billingSameAsShipping) ? <ThemedInput name="recipientName" value={form[addressType]?.recipientName || ''} onChange={(e) => handleAddressChange(e, addressType)} /> : <ThemedInput isReadOnly value={form[addressType]?.recipientName || ''} />}</FormControl>
                <FormControl><FormLabel>Street Address</FormLabel>{editing && !(addressType === 'billingAddress' && billingSameAsShipping) ? <ThemedInput name="street1" value={form[addressType]?.street1 || ''} onChange={(e) => handleAddressChange(e, addressType)} /> : <ThemedInput isReadOnly value={form[addressType]?.street1 || ''} />}</FormControl>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <FormControl><FormLabel>City</FormLabel>{editing && !(addressType === 'billingAddress' && billingSameAsShipping) ? <ThemedInput name="city" value={form[addressType]?.city || ''} onChange={(e) => handleAddressChange(e, addressType)} /> : <ThemedInput isReadOnly value={form[addressType]?.city || ''} />}</FormControl>
                    <FormControl><FormLabel>State</FormLabel>{editing && !(addressType === 'billingAddress' && billingSameAsShipping) ? <ThemedInput name="state" value={form[addressType]?.state || ''} onChange={(e) => handleAddressChange(e, addressType)} /> : <ThemedInput isReadOnly value={form[addressType]?.state || ''} />}</FormControl>
                    <FormControl><FormLabel>Zip</FormLabel>{editing && !(addressType === 'billingAddress' && billingSameAsShipping) ? <ThemedInput name="zipCode" value={form[addressType]?.zipCode || ''} onChange={(e) => handleAddressChange(e, addressType)} /> : <ThemedInput isReadOnly value={form[addressType]?.zipCode || ''} />}</FormControl>
                </SimpleGrid>
                <FormControl><FormLabel>Country</FormLabel>{editing && !(addressType === 'billingAddress' && billingSameAsShipping) ? <ThemedInput name="country" value={form[addressType]?.country || ''} onChange={(e) => handleAddressChange(e, addressType)} /> : <ThemedInput isReadOnly value={form[addressType]?.country || ''} />}</FormControl>
            </VStack>
        </Box>
    );

    const renderPasswordInput = (name, value, setter, show, toggleShow) => (
        <InputGroup>
            {/* ThemedInput is used here because this section's background is dark */}
            <ThemedInput name={name} type={show ? "text" : "password"} value={value} onChange={setter} />
            {/* Icon button color for visibility */}
            <InputRightElement>
                <ChakraIconButton variant="ghost" color="brand.textLight" _hover={{ color: "brand.accentYellow", bg: "whiteAlpha.200" }} icon={show ? <FaEyeSlash /> : <FaEye />} onClick={toggleShow} />
            </InputRightElement>
        </InputGroup>
    );

    return (
        <VStack spacing={8} align="stretch" px={{ base: 4, md: 8 }} py={8}>
            <Heading as="h1" size="2xl" color="brand.textLight" textAlign="center" mb={6}>My Profile</Heading>

            {/* Main Profile Card - now uses brand.paper background */}
            <Box bg="brand.paper" borderRadius="xl" shadow="xl" p={{ base: 5, md: 8 }}>
                <VStack spacing={6} align="stretch" as="form" onSubmit={(e) => { e.preventDefault(); if (editing) handleSave(); }}>
                    <Heading as="h2" size="lg" color="brand.textLight" mb={4}>Account Information</Heading> {/* Heading text is light */}

                    {/* Account info fields wrapped in a dark inner section (brand.secondary) */}
                    <Box layerStyle="darkInnerSection" w="100%">
                        <VStack spacing={4} align="stretch">
                            <FormControl><FormLabel>Username</FormLabel>{editing ? <ThemedInput name="username" value={form.username} onChange={handleTopLevelChange} /> : <ThemedInput isReadOnly value={form.username} />}</FormControl>
                            <FormControl><FormLabel>Email</FormLabel><ThemedInput isReadOnly name="email" type="email" value={form.email} /></FormControl>
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                <FormControl><FormLabel>First Name</FormLabel>{editing ? <ThemedInput name="firstName" value={form.firstName} onChange={handleTopLevelChange} /> : <ThemedInput isReadOnly value={form.firstName} />}</FormControl>
                                <FormControl><FormLabel>Last Name</FormLabel>{editing ? <ThemedInput name="lastName" value={form.lastName} onChange={handleTopLevelChange} /> : <ThemedInput isReadOnly value={form.lastName} />}</FormControl>
                            </SimpleGrid>
                        </VStack>
                    </Box>

                    <Divider my={6} borderColor="whiteAlpha.300" /> {/* Divider adjusted for dark background */}
                    <Heading as="h3" size="lg" color="brand.textLight" mb={4}>Shipping Address</Heading>
                    {renderAddressFields('shippingAddress')}

                    <Divider my={6} borderColor="whiteAlpha.300" />
                    <Heading as="h3" size="lg" color="brand.textLight" mb={4}>Billing Address</Heading>
                    <Checkbox
                        isChecked={billingSameAsShipping}
                        onChange={handleBillingSameAsShippingChange}
                        isDisabled={!editing}
                        size="lg"
                        colorScheme="yellow"
                        color="brand.textLight" // Checkbox text needs to be light on this dark background
                    >
                        Billing address is the same as shipping
                    </Checkbox>
                    <Collapse in={!billingSameAsShipping} animateOpacity>
                        {renderAddressFields('billingAddress')}
                    </Collapse>

                    <Stack direction={{ base: 'column', md: 'row' }} spacing={4} mt={8} w="full">
                        {!editing ? (
                            <Button onClick={() => setEditing(true)} colorScheme="brandAccentYellow" leftIcon={<Icon as={FaEdit} />} size="lg">Edit Profile</Button>
                        ) : (
                            <>
                                <Button type="submit" colorScheme="brandAccentOrange" isLoading={isSaving} leftIcon={<Icon as={FaSave} />} size="lg">Save Changes</Button>
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    leftIcon={<Icon as={FaTimes} />}
                                    size="lg"
                                    // These will be styled by the outline variant in theme.js
                                >
                                    Cancel
                                </Button>
                            </>
                        )}
                    </Stack>
                </VStack>
            </Box>

            {/* Change Password Card - also uses brand.paper background */}
            <Box bg="brand.paper" borderRadius="xl" shadow="xl" p={{ base: 5, md: 8 }}>
                <Flex as="button" onClick={onPasswordSectionToggle} align="center" justify="space-between" w="100%" px={0} py={2}>
                    <Heading as="h2" size="lg" color="brand.textLight">
                        <Icon as={FaKey} mr={3} verticalAlign="middle" color="brand.accentYellow" />Change Password
                    </Heading>
                    <Icon as={isPasswordSectionOpen ? FaChevronUp : FaChevronDown} boxSize={6} color="brand.accentYellow" />
                </Flex>
                <Collapse in={isPasswordSectionOpen} animateOpacity>
                    <Box as="form" onSubmit={handleChangePassword} pt={6}>
                        {/* Uses darkInnerSection, which already styles for dark bg & light text */}
                        <Box layerStyle="darkInnerSection" w="100%">
                            <VStack spacing={4} align="stretch">
                                <FormControl isRequired><FormLabel>Current Password</FormLabel>{renderPasswordInput("currentPassword", passwordForm.currentPassword, handlePasswordFormChange, showCurrentPassword, () => setShowCurrentPassword(!showCurrentPassword))}</FormControl>
                                <FormControl isRequired><FormLabel>New Password</FormLabel>{renderPasswordInput("newPassword", passwordForm.newPassword, handlePasswordFormChange, showNewPassword, () => setShowNewPassword(!showNewPassword))}</FormControl>
                                <FormControl isRequired><FormLabel>Confirm New Password</FormLabel>{renderPasswordInput("confirmNewPassword", passwordForm.confirmNewPassword, handlePasswordFormChange, showConfirmNewPassword, () => setShowConfirmNewPassword(!showConfirmNewPassword))}</FormControl>
                            </VStack>
                        </Box>
                        <Button type="submit" colorScheme="brandAccentOrange" w="auto" alignSelf="flex-start" isLoading={isPasswordSaving} mt={6}>Update Password</Button>
                    </Box>
                </Collapse>
            </Box>
        </VStack>
    );
}
