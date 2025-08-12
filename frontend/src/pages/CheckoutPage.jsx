import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import {
  Box, Heading, Text, Spinner, Alert, AlertIcon, VStack, Button,
  FormControl, FormLabel, Input, Checkbox, Divider, SimpleGrid, Icon,
  useToast, HStack, Image, Grid, GridItem, Collapse
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';

import { client } from '../api/client';
import CheckoutForm from '../components/CheckoutForm';
import { useAuth } from '../context/AuthProvider';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Keep a single source of truth for address shape
const emptyAddr = {
  recipientName: '',
  street1: '',
  street2: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  phone: ''
};

const ThemedInput = (props) => (
  <Input
    bg="brand.primaryDark"
    borderColor="whiteAlpha.300"
    _hover={{ borderColor: 'whiteAlpha.400' }}
    focusBorderColor="brand.accentYellow"
    size="lg"
    {...props}
  />
);

export default function CheckoutPage() {
  const { user, setUser: setAuthUser, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [itemToCheckout, setItemToCheckout] = useState(null);
  const [step, setStep] = useState(1);
  const [shipping, setShipping] = useState({ ...emptyAddr });
  const [billing, setBilling] = useState({ ...emptyAddr });
  const [billingSame, setBillingSame] = useState(true);

  const [busy, setBusy] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({ amount: 0, currency: 'usd' });

  // Load item + prefill addresses
  useEffect(() => {
    setLoading(true);

    // Load the one-item “cart” from localStorage
    const raw = localStorage.getItem('itemToCheckout');
    if (raw) {
      try {
        setItemToCheckout(JSON.parse(raw));
      } catch {
        setError('There was an error reading your item details.');
      }
    }

    // Prefill from profile when available
    if (user) {
      const s = { ...emptyAddr, ...(user.shippingAddress || {}) };
      const b = { ...emptyAddr, ...(user.billingAddress || {}) };

      if (!s.recipientName && (user.firstName || user.lastName)) {
        s.recipientName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      }

      setShipping(s);
      setBilling(b);

      // If billing is empty or matches shipping, default to “same”
      const isBillingEmpty = !user.billingAddress || Object.values(user.billingAddress).every(v => !v);
      const looksSame = Object.keys(s).every(k => s[k] && s[k] === b[k]);
      setBillingSame(isBillingEmpty || looksSame);

      if (isBillingEmpty) setBilling({ ...s });
    }

    setLoading(false);
  }, [user]);

  // ---------- helpers ----------
  const required = ['recipientName', 'street1', 'city', 'state', 'zipCode', 'country'];
  const normalizeCountry = (v) => (v || '').trim().toUpperCase();

  const validateAddress = (addr, label) => {
    for (const k of required) {
      if (!addr[k]) {
        toast({
          title: `Missing ${label} info`,
          description: `Please fill in ${k}.`,
          status: 'error',
          isClosable: true
        });
        return false;
      }
    }
    return true;
  };

  const onChange = (e, type) => {
    const { name, value } = e.target;
    if (type === 'shipping') {
      const next = { ...shipping, [name]: value };
      setShipping(next);
      if (billingSame) setBilling({ ...next });
    } else {
      setBilling(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleBillingSame = (e) => {
    const checked = e.target.checked;
    setBillingSame(checked);
    if (checked) setBilling({ ...shipping });
    else setBilling(prev => ({ ...emptyAddr, ...(user?.billingAddress || {}) }));
  };

  // ---------- proceed to payment ----------
  const handleProceed = async () => {
    setBusy(true);
    setError('');

    const ship = { ...shipping, country: normalizeCountry(shipping.country) };
    const bill = billingSame ? { ...ship } : { ...billing, country: normalizeCountry(billing.country) };

    if (!validateAddress(ship, 'shipping')) { setBusy(false); return; }
    if (!billingSame && !validateAddress(bill, 'billing')) { setBusy(false); return; }

    try {
      // 1) persist profile addresses
      const { data: updated } = await client.put('/auth/profile', {
        shippingAddress: ship,
        billingAddress: bill
      });
      setAuthUser?.(updated);

      // 2) create payment intent
      if (!itemToCheckout) throw new Error('No item to checkout.');

      const payload = {
        items: [{
          productId: itemToCheckout.productId,
          variantSku: itemToCheckout.variantSku,
          designId: itemToCheckout.designId,
          quantity: 1
        }],
        currency: 'usd',
        shippingAddress: ship
      };

      const res = await client.post('/checkout/create-payment-intent', payload);

      if (!res.data?.clientSecret) throw new Error('Failed to get a payment secret.');
      setClientSecret(res.data.clientSecret);
      setPaymentDetails({ amount: res.data.amount, currency: res.data.currency });

      // 3) stash a compact “recipient” for Printful order creation after payment
      const recipient = {
        name: ship.recipientName,
        address1: ship.street1,
        address2: ship.street2,
        city: ship.city,
        state_code: ship.state,
        country_code: ship.country,
        zip: ship.zipCode,
        phone: ship.phone || undefined,
        email: user?.email || undefined
      };
      localStorage.setItem('checkoutRecipient', JSON.stringify(recipient));

      setStep(2);
      toast({ title: 'Addresses saved', status: 'success', duration: 1500 });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to proceed. Please try again.';
      setError(msg);
      if (err.response?.status === 401) { logout(); navigate('/login'); }
    } finally {
      setBusy(false);
    }
  };

  // ---------- render ----------
  const appearance = {
    theme: 'night',
    variables: {
      colorPrimary: '#DD6B20',
      colorBackground: '#2D3748',
      colorText: '#F7FAFC',
      colorDanger: '#FC8181',
      fontFamily: 'Inter, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px'
    }
  };
  const stripeOptions = clientSecret ? { clientSecret, appearance } : {};

  const AddressFields = ({ value, onChange, legend, disabled }) => (
    <VStack spacing={4} align="stretch" w="100%">
      <Heading as="h3" size="lg" color="brand.textLight" mb={2}>{legend}</Heading>
      <FormControl isRequired>
        <FormLabel color="whiteAlpha.800">Recipient Name</FormLabel>
        <ThemedInput name="recipientName" value={value.recipientName} onChange={onChange} isDisabled={disabled} />
      </FormControl>
      <FormControl isRequired>
        <FormLabel color="whiteAlpha.800">Street Address 1</FormLabel>
        <ThemedInput name="street1" value={value.street1} onChange={onChange} isDisabled={disabled} />
      </FormControl>
      <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
        <FormControl isRequired>
          <FormLabel color="whiteAlpha.800">City</FormLabel>
          <ThemedInput name="city" value={value.city} onChange={onChange} isDisabled={disabled} />
        </FormControl>
        <FormControl isRequired>
          <FormLabel color="whiteAlpha.800">State/Province</FormLabel>
          <ThemedInput name="state" value={value.state} onChange={onChange} isDisabled={disabled} />
        </FormControl>
        <FormControl isRequired>
          <FormLabel color="whiteAlpha.800">Zip/Postal Code</FormLabel>
          <ThemedInput name="zipCode" value={value.zipCode} onChange={onChange} isDisabled={disabled} />
        </FormControl>
      </SimpleGrid>
      <FormControl isRequired>
        <FormLabel color="whiteAlpha.800">Country (2-letter)</FormLabel>
        <ThemedInput name="country" placeholder="US, CA, GB…" value={value.country} onChange={onChange} isDisabled={disabled} />
      </FormControl>
      <FormControl>
        <FormLabel color="whiteAlpha.800">Phone (optional)</FormLabel>
        <ThemedInput name="phone" value={value.phone} onChange={onChange} isDisabled={disabled} />
      </FormControl>
    </VStack>
  );

  if (loading) {
    return (
      <VStack minH="60vh" justify="center">
        <Spinner size="xl" color="brand.accentYellow" thickness="4px" />
        <Text mt={4} fontSize="lg" color="brand.textLight">Loading Checkout...</Text>
      </VStack>
    );
  }

  if (!itemToCheckout && !error) {
    return (
      <VStack minH="60vh" justify="center" px={4}>
        <Alert status="warning" bg="yellow.900" p={6} borderRadius="lg" flexDirection="column" maxW="md">
          <AlertIcon color="yellow.400" boxSize="30px" />
          <Heading size="md" color="brand.textLight" mt={3}>No Product Selected</Heading>
          <Text color="whiteAlpha.800" mt={2}>Please go to the studio to customize your apparel first.</Text>
          <Button
            mt={6}
            bg="brand.accentYellow"
            color="brand.textDark"
            _hover={{ bg: 'brand.accentYellowHover' }}
            onClick={() => navigate('/product-studio')}
          >
            Go to Product Studio
          </Button>
        </Alert>
      </VStack>
    );
  }

  return (
    <Box maxW="container.lg" mx="auto" pb={10} px={{ base: 2, md: 4 }}>
      <Heading as="h1" size="2xl" color="brand.textLight" textAlign="left" w="100%" mb={8}>
        Checkout
      </Heading>

      {error && (
        <Alert status="error" bg="red.900" borderRadius="md" p={4} mb={6}>
          <AlertIcon color="red.300" />
          <Text color="white" fontWeight="medium">{error}</Text>
        </Alert>
      )}

      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={{ base: 8, lg: 10 }}>
        {/* Left: forms & payment */}
        <GridItem>
          <Box bg="brand.primaryLight" p={{ base: 5, md: 8 }} borderRadius="xl">
            {step === 1 && (
              <VStack spacing={6} align="stretch">
                <AddressFields
                  value={shipping}
                  onChange={(e) => onChange(e, 'shipping')}
                  legend="Shipping Address"
                />

                <Divider my={2} borderColor="whiteAlpha.300" />

                <FormControl display="flex" alignItems="center">
                  <Checkbox
                    id="billingSameAsShipping"
                    isChecked={billingSame}
                    onChange={toggleBillingSame}
                    colorScheme="yellow"
                    size="lg"
                    color="whiteAlpha.900"
                  >
                    Billing address is the same as shipping
                  </Checkbox>
                </FormControl>

                <Collapse in={!billingSame} animateOpacity>
                  <AddressFields
                    value={billing}
                    onChange={(e) => onChange(e, 'billing')}
                    legend="Billing Address"
                  />
                </Collapse>

                <Button
                  onClick={handleProceed}
                  isLoading={busy}
                  loadingText="Saving & Preparing Payment…"
                  bg="brand.accentOrange"
                  color="white"
                  _hover={{ bg: 'brand.accentOrangeHover' }}
                  size="lg"
                  width="full"
                  mt={4}
                  rightIcon={<Icon as={FaArrowRight} />}
                >
                  Continue to Payment
                </Button>
              </VStack>
            )}

            {step === 2 && clientSecret && (
              <VStack spacing={6} align="stretch">
                <Heading as="h3" size="lg" color="brand.textLight">Payment Details</Heading>
                <Text fontSize="lg" color="whiteAlpha.800">
                  Total Amount:{' '}
                  <Text as="span" fontWeight="bold" color="brand.accentYellow">
                    ${(paymentDetails.amount / 100).toFixed(2)} {paymentDetails.currency.toUpperCase()}
                  </Text>
                </Text>

                <Elements options={stripeOptions} stripe={stripePromise}>
                  <CheckoutForm itemDetails={itemToCheckout} />
                </Elements>

                <Text fontSize="xs" color="whiteAlpha.600" pt={2} textAlign="center">
                  We value your privacy. All payment information is processed securely by Stripe.
                </Text>
              </VStack>
            )}
          </Box>
        </GridItem>

        {/* Right: order summary */}
        <GridItem position="sticky" top="8rem" alignSelf="start">
          {itemToCheckout && (
            <Box p={{ base: 4, md: 6 }} bg="brand.primaryLight" borderRadius="xl">
              <Heading
                as="h3"
                size="lg"
                color="brand.textLight"
                mb={4}
                borderBottomWidth="2px"
                borderColor="whiteAlpha.300"
                pb={3}
              >
                Order Summary
              </Heading>
              <HStack spacing={5} align="flex-start">
                <Image
                  src={itemToCheckout.preview || itemToCheckout.productImage || 'https://placehold.co/120x120?text=Item'}
                  alt={itemToCheckout.productName}
                  boxSize="120px"
                  objectFit="cover"
                  borderRadius="md"
                  bg="brand.primaryDark"
                />
                <VStack align="flex-start" spacing={1}>
                  <Text fontWeight="bold" fontSize="lg" color="brand.textLight">
                    {itemToCheckout.productName}
                  </Text>
                  <Text fontSize="md" color="whiteAlpha.800">
                    Color: {itemToCheckout.color} &nbsp;•&nbsp; Size: {itemToCheckout.size}
                  </Text>
                  {itemToCheckout.prompt && (
                    <Text fontSize="sm" color="whiteAlpha.700" noOfLines={2}>
                      Design: “{itemToCheckout.prompt}”
                    </Text>
                  )}
                </VStack>
              </HStack>
            </Box>
          )}
        </GridItem>
      </Grid>
    </Box>
  );
}
