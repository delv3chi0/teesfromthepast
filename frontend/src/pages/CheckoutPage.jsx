// frontend/src/pages/CheckoutPage.jsx
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { client } from '../api/client'; 
import CheckoutForm from '../components/CheckoutForm'; 
import { Box, Heading, Text, Spinner, Alert, AlertIcon, VStack } from '@chakra-ui/react';
import { useLocation } from 'react-router-dom'; 

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({ amount: 0, currency: 'usd' });

  const location = useLocation(); 
  const { designToCheckout } = location.state || {}; 

  useEffect(() => {
    console.log("CheckoutPage: Attempting to create PaymentIntent...");
    if (!designToCheckout) {
        setError("No design selected for checkout. Please return to the product studio to select a design."); // More helpful error
        setLoading(false);
        return;
    }

    client.post('/checkout/create-payment-intent', { 
      items: [{ 
        id: designToCheckout?.designId || 'default_item', 
        // Potentially send more details here for backend price calculation if needed:
        // productType: designToCheckout?.productType,
        // size: designToCheckout?.size,
        // color: designToCheckout?.color,
        quantity: 1 
      }], 
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
        setError(err.response?.data?.error?.message || 'Failed to initialize payment. Please try again or contact support.'); // More helpful error
        setLoading(false);
      });
  }, [designToCheckout]);

  const appearance = {
    theme: 'stripe', 
    variables: {
      colorPrimary: '#5D4037', 
      colorBackground: '#ffffff',
      colorText: '#3E2723', 
      colorDanger: '#df1b41',
      fontFamily: 'Montserrat, sans-serif', 
      spacingUnit: '4px',
      borderRadius: '4px',
    }
  };
  const options = {
    clientSecret,
    appearance,
  };

  // Main content container for this page, assuming it's within MainLayout.
  // Padding will come from MainLayout. Let's ensure maxW for content.
  return (
    <Box maxW="lg" mx="auto" /* mt removed, MainLayout handles top padding */ pb={10}>
      <Heading 
        as="h1" 
        size="xl" 
        color="brand.textLight" 
        textAlign="left"       // Updated from center
        w="100%"                // Added
        mb={6}                  // Updated from mb={2}
      >
        Secure Checkout
      </Heading>
      
      {loading && (
        <VStack justifyContent="center" alignItems="center" minH="40vh"> {/* Reduced minH */}
          <Spinner size="xl" thickness="4px" color="brand.primary"/>
          <Text mt={3} color="brand.textTeal">Preparing your secure checkout...</Text>
        </VStack>
      )}

      {!loading && error && ( // Show error only if not loading
        <VStack justifyContent="center" alignItems="center" minH="40vh" px={0}> {/* Reduced minH, px from MainLayout */}
          <Alert status="error" borderRadius="md" bg="red.50" p={6} w="100%">
            <AlertIcon color="red.500" />
            <Box>
              <Heading size="md" color="red.700">Payment Initialization Failed</Heading>
              <Text color="red.700" mt={2}>{error}</Text>
            </Box>
          </Alert>
        </VStack>
      )}

      {!loading && !error && !clientSecret && designToCheckout && ( // Specific state if PI creation failed silently but no explicit error caught
         <VStack justifyContent="center" alignItems="center" minH="40vh">
             <Text color="brand.textTeal">There was an issue initializing payment. Please try again.</Text>
         </VStack>
      )}

      {!loading && !error && clientSecret && (
        <>
          <Text textAlign="left" fontSize="lg" mb={8} color="brand.textLight" w="100%"> {/* Aligned with heading */}
            Amount: ${(paymentDetails.amount / 100).toFixed(2)} {paymentDetails.currency.toUpperCase()}
          </Text>
          <Box bg="brand.paper" p={8} borderRadius="xl" shadow="2xl">
            <Elements options={options} stripe={stripePromise}>
              <CheckoutForm designDetails={designToCheckout} />
            </Elements>
          </Box>
        </>
      )}
    </Box>
  );
}
