// frontend/src/pages/CheckoutPage.jsx
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { client } from '../api/client';
import CheckoutForm from '../components/CheckoutForm';
import {
    Box, Heading, Text, Spinner, Alert, AlertIcon, VStack, Button,
    FormControl, FormLabel, Input, Checkbox, Divider, SimpleGrid, Icon,
    useToast, HStack, Image
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
  
  // designToCheckout is expected to have: designId, productType (label), size, color, prompt, imageDataUrl, productImage (mockup URL)
  const { designToCheckout } = location.state || {};

  const [step, setStep] = useState(1); // 1 for address, 2 for payment
  const [addressForm, setAddressForm] = useState({
    shippingAddress: { ...initialAddressState },
    billingAddress: { ...initialAddressState },
  });
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [clientSecret, setClientSecret] = useState('');
  const [loadingPageData, setLoadingPageData] = useState(true);  
  const [error, setError] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({ amount: 0, currency: 'usd' });

  useEffect(() => {
    setLoadingPageData(true);
    setError(''); 
    console.log("[CheckoutPage] useEffect location.state or user changed.");
    console.log("[CheckoutPage] Received designToCheckout from location state:", JSON.stringify(designToCheckout, null, 2));
    console.log("[CheckoutPage] Current user:", user);


    if (user) {
      const sa = { ...initialAddressState, ...(user.shippingAddress || {}) };
      const ba = { ...initialAddressState, ...(user.billingAddress || {}) };
      
      if (!sa.recipientName && (user.firstName || user.lastName)) {
        sa.recipientName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      }

      setAddressForm({ shippingAddress: sa, billingAddress: ba });

      const addressesAreIdentical = user.shippingAddress && user.billingAddress &&
        Object.keys(sa).every(key => sa[key] === ba[key] && (sa[key] !== '' && sa[key] !== undefined && sa[key] !== null) );
      
      if (addressesAreIdentical) {
        setBillingSameAsShipping(true);
      } else if (user.shippingAddress && (!user.billingAddress || Object.values(ba).every(v => v === ''))) {
        setBillingSameAsShipping(true);
        setAddressForm(prevForm => ({ ...prevForm, billingAddress: { ...prevForm.shippingAddress } }));
      } else if (!user.shippingAddress && !user.billingAddress) {
        // If no addresses are stored in profile, default to checkbox true
        setBillingSameAsShipping(true);
      }
       else {
        setBillingSameAsShipping(false);
      }
    } else {
      // No user, reset forms and checkbox
      setAddressForm({
        shippingAddress: { ...initialAddressState },
        billingAddress: { ...initialAddressState },
      });
      setBillingSameAsShipping(true);
    }
    setLoadingPageData(false);
  // Rerun if location.state changes (which is where designToCheckout comes from) or user changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, user]); 

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
      // If unchecking, revert billing to user's stored BA or empty if none
      setAddressForm(prevForm => ({ ...prevForm, billingAddress: { ...initialAddressState, ...(user?.billingAddress || {}) } }));
    }
  };

  const handleProceedToPayment = async () => {
    setIsProcessingAction(true); 
    setError('');

    console.log("[CheckoutPage] handleProceedToPayment - current designToCheckout:", JSON.stringify(designToCheckout, null, 2));

    const requiredCheckoutFields = {
        designId: "design ID",
        productType: "product type", // This is the label like "T-Shirt"
        size: "size",
        color: "color",
        imageDataUrl: "design image URL", // The AI generated image
        prompt: "design prompt"
        // productImage (the mockup URL) is used for display but not strictly required for the backend `items` list here
    };
    
    let missingFieldsList = [];
    if (!designToCheckout) {
        missingFieldsList.push("all product data (designToCheckout is missing)");
    } else {
        for (const field in requiredCheckoutFields) {
            if (!designToCheckout[field]) {
                missingFieldsList.push(requiredCheckoutFields[field]);
            }
        }
    }

    if (missingFieldsList.length > 0) {
        const errorMessage = `Incomplete product information for checkout (${missingFieldsList.join(', ')} missing). Please return to the Product Studio and re-select your options.`;
        setError(errorMessage);
        toast({ title: "Missing Product Information", description: errorMessage, status: "error", duration: 7000, isClosable: true });
        setIsProcessingAction(false);
        navigate('/product-studio'); // Guide user back
        return;
    }

    let shipping = { ...addressForm.shippingAddress };
    if (!shipping.recipientName && user) {
        shipping.recipientName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || '';
    }
    
    let billing = billingSameAsShipping ? { ...shipping } : { ...addressForm.billingAddress };
    if (!billing.recipientName && user) {  
        billing.recipientName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || '';
    }

    const requiredAddressFields = ['recipientName', 'street1', 'city', 'state', 'zipCode', 'country'];
    for (const field of requiredAddressFields) {
        if (!shipping[field]) {
            toast({ title: "Missing Shipping Information", description: `Please complete the '${field}' field in your shipping address.`, status: "error", duration: 4000, isClosable: true });
            setIsProcessingAction(false); return;
        }
        if (!billingSameAsShipping && !billing[field]) {
            toast({ title: "Missing Billing Information", description: `Please complete the '${field}' field in your billing address.`, status: "error", duration: 4000, isClosable: true });
            setIsProcessingAction(false); return;
        }
    }
    
    if (shipping.country && shipping.country.length > 2 && !(shipping.country.toUpperCase() === "UNITED STATES" || shipping.country.toUpperCase() === "USA")) {
        toast({ title: "Shipping Country Format", description: "Please use a 2-letter country code (e.g., US, CA) for the shipping country.", status: "warning", duration: 5000, isClosable: true });
    }
    if (!billingSameAsShipping && billing.country && billing.country.length > 2 && !(billing.country.toUpperCase() === "UNITED STATES" || billing.country.toUpperCase() === "USA")) {
        toast({ title: "Billing Country Format", description: "Please use a 2-letter country code (e.g., US, CA) for the billing country.", status: "warning", duration: 5000, isClosable: true });
    }

    try {
      console.log("[CheckoutPage] Saving addresses to profile...");
      const profileUpdateData = { shippingAddress: shipping, billingAddress: billing };
      const { data: updatedProfile } = await client.put('/auth/profile', profileUpdateData);
      if (setAuthUser) setAuthUser(updatedProfile);
      toast({ title: "Addresses Saved to Profile", status: "success", duration: 2000, isClosable: true });

      console.log("[CheckoutPage] Creating PaymentIntent with shipping address:", shipping);
      const paymentIntentPayload = {
        items: [{ 
            id: designToCheckout.designId, 
            productType: designToCheckout.productType, // Should be "T-Shirt", "Hoodie" etc.
            size: designToCheckout.size, 
            color: designToCheckout.color, 
            quantity: 1,
            imageDataUrl: designToCheckout.imageDataUrl, 
            prompt: designToCheckout.prompt 
        }],
        currency: 'usd',
        shippingAddress: shipping,
      };
      console.log("[CheckoutPage] PaymentIntent Payload to be sent:", JSON.stringify(paymentIntentPayload, null, 2));
      
      const res = await client.post('/checkout/create-payment-intent', paymentIntentPayload);
      console.log("[CheckoutPage] PaymentIntent created successfully:", res.data);

      if (res.data.clientSecret) {
        setClientSecret(res.data.clientSecret);
        setPaymentDetails({ amount: res.data.amount, currency: res.data.currency });
        setStep(2);
      } else {
        throw new Error("Failed to retrieve client_secret for payment.");
      }
    } catch (err) {
      console.error("CheckoutPage Error (Saving Address or Creating PI):", err.response?.data || err.message || err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error?.message || 'Failed to proceed. Please ensure addresses are correct and try again.';
      setError(errorMsg);
      if (errorMsg.toLowerCase().includes("country format") && errorMsg.toLowerCase().includes("2-letter")) {
        toast({
            title: "Address Error",
            description: "Please use a 2-letter ISO code for the country (e.g., US, CA).",
            status: "error",
            duration: 6000,
            isClosable: true
        });
      }
      if (err.response?.status === 401) { 
        toast({ title: "Session Expired", description: "Your session has expired. Please log in again.", status: "error", duration: 4000, isClosable: true });
        logout(); 
        navigate('/login'); 
      }
    } finally {
      setIsProcessingAction(false);
    }
  };

  const renderAddressFields = (addressType, legend) => ( 
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
        <FormLabel>Country (2-letter code, e.g., US)</FormLabel>
        <Input name="country" value={addressForm[addressType]?.country || ''} onChange={(e) => handleAddressChange(e, addressType)} isDisabled={addressType === 'billingAddress' && billingSameAsShipping} bg="white" autoComplete={`${addressType === 'shippingAddress' ? 'shipping country-name' : 'billing country-name'}`} size="lg" placeholder="e.g., US, CA, GB"/>
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
  
  // This condition should ideally be hit if navigate state was not passed correctly
  if (!designToCheckout && !error && !loadingPageData) { 
    return (
      <VStack justifyContent="center" alignItems="center" minH="60vh" px={4} textAlign="center">
        <Alert status="warning" borderRadius="md" bg="yellow.50" p={6} flexDirection="column" maxW="md">
          <AlertIcon color="yellow.500" boxSize="30px"/>
          <Heading size="md" color="yellow.700" mt={3}>No Product Selected</Heading>
          <Text color="yellow.700" mt={2}>It seems you've landed here without selecting a product. Please go to the studio to customize your apparel first.</Text>
          <Button mt={4} bg="brand.accentYellow" color="brand.textDark" _hover={{bg:"brand.accentYellowHover"}} borderRadius="full" size="lg" onClick={() => navigate('/product-studio')}>Go to Product Studio</Button>
        </Alert>
      </VStack>
    );
  }

  const appearance = { theme: 'stripe', variables: { colorPrimary: '#5D4037', colorBackground: '#ffffff', colorText: '#3E2723', colorDanger: '#df1b41', fontFamily: 'Montserrat, sans-serif', spacingUnit: '4px', borderRadius: '4px' } };
  const stripeOptions = clientSecret ? { clientSecret, appearance } : {};

  return (
    <Box maxW="2xl" mx="auto" pb={10} px={{base: 4, md: 0}}>
      <Heading as="h1" fontSize={{ base: "xl", md: "2xl" }} color="brand.textLight" textAlign="left" w="100%" mb={6}> {/* Responsive font size */}
        Checkout
      </Heading>

      {designToCheckout && ( /* Only render summary if designToCheckout has data */
        <Box mb={6} p={{base: 4, md: 6}} bg="brand.paper" borderRadius="xl" shadow="lg"> {/* Responsive padding */}
          <Heading as="h3" fontSize={{ base: "lg", md: "xl" }} color="brand.textDark" mb={3} borderBottomWidth="1px" borderColor="brand.secondary" pb={3}>Order Summary</Heading>
          <HStack spacing={4} align="flex-start">
            <Image 
                src={designToCheckout.imageDataUrl || designToCheckout.productImage || 'https://placehold.co/100x100/E2E8F0/A0AEC0?text=Design'} 
                alt={designToCheckout.prompt || "Product Image"} 
                boxSize="100px" 
                objectFit="cover" 
                borderRadius="md" 
                fallbackSrc='https://placehold.co/100x100/E2E8F0/A0AEC0?text=Design'
            />
            <VStack align="flex-start" spacing={1}>
              <Text fontWeight="bold" fontSize={{base: "md", md: "lg"}} color="brand.textDark">{designToCheckout.productType || "Custom Apparel"}</Text>
              <Text fontSize={{base: "sm", md: "md"}} color="gray.700">Color: {designToCheckout.color || 'N/A'}, Size: {designToCheckout.size || 'N/A'}</Text>
              {designToCheckout.prompt && <Text fontSize={{base: "xs", md: "sm"}} color="gray.600" noOfLines={2}>Design: "{designToCheckout.prompt}"</Text>}
            </VStack>
          </HStack>
        </Box>
      )}
      
      {error && (
        <Alert status="error" borderRadius="md" bg="red.50" p={4} mb={6} w="100%" variant="subtle">
          <AlertIcon color="red.500" />
          <Text color="red.700" fontWeight="medium">{error}</Text>
        </Alert>
      )}

      {step === 1 && (
        <Box bg="brand.paper" p={{base:4, md:8}} borderRadius="xl" shadow="xl">
          {renderAddressFields('shippingAddress', 'Shipping Address')}
          <Divider my={6} />
          <FormControl display="flex" alignItems="center" mb={6}>
            <Checkbox id="billingSameAsShipping" isChecked={billingSameAsShipping} onChange={handleBillingSameAsShippingChange} colorScheme="brandPrimary" size="lg" defaultChecked>
              Billing address is the same as shipping address
            </Checkbox>
          </FormControl>
          {!billingSameAsShipping && renderAddressFields('billingAddress', 'Billing Address')}
          <Button  
            onClick={handleProceedToPayment}  
            isLoading={isProcessingAction}  
            loadingText="Saving & Proceeding..."
            bg="brand.accentYellow" color="brand.textDark" _hover={{bg: 'brand.accentYellowHover'}}
            size="lg" borderRadius="full" width="full" mt={6}
            rightIcon={<Icon as={FaArrowRight} />}
            isDisabled={!designToCheckout || isProcessingAction} // Also disable if processing
          >
            Continue to Payment
          </Button>
        </Box>
      )}

      {step === 2 && clientSecret && (
        <Box bg="brand.paper" p={{base:4, md:8}} borderRadius="xl" shadow="xl">
          <Heading as="h3" fontSize={{ base: "lg", md: "xl" }} color="brand.textDark" mb={3} borderBottomWidth="1px" borderColor="brand.secondary" pb={3}>Payment Details</Heading>
          <Text fontSize={{base: "md", md: "lg"}} mb={6} color="brand.textDark">
            Total Amount: <Text as="span" fontWeight="bold">${(paymentDetails.amount / 100).toFixed(2)} {paymentDetails.currency.toUpperCase()}</Text>
          </Text>
          <Elements options={stripeOptions} stripe={stripePromise}>
            <CheckoutForm designDetails={designToCheckout} /> {/* Pass full designToCheckout for context if needed in CheckoutForm */}
          </Elements>
          <Text fontSize="xs" color="gray.500" mt={8} textAlign="center">
            We value your privacy. All payment information is processed securely by Stripe.
          </Text>
        </Box>
      )}
       {(step === 2 && isProcessingAction && !clientSecret && !error) && ( 
        <VStack justifyContent="center" alignItems="center" minH="40vh">
          <Spinner size="xl" thickness="4px" color="brand.primary"/>
          <Text mt={3} color="brand.textLight">Initializing secure payment...</Text>
        </VStack>
      )}
    </Box>
  );
}
