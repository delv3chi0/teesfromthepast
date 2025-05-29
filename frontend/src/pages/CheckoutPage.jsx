// frontend/src/pages/CheckoutPage.jsx
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { client } from '../api/client'; // Your Axios client
import CheckoutForm from '../components/CheckoutForm'; // We'll create this next
import { Box, Heading, Text, Spinner, Alert, AlertIcon, VStack } from '@chakra-ui/react';
import { useLocation } from 'react-router-dom'; // To get product details if passed

// Make sure to replace with your VITE_STRIPE_PUBLISHABLE_KEY from your .env file
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({ amount: 0, currency: 'usd' });

  const location = useLocation(); // To get passed state
  const { designToCheckout } = location.state || {}; // Example: { designId: '...', prompt: '...', imageDataUrl: '...' }

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    // In a real app, you might pass items from a cart here
    console.log("CheckoutPage: Attempting to create PaymentIntent...");
    if (!designToCheckout) {
        setError("No design selected for checkout.");
        setLoading(false);
        // navigate('/product-studio'); // or some other appropriate action
        return;
    }

    // For now, we pass a placeholder 'items' array.
    // The backend calculates the amount.
    client.post('/checkout/create-payment-intent', { 
      items: [{ id: designToCheckout?.designId || 'default_item', quantity: 1 }], // Example item
      currency: 'usd' 
    })
      .then(res => {
        console.log("CheckoutPage: PaymentIntent created:", res.data);
        setClientSecret(res.data.clientSecret);
        setPaymentDetails({ amount: res.data.amount, currency: res.data.currency });
        setLoading(false);
      })
      .catch(err => {
        console.error("CheckoutPage: Error creating PaymentIntent:", err);
        setError(err.response?.data?.error?.message || 'Failed to initialize payment.');
        setLoading(false);
      });
  }, [designToCheckout]);

  const appearance = {
    theme: 'stripe', // or 'night', 'flat', etc.
    variables: {
      colorPrimary: '#5D4037', // Your brand.primary (Dark Brown)
      colorBackground: '#ffffff',
      colorText: '#3E2723', // Your brand.textDark
      colorDanger: '#df1b41',
      fontFamily: 'Montserrat, sans-serif', // Your brand.body font
      spacingUnit: '4px',
      borderRadius: '4px',
    }
  };
  const options = {
    clientSecret,
    appearance,
  };

  if (loading) {
    return (
      <VStack justifyContent="center" alignItems="center" minH="60vh">
        <Spinner size="xl" thickness="4px" color="brand.primary"/>
        <Text mt={3} color="brand.textTeal">Preparing your secure checkout...</Text>
      </VStack>
    );
  }

  if (error) {
    return (
      <VStack justifyContent="center" alignItems="center" minH="60vh" px={4}>
        <Alert status="error" borderRadius="md" bg="red.50" p={6}>
          <AlertIcon color="red.500" />
          <Box>
            <Heading size="md" color="red.700">Payment Initialization Failed</Heading>
            <Text color="red.700" mt={2}>{error}</Text>
          </Box>
        </Alert>
      </VStack>
    );
  }

  if (!clientSecret) { // Should be caught by loading/error but as a fallback
     return (
      <VStack justifyContent="center" alignItems="center" minH="60vh" px={4}>
         <Text color="brand.textTeal">Initializing payment...</Text>
      </VStack>
     );
  }

  return (
    <Box maxW="lg" mx="auto" mt={8} px={4} pb={10}>
      <Heading as="h1" size="xl" textAlign="center" mb={2} color="brand.textLight">
        Secure Checkout
      </Heading>
      <Text textAlign="center" fontSize="lg" mb={8} color="brand.textLight">
        Amount: ${(paymentDetails.amount / 100).toFixed(2)} {paymentDetails.currency.toUpperCase()}
      </Text>
      <Box bg="brand.paper" p={8} borderRadius="xl" shadow="2xl">
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm designDetails={designToCheckout} />
        </Elements>
      </Box>
    </Box>
  );
}
