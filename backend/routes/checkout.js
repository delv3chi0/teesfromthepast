// frontend/src/pages/CheckoutPage.jsx
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { client } from '../api/client';
import CheckoutForm from '../components/CheckoutForm';
import { 
    Box, Heading, Text, Spinner, Alert, AlertIcon, VStack, Button,
    FormControl, FormLabel, Input, Checkbox, Divider, SimpleGrid, Icon,
    useToast
} from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { FaArrowRight } from 'react-icons/fa';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const initialAddressState = {
  recipientName: '', street1: '', street2: '', city: '', state: '', zipCode: '', country: '', phone: ''
};

export default function CheckoutPage() {
  const { user, setUser: setAuthUser, logout } = useAuth(); // Get user and setUser for profile updates
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  
  const { designToCheckout } = location.state || {}; // Product details from ProductStudio

  const [step, setStep] = useState(1); // 1 for address, 2 for payment
  const [addressForm, setAddressForm] = useState({
    shippingAddress: { ...initialAddressState },
    billingAddress: { ...initialAddressState },
  });
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const [clientSecret, setClientSecret] = useState('');
  const [loadingPaymentIntent, setLoadingPaymentIntent] = useState(false); // Separate loading for PI
  const [error, setError] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({ amount: 0, currency: 'usd' });

  // Populate address form from user context on load
  useEffect(() => {
    if (user) {
      const sa = { ...initialAddressState, ...(user.shippingAddress || {}) };
      const ba = { ...initialAddressState, ...(user.billingAddress || {}) };
      setAddressForm({ shippingAddress: sa, billingAddress: ba });

      const addressesAreIdentical = user.shippingAddress && user.billingAddress &&
        Object.keys(sa).every(key => sa[key] === ba[key]);
      
      if (addressesAreIdentical) setBillingSameAsShipping(true);
      else if (user.shippingAddress && !user.billingAddress) setBillingSameAsShipping(true);
      else if (!user.shippingAddress && !user.billingAddress) setBillingSameAsShipping(true);
      else setBillingSameAsShipping(false);
    }
  }, [user]);

  const handleAddressChange = (e, addressType) => {
    const { name, value } = e.target;
    setAddressForm(prevForm => {
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
      setAddressForm(prevForm => ({ ...prevForm, billingAddress: { ...prevForm.shippingAddress } }));
    }
  };

  const handleProceedToPayment = async () => {
    setIsSavingAddress(true);
    setError('');

    const shipping = { ...addressForm.shippingAddress };
    if (!shipping.recipientName && user) { // Autofill recipient name if empty
        shipping.recipientName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
    }
    
    const billing = billingSameAsShipping ? { ...shipping } : { ...addressForm.billingAddress };
    if (!billing.recipientName && user && billingSameAsShipping) {
        billing.recipientName = shipping.recipientName;
    } else if (!billing.recipientName && user && !billingSameAsShipping) {
        billing.recipientName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
    }


    // Validate required shipping fields (basic example)
    if (!shipping.recipientName || !shipping.street1 || !shipping.city || !shipping.state || !shipping.zipCode || !shipping.country) {
        toast({ title: "Missing Shipping Information", description: "Please complete all required shipping address fields.", status: "error", duration: 4000 });
        setIsSavingAddress(false);
        return;
    }
    if (!billingSameAsShipping && (!billing.recipientName || !billing.street1 || !billing.city || !billing.state || !billing.zipCode || !billing.country)) {
        toast({ title: "Missing Billing Information", description: "Please complete all required billing address fields.", status: "error", duration: 4000 });
        setIsSavingAddress(false);
        return;
    }

    try {
      // Step 1: Save/Update profile with these addresses
      const profileUpdateData = {
        shippingAddress: shipping,
        billingAddress: billing,
      };
      const { data: updatedProfile } = await client.put('/auth/profile', profileUpdateData);
      if (setAuthUser) {
        setAuthUser(updatedProfile); // Update auth context
      }
      toast({ title: "Addresses Saved", status: "success", duration: 2000 });

      // Step 2: Create Payment Intent
      setLoadingPaymentIntent(true);
      const paymentIntentPayload = {
        items: [{ id: designToCheckout?.designId || 'default_item', quantity: 1 }],
        currency: 'usd',
        shippingAddress: shipping, // Send shipping address to backend for Stripe
      };
      const res = await client.post('/checkout/create-payment-intent', paymentIntentPayload);
      setClientSecret(res.data.clientSecret);
      setPaymentDetails({ amount: res.data.amount, currency: res.data.currency });
      setStep(2); // Move to payment step

    } catch (err) {
      console.error("CheckoutPage Error (Saving Address or Creating PI):", err);
      setError(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to proceed. Please try again.');
      if (err.response?.status === 401) { logout(); navigate('/login'); }
    } finally {
      setIsSavingAddress(false);
      setLoadingPaymentIntent(false);
    }
  };

  const renderAddressFields = (addressType, legend) => (
    <VStack spacing={4} align="stretch" w="100%">
      <Heading as="h3" size="md" color="brand.textDark" mb={2}>{legend}</Heading>
      <FormControl isRequired id={`${addressType}RecipientName`}>
        <FormLabel>Recipient Name</FormLabel>
        <Input name="recipientName" value={addressForm[addressType]?.recipientName || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping name' : 'billing name'}`} />
      </FormControl>
      <FormControl isRequired id={`${addressType}Street1`}>
        <FormLabel>Street Address 1</FormLabel>
        <Input name="street1" value={addressForm[addressType]?.street1 || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping address-line1' : 'billing address-line1'}`} />
      </FormControl>
      <FormControl id={`${addressType}Street2`}>
        <FormLabel>Street Address 2 (Optional)</FormLabel>
        <Input name="street2" value={addressForm[addressType]?.street2 || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping address-line2' : 'billing address-line2'}`} />
      </FormControl>
      <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
        <FormControl isRequired id={`${addressType}City`}>
          <FormLabel>City</FormLabel>
          <Input name="city" value={addressForm[addressType]?.city || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping address-level2' : 'billing address-level2'}`} />
        </FormControl>
        <FormControl isRequired id={`${addressType}State`}>
          <FormLabel>State/Province</FormLabel>
          <Input name="state" value={addressForm[addressType]?.state || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping address-level1' : 'billing address-level1'}`} />
        </FormControl>
        <FormControl isRequired id={`${addressType}ZipCode`}>
          <FormLabel>Zip/Postal Code</FormLabel>
          <Input name="zipCode" value={addressForm[addressType]?.zipCode || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping postal-code' : 'billing postal-code'}`} />
        </FormControl>
      </SimpleGrid>
      <FormControl isRequired id={`${addressType}Country`}>
        <FormLabel>Country</FormLabel>
        <Input name="country" value={addressForm[addressType]?.country || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping country-name' : 'billing country-name'}`} />
      </FormControl>
      <FormControl id={`${addressType}Phone`}>
        <FormLabel>Phone (Optional)</FormLabel>
        <Input name="phone" type="tel" value={addressForm[addressType]?.phone || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping tel' : 'billing tel'}`} />
      </FormControl>
    </VStack>
  );

  if (!designToCheckout && !error) { // Handle case where user lands here without product state
    return (
      <VStack justifyContent="center" alignItems="center" minH="60vh" px={4} textAlign="center">
        <Alert status="warning" borderRadius="md" bg="yellow.50" p={6} flexDirection="column">
          <AlertIcon color="yellow.500" boxSize="30px"/>
          <Heading size="md" color="yellow.700" mt={3}>No Product Selected</Heading>
          <Text color="yellow.700" mt={2}>Please select a product from the studio to checkout.</Text>
          <Button mt={4} colorScheme="brandPrimary" onClick={() => navigate('/product-studio')}>Go to Product Studio</Button>
        </Alert>
      </VStack>
    );
  }

  const appearance = { theme: 'stripe', variables: { /* ... as before ... */ } };
  const stripeOptions = clientSecret ? { clientSecret, appearance } : {};

  return (
    <Box maxW="2xl" mx="auto" /* mt removed */ pb={10}> {/* Increased maxW for more space */}
      <Heading as="h1" size="xl" color="brand.textLight" textAlign="left" w="100%" mb={6}>
        Checkout
      </Heading>

      {/* Order Summary (Basic) */}
      {designToCheckout && (
        <Box mb={6} p={4} bg="brand.paper" borderRadius="md" shadow="md">
          <Heading as="h3" size="md" color="brand.textDark" mb={2}>Order Summary</Heading>
          <HStack>
            <Image src={designToCheckout.imageDataUrl || designToCheckout.productImage} alt={designToCheckout.prompt || "Product"} boxSize="75px" objectFit="cover" borderRadius="sm" />
            <VStack align="flex-start" spacing={0}>
              <Text fontWeight="bold" color="brand.textDark">{designToCheckout.productType || "Custom Apparel"}</Text>
              <Text fontSize="sm" color="gray.600">Color: {designToCheckout.color}, Size: {designToCheckout.size}</Text>
              {designToCheckout.prompt && <Text fontSize="xs" color="gray.500" noOfLines={1}>"{designToCheckout.prompt}"</Text>}
            </VStack>
          </HStack>
        </Box>
      )}
      
      {error && (
        <Alert status="error" borderRadius="md" bg="red.50" p={4} mb={6} w="100%">
          <AlertIcon color="red.500" /> {error}
        </Alert>
      )}

      {step === 1 && (
        <Box bg="brand.paper" p={{base:4, md:8}} borderRadius="xl" shadow="xl">
          {renderAddressFields('shippingAddress', 'Shipping Address')}
          <Divider my={6} />
          <FormControl display="flex" alignItems="center" mb={6}>
            <Checkbox id="billingSameAsShipping" isChecked={billingSameAsShipping} onChange={handleBillingSameAsShippingChange} colorScheme="brandPrimary" size="lg">
              Billing address is the same as shipping address
            </Checkbox>
          </FormControl>
          {!billingSameAsShipping && renderAddressFields('billingAddress', 'Billing Address')}
          <Button 
            onClick={handleProceedToPayment} 
            isLoading={isSavingAddress || loadingPaymentIntent} 
            loadingText="Proceeding..."
            bg="brand.accentYellow" color="brand.textDark" _hover={{bg: 'brand.accentYellowHover'}}
            size="lg" borderRadius="full" width="full" mt={6}
            rightIcon={<Icon as={FaArrowRight} />}
          >
            Continue to Payment
          </Button>
        </Box>
      )}

      {step === 2 && clientSecret && (
        <Box bg="brand.paper" p={{base:4, md:8}} borderRadius="xl" shadow="xl">
          <Heading as="h3" size="md" color="brand.textDark" mb={4}>Enter Payment Details</Heading>
          <Text fontSize="md" mb={6} color="brand.textDark">
            Total Amount: <Text as="span" fontWeight="bold">${(paymentDetails.amount / 100).toFixed(2)} {paymentDetails.currency.toUpperCase()}</Text>
          </Text>
          <Elements options={stripeOptions} stripe={stripePromise}>
            <CheckoutForm designDetails={designToCheckout} />
          </Elements>
          <Text fontSize="xs" color="gray.500" mt={6} textAlign="center">
            We value your privacy and will never sell your personal information. All payment information is processed securely by Stripe.
          </Text>
        </Box>
      )}
       {step === 2 && loadingPaymentIntent && !clientSecret && ( // If PI creation is in progress
        <VStack justifyContent="center" alignItems="center" minH="40vh">
          <Spinner size="xl" thickness="4px" color="brand.primary"/>
          <Text mt={3} color="brand.textTeal">Initializing secure payment...</Text>
        </VStack>
      )}
    </Box>
  );
}
