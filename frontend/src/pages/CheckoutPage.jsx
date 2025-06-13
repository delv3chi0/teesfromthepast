import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { client } from '../api/client';
import CheckoutForm from '../components/CheckoutForm';
import {
    Box, Heading, Text, Spinner, Alert, AlertIcon, VStack, Button,
    FormControl, FormLabel, Input, Checkbox, Divider, SimpleGrid, Icon,
    useToast, HStack, Image, Grid, GridItem,
    Collapse // MODIFIED: Added the missing import for Collapse
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { FaArrowRight } from 'react-icons/fa';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const initialAddressState = { recipientName: '', street1: '', street2: '', city: '', state: '', zipCode: '', country: '', phone: '' };

const ThemedInput = (props) => ( <Input bg="brand.primaryDark" borderColor="whiteAlpha.300" _hover={{ borderColor: "whiteAlpha.400" }} focusBorderColor="brand.accentYellow" size="lg" {...props} /> );

export default function CheckoutPage() {
    const { user, setUser: setAuthUser, logout } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    
    const [itemToCheckout, setItemToCheckout] = useState(null);
    const [step, setStep] = useState(1);
    const [addressForm, setAddressForm] = useState({ shippingAddress: { ...initialAddressState }, billingAddress: { ...initialAddressState } });
    const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
    const [isProcessingAction, setIsProcessingAction] = useState(false);
    const [clientSecret, setClientSecret] = useState('');
    const [loadingPageData, setLoadingPageData] = useState(true);
    const [error, setError] = useState('');
    const [paymentDetails, setPaymentDetails] = useState({ amount: 0, currency: 'usd' });

    useEffect(() => {
        setLoadingPageData(true);
        const storedItemJSON = localStorage.getItem('itemToCheckout');
        if (storedItemJSON) {
            try {
                const item = JSON.parse(storedItemJSON);
                setItemToCheckout(item);
                // NOTE: We are not removing the item from localStorage anymore on page load.
                // It will be removed after a successful payment in PaymentSuccessPage.
            } catch (e) { setError("There was an error retrieving your item details."); }
        }
        if (user) {
            const sa = { ...initialAddressState, ...(user.shippingAddress || {}) };
            const ba = { ...initialAddressState, ...(user.billingAddress || {}) };
            if (!sa.recipientName && (user.firstName || user.lastName)) { sa.recipientName = `${user.firstName || ''} ${user.lastName || ''}`.trim(); }
            setAddressForm({ shippingAddress: sa, billingAddress: ba });
            const addressesAreIdentical = user.shippingAddress && user.billingAddress && Object.keys(sa).every(key => sa[key] === ba[key] && sa[key]);
            const billingIsEmpty = !user.billingAddress || Object.values(user.billingAddress).every(v => !v);
            if (addressesAreIdentical || billingIsEmpty) {
                setBillingSameAsShipping(true);
                if (billingIsEmpty) setAddressForm(prev => ({ ...prev, billingAddress: { ...prev.shippingAddress } }));
            } else { setBillingSameAsShipping(false); }
        }
        setLoadingPageData(false);
    }, [user]);

    const handleAddressChange = (e, addressType) => {
        const { name, value } = e.target;
        setAddressForm(prevForm => {
            const updatedAddress = { ...prevForm[addressType], [name]: value };
            if (billingSameAsShipping && addressType === 'shippingAddress') { return { ...prevForm, shippingAddress: updatedAddress, billingAddress: { ...updatedAddress } }; }
            return { ...prevForm, [addressType]: updatedAddress };
        });
    };

    const handleBillingSameAsShippingChange = (e) => {
        const isChecked = e.target.checked;
        setBillingSameAsShipping(isChecked);
        if (isChecked) { setAddressForm(prevForm => ({ ...prevForm, billingAddress: { ...prevForm.shippingAddress } })); }
        else { setAddressForm(prevForm => ({ ...prevForm, billingAddress: { ...initialAddressState, ...(user?.billingAddress || {}) } })); }
    };

    const handleProceedToPayment = async () => {
        setIsProcessingAction(true);
        setError('');
        const requiredAddressFields = ['recipientName', 'street1', 'city', 'state', 'zipCode', 'country'];
        for (const field of requiredAddressFields) {
            if (!addressForm.shippingAddress[field]) {
                toast({ title: "Missing Shipping Information", description: `Please complete all required fields in your shipping address.`, status: "error", isClosable: true });
                setIsProcessingAction(false); return;
            }
            if (!billingSameAsShipping && !addressForm.billingAddress[field]) {
                toast({ title: "Missing Billing Information", description: `Please complete all required fields in your billing address.`, status: "error", isClosable: true });
                setIsProcessingAction(false); return;
            }
        }
        try {
            const { data: updatedProfile } = await client.put('/auth/profile', { shippingAddress: addressForm.shippingAddress, billingAddress: addressForm.billingAddress });
            if (setAuthUser) setAuthUser(updatedProfile);
            toast({ title: "Addresses Saved to Profile", status: "success", duration: 2000, isClosable: true });
            const paymentIntentPayload = {
                items: [{ productId: itemToCheckout.productId, variantSku: itemToCheckout.variantSku, designId: itemToCheckout.designId, quantity: 1 }],
                currency: 'usd',
                shippingAddress: addressForm.shippingAddress,
            };
            const res = await client.post('/checkout/create-payment-intent', paymentIntentPayload);
            if (res.data.clientSecret) {
                setClientSecret(res.data.clientSecret);
                setPaymentDetails({ amount: res.data.amount, currency: res.data.currency });
                setStep(2);
            } else { throw new Error("Failed to retrieve client_secret for payment."); }
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to proceed. Please ensure addresses are correct and try again.';
            setError(errorMsg);
            if (err.response?.status === 401) { logout(); navigate('/login'); }
        } finally {
            setIsProcessingAction(false);
        }
    };

    const renderAddressFields = (addressType, legend) => (
        <VStack spacing={4} align="stretch" w="100%">
            <Heading as="h3" size="lg" color="brand.textLight" mb={2}>{legend}</Heading>
            <FormControl isRequired><FormLabel color="whiteAlpha.800">Recipient Name</FormLabel><ThemedInput name="recipientName" value={addressForm[addressType]?.recipientName || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} /></FormControl>
            <FormControl isRequired><FormLabel color="whiteAlpha.800">Street Address 1</FormLabel><ThemedInput name="street1" value={addressForm[addressType]?.street1 || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} /></FormControl>
            <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
                <FormControl isRequired><FormLabel color="whiteAlpha.800">City</FormLabel><ThemedInput name="city" value={addressForm[addressType]?.city || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} /></FormControl>
                <FormControl isRequired><FormLabel color="whiteAlpha.800">State/Province</FormLabel><ThemedInput name="state" value={addressForm[addressType]?.state || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} /></FormControl>
                <FormControl isRequired><FormLabel color="whiteAlpha.800">Zip/Postal Code</FormLabel><ThemedInput name="zipCode" value={addressForm[addressType]?.zipCode || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} /></FormControl>
            </SimpleGrid>
            <FormControl isRequired><FormLabel color="whiteAlpha.800">Country</FormLabel><ThemedInput name="country" placeholder="e.g., US, CA, GB" value={addressForm[addressType]?.country || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} /></FormControl>
        </VStack>
    );
    
    if (loadingPageData) return <VStack minH="60vh" justify="center"><Spinner size="xl" color="brand.accentYellow" thickness="4px" /><Text mt={4} fontSize="lg" color="brand.textLight">Loading Checkout...</Text></VStack>;
    if (!itemToCheckout && !error) return <VStack minH="60vh" justify="center" px={4}><Alert status="warning" bg="yellow.900" p={6} borderRadius="lg" flexDirection="column" maxW="md"><AlertIcon color="yellow.400" boxSize="30px"/><Heading size="md" color="brand.textLight" mt={3}>No Product Selected</Heading><Text color="whiteAlpha.800" mt={2}>Please go to the studio to customize your apparel first.</Text><Button mt={6} bg="brand.accentYellow" color="brand.textDark" _hover={{bg:"brand.accentYellowHover"}} onClick={() => navigate('/product-studio')}>Go to Product Studio</Button></Alert></VStack>;
    
    const appearance = { theme: 'night', variables: { colorPrimary: '#DD6B20', colorBackground: '#2D3748', colorText: '#F7FAFC', colorDanger: '#FC8181', fontFamily: 'Inter, sans-serif', spacingUnit: '4px', borderRadius: '8px' }};
    const stripeOptions = clientSecret ? { clientSecret, appearance } : {};

    return (
        <Box maxW="container.lg" mx="auto" pb={10} px={{base: 2, md: 4}}>
            <Heading as="h1" size="2xl" color="brand.textLight" textAlign="left" w="100%" mb={8}>Checkout</Heading>
            {error && <Alert status="error" bg="red.900" borderRadius="md" p={4} mb={6}><AlertIcon color="red.300" /><Text color="white" fontWeight="medium">{error}</Text></Alert>}
            
            <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={{base: 8, lg: 10}}>
                <GridItem>
                    <Box bg="brand.primaryLight" p={{base:5, md:8}} borderRadius="xl">
                        {step === 1 && (
                            <VStack spacing={6} align="stretch">
                                {renderAddressFields('shippingAddress', 'Shipping Address')}
                                <Divider my={4} borderColor="whiteAlpha.300"/>
                                <FormControl display="flex" alignItems="center">
                                    <Checkbox id="billingSameAsShipping" isChecked={billingSameAsShipping} onChange={handleBillingSameAsShippingChange} colorScheme="yellow" size="lg" color="whiteAlpha.900">Billing address is the same as shipping</Checkbox>
                                </FormControl>
                                <Collapse in={!billingSameAsShipping} animateOpacity>{renderAddressFields('billingAddress', 'Billing Address')}</Collapse>
                                <Button onClick={handleProceedToPayment} isLoading={isProcessingAction} loadingText="Saving & Proceeding..." bg="brand.accentOrange" color="white" _hover={{bg: 'brand.accentOrangeHover'}} size="lg" width="full" mt={6} rightIcon={<Icon as={FaArrowRight} />}>Continue to Payment</Button>
                            </VStack>
                        )}
                        {step === 2 && clientSecret && (
                            <VStack spacing={6} align="stretch">
                                <Heading as="h3" size="lg" color="brand.textLight">Payment Details</Heading>
                                <Text fontSize="lg" color="whiteAlpha.800">Total Amount: <Text as="span" fontWeight="bold" color="brand.accentYellow">${(paymentDetails.amount / 100).toFixed(2)} {paymentDetails.currency.toUpperCase()}</Text></Text>
                                <Elements options={stripeOptions} stripe={stripePromise}><CheckoutForm itemDetails={itemToCheckout} /></Elements>
                                <Text fontSize="xs" color="whiteAlpha.600" pt={4} textAlign="center">We value your privacy. All payment information is processed securely by Stripe.</Text>
                            </VStack>
                        )}
                    </Box>
                </GridItem>
                
                <GridItem position="sticky" top="8rem" alignSelf="start">
                    {itemToCheckout && (
                        <Box p={{base: 4, md: 6}} bg="brand.primaryLight" borderRadius="xl">
                            <Heading as="h3" size="lg" color="brand.textLight" mb={4} borderBottomWidth="2px" borderColor="whiteAlpha.300" pb={3}>Order Summary</Heading>
                            <HStack spacing={5} align="flex-start">
                                <Image src={itemToCheckout.productImage || 'https://placehold.co/100x100?text=Item'} alt={itemToCheckout.productName} boxSize="120px" objectFit="cover" borderRadius="md" bg="brand.primaryDark"/>
                                <VStack align="flex-start" spacing={1}>
                                    <Text fontWeight="bold" fontSize="lg" color="brand.textLight">{itemToCheckout.productName}</Text>
                                    <Text fontSize="md" color="whiteAlpha.800">Color: {itemToCheckout.color}, Size: {itemToCheckout.size}</Text>
                                    {itemToCheckout.prompt && <Text fontSize="sm" color="whiteAlpha.700" noOfLines={2}>Design: "{itemToCheckout.prompt}"</Text>}
                                </VStack>
                            </HStack>
                        </Box>
                    )}
                </GridItem>
            </Grid>
        </Box>
    );
}
