// frontend/src/pages/CheckoutPage.jsx
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { client } from '../api/client';
import CheckoutForm from '../components/CheckoutForm';
import { 
    Box, Heading, Text, Spinner, Alert, AlertIcon, VStack, Button,
    FormControl, FormLabel, Input, Checkbox, Divider, SimpleGrid, Icon,
    useToast, HStack, Image // Added HStack, Image
} from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { FaArrowRight } from 'react-icons/fa';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const initialAddressState = {
  recipientName: '', street1: '', street2: '', city: '', state: '', zipCode: '', country: '', phone: ''
};

export default function CheckoutPage() {
  const { user, setUser: setAuthUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  
  const { designToCheckout } = location.state || {};

  const [step, setStep] = useState(1); // 1 for address, 2 for payment
  const [addressForm, setAddressForm] = useState({
    shippingAddress: { ...initialAddressState },
    billingAddress: { ...initialAddressState },
  });
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false); // For "Continue to Payment" button loading

  const [clientSecret, setClientSecret] = useState('');
  const [loadingPageData, setLoadingPageData] = useState(true); // General loading for initial setup
  const [error, setError] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({ amount: 0, currency: 'usd' });

  // Populate address form from user context on load
  useEffect(() => {
    setLoadingPageData(true);
    if (user) {
      const sa = { ...initialAddressState, ...(user.shippingAddress || {}) };
      const ba = { ...initialAddressState, ...(user.billingAddress || {}) };
      
      // If shipping recipientName is empty, try to prefill from user's first/last name
      if (!sa.recipientName && (user.firstName || user.lastName)) {
        sa.recipientName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      }

      setAddressForm({ shippingAddress: sa, billingAddress: ba });

      const addressesAreIdentical = user.shippingAddress && user.billingAddress &&
        Object.keys(sa).every(key => sa[key] === ba[key] && sa[key] !== ''); // Ensure non-empty identical
      
      if (addressesAreIdentical) {
        setBillingSameAsShipping(true);
      } else if (user.shippingAddress && (!user.billingAddress || Object.values(ba).every(v => v === ''))) {
        // If shipping is present and billing is not (or all billing fields are empty), default to same
        setBillingSameAsShipping(true);
        setAddressForm(prevForm => ({ ...prevForm, billingAddress: { ...prevForm.shippingAddress } }));
      } else if (!user.shippingAddress && !user.billingAddress) {
        setBillingSameAsShipping(true);
      } else {
        setBillingSameAsShipping(false);
      }
    }
    setLoadingPageData(false); // Done with initial address setup
  }, [user]);

  // REMOVED useEffect that created PaymentIntent on load. 
  // PaymentIntent will now only be created in handleProceedToPayment.

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
    } else {
      // Optionally clear billing form or leave as is for user to edit
      setAddressForm(prevForm => ({ ...prevForm, billingAddress: { ...initialAddressState, ...(user?.billingAddress && !isChecked ? user.billingAddress : {}) } }));
    }
  };

  const handleProceedToPayment = async () => {
    setIsSavingAddress(true); // Indicates address saving + PI creation
    setError('');

    let shipping = { ...addressForm.shippingAddress };
    if (!shipping.recipientName && user) {
        shipping.recipientName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || '';
    }
    
    let billing = billingSameAsShipping ? { ...shipping } : { ...addressForm.billingAddress };
    if (!billing.recipientName && user) { // Ensure billing recipient name is also set
        billing.recipientName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || '';
    }

    if (!shipping.recipientName || !shipping.street1 || !shipping.city || !shipping.state || !shipping.zipCode || !shipping.country) {
        toast({ title: "Missing Shipping Information", description: "Please complete all required shipping address fields.", status: "error", duration: 4000, isClosable: true });
        setIsSavingAddress(false); return;
    }
    if (!billingSameAsShipping && (!billing.recipientName || !billing.street1 || !billing.city || !billing.state || !billing.zipCode || !billing.country)) {
        toast({ title: "Missing Billing Information", description: "Please complete all required billing address fields.", status: "error", duration: 4000, isClosable: true });
        setIsSavingAddress(false); return;
    }

    try {
      if (!designToCheckout) {
        setError("No product selected for checkout. Please go back to the Product Studio.");
        setIsSavingAddress(false);
        return;
      }

      console.log("[CheckoutPage] Saving addresses to profile...");
      const profileUpdateData = { shippingAddress: shipping, billingAddress: billing };
      const { data: updatedProfile } = await client.put('/auth/profile', profileUpdateData);
      if (setAuthUser) setAuthUser(updatedProfile);
      toast({ title: "Addresses Saved to Profile", status: "success", duration: 2000, isClosable: true });

      console.log("[CheckoutPage] Creating PaymentIntent with shipping:", shipping);
      const paymentIntentPayload = {
        items: [{ id: designToCheckout.designId, productType: designToCheckout.productType, size: designToCheckout.size, color: designToCheckout.color, quantity: 1 }],
        currency: 'usd',
        shippingAddress: shipping,
      };
      const res = await client.post('/checkout/create-payment-intent', paymentIntentPayload);
      console.log("CheckoutPage: PaymentIntent created:", res.data);
      setClientSecret(res.data.clientSecret);
      setPaymentDetails({ amount: res.data.amount, currency: res.data.currency });
      setStep(2);
    } catch (err) {
      console.error("CheckoutPage Error (Saving Address or Creating PI):", err.response?.data || err.message);
      setError(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to proceed. Please ensure addresses are correct and try again.');
      if (err.response?.status === 401) { logout(); navigate('/login'); }
    } finally {
      setIsSavingAddress(false);
    }
  };

  const renderAddressFields = (addressType, legend) => ( /* ... same as your provided version ... */ 
    <VStack spacing={4} align="stretch" w="100%">
      <Heading as="h3" size="md" color="brand.textDark" mb={2}>{legend}</Heading>
      <FormControl isRequired id={`${addressType}RecipientName`}>
        <FormLabel>Recipient Name</FormLabel>
        <Input name="recipientName" value={addressForm[addressType]?.recipientName || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping name' : 'billing name'}`} size="lg"/>
      </FormControl>
      <FormControl isRequired id={`${addressType}Street1`}>
        <FormLabel>Street Address 1</FormLabel>
        <Input name="street1" value={addressForm[addressType]?.street1 || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping address-line1' : 'billing address-line1'}`} size="lg"/>
      </FormControl>
      <FormControl id={`${addressType}Street2`}>
        <FormLabel>Street Address 2 (Optional)</FormLabel>
        <Input name="street2" value={addressForm[addressType]?.street2 || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping address-line2' : 'billing address-line2'}`} size="lg"/>
      </FormControl>
      <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
        <FormControl isRequired id={`${addressType}City`}>
          <FormLabel>City</FormLabel>
          <Input name="city" value={addressForm[addressType]?.city || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping address-level2' : 'billing address-level2'}`} size="lg"/>
        </FormControl>
        <FormControl isRequired id={`${addressType}State`}>
          <FormLabel>State/Province</FormLabel>
          <Input name="state" value={addressForm[addressType]?.state || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping address-level1' : 'billing address-level1'}`} size="lg"/>
        </FormControl>
        <FormControl isRequired id={`${addressType}ZipCode`}>
          <FormLabel>Zip/Postal Code</FormLabel>
          <Input name="zipCode" value={addressForm[addressType]?.zipCode || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping postal-code' : 'billing postal-code'}`} size="lg"/>
        </FormControl>
      </SimpleGrid>
      <FormControl isRequired id={`${addressType}Country`}>
        <FormLabel>Country</FormLabel>
        <Input name="country" value={addressForm[addressType]?.country || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping country-name' : 'billing country-name'}`} size="lg"/>
      </FormControl>
      <FormControl id={`${addressType}Phone`}>
        <FormLabel>Phone (Optional)</FormLabel>
        <Input name="phone" type="tel" value={addressForm[addressType]?.phone || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping tel' : 'billing tel'}`} size="lg"/>
      </FormControl>
    </VStack>
  );

  if (loadingPageData) {
    return (
      <VStack justifyContent="center" alignItems="center" minH="60vh">
        <Spinner size="xl" thickness="4px" color="brand.primary"/>
        <Text mt={3} color="brand.textLight">Loading Checkout...</Text>
      </VStack>
    );
  }
  
  if (!designToCheckout && !error) { /* ... your existing no design selected message ... */ }

  const appearance = { theme: 'stripe', variables: { colorPrimary: '#5D4037', /* ... */ } };
  const stripeOptions = clientSecret ? { clientSecret, appearance } : {};

  return (
    <Box maxW="2xl" mx="auto" pb={10}>
      <Heading as="h1" size={{base: "lg", md: "xl"}} color="brand.textLight" textAlign="left" w="100%" mb={6}>
        Checkout
      </Heading>

      {designToCheckout && ( /* ... Order Summary ... */ )}
      
      {error && ( /* ... Error Alert ... */ )}

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
            isLoading={isSavingAddress} // Changed from isSavingAddress || loadingPaymentIntent
            loadingText="Saving Addresses & Proceeding..."
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
          <Heading as="h3" size="lg" color="brand.textDark" mb={3} borderBottomWidth="1px" borderColor="brand.secondary" pb={3}>Payment Details</Heading> {/* Changed size from md to lg */}
          <Text fontSize="lg" mb={6} color="brand.textDark">
            Total Amount: <Text as="span" fontWeight="bold">${(paymentDetails.amount / 100).toFixed(2)} {paymentDetails.currency.toUpperCase()}</Text>
          </Text>
          <Elements options={stripeOptions} stripe={stripePromise}>
            <CheckoutForm designDetails={designToCheckout} />
          </Elements>
          <Text fontSize="xs" color="gray.500" mt={8} textAlign="center">
            We value your privacy and will never sell your personal information. All payment information is processed securely by Stripe.
          </Text>
        </Box>
      )}
       {(step === 2 && loadingPaymentIntent && !clientSecret && !error) && ( // Show loading only if PI is being created for step 2
        <VStack justifyContent="center" alignItems="center" minH="40vh">
          <Spinner size="xl" thickness="4px" color="brand.primary"/>
          <Text mt={3} color="brand.textLight">Initializing secure payment...</Text> {/* Changed from textTeal */}
        </VStack>
      )}
    </Box>
  );
}
