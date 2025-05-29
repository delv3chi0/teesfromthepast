// frontend/src/pages/PaymentSuccessPage.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Box, Heading, Text, Spinner, Alert, AlertIcon, Button, VStack, Icon as ChakraUIIcon } from '@chakra-ui/react'; // Renamed Icon to ChakraUIIcon
import { CheckCircleIcon, WarningIcon, InfoIcon } from '@chakra-ui/icons'; // Chakra UI icons
import { useAuth } from '../context/AuthProvider'; // To potentially clear cart or update user state

// Make sure your VITE_STRIPE_PUBLISHABLE_KEY is in your frontend/.env file
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // Get user if needed for context

  const [message, setMessage] = useState('Verifying your payment, please wait...');
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'processing', 'error'
  const [paymentIntentDetails, setPaymentIntentDetails] = useState(null);

  useEffect(() => {
    const clientSecret = searchParams.get('payment_intent_client_secret');
    const paymentIntentIdFromUrl = searchParams.get('payment_intent'); // Can be useful for display or logging
    // const redirectStatus = searchParams.get('redirect_status'); // Can also be used for an initial hint

    if (!clientSecret) {
      console.error("PaymentSuccessPage: No client_secret found in URL.");
      setMessage('Error: Payment information is missing. Unable to confirm payment status.');
      setStatus('error');
      return;
    }

    const verifyPayment = async () => {
      const stripe = await stripePromise;
      if (!stripe) {
        console.error("PaymentSuccessPage: Stripe.js not loaded.");
        setMessage('Error: Payment system could not be initialized. Please try again.');
        setStatus('error');
        return;
      }

      // Retrieve the PaymentIntent status from Stripe using the client_secret
      const { error, paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

      if (error) {
        console.error("PaymentSuccessPage: Error retrieving PaymentIntent:", error);
        setMessage(error.message || 'An error occurred while verifying your payment.');
        setStatus('error');
      } else if (paymentIntent) {
        console.log("PaymentSuccessPage: Retrieved PaymentIntent:", paymentIntent);
        setPaymentIntentDetails(paymentIntent); // Store for display if needed

        switch (paymentIntent.status) {
          case 'succeeded':
            setMessage('Thank you! Your payment was successful and your order is confirmed.');
            setStatus('success');
            // TODO: Clear the user's cart (if you implement a cart)
            // TODO: Potentially trigger a call to your backend to finalize order in your DB,
            //       though relying on webhooks is more robust for fulfillment.
            break;
          case 'processing':
            setMessage('Your payment is processing. We will update you once it is confirmed.');
            setStatus('processing');
            break;
          case 'requires_payment_method':
            setMessage('Payment failed. Please try another payment method or check your details.');
            setStatus('error');
            // You might want to navigate them back to the checkout page:
            // navigate('/checkout', { replace: true, state: { retryClientSecret: clientSecret } });
            break;
          default:
            setMessage(`Payment status: ${paymentIntent.status}. Please contact support if this persists.`);
            setStatus('error');
            break;
        }
      }
    };

    verifyPayment();
  }, [searchParams, navigate]); // Rerun if searchParams change (shouldn't typically happen on this page)

  if (status === 'loading') {
    return (
      <VStack justifyContent="center" alignItems="center" minH="70vh" spacing={4} bg="brand.accentOrange" py={10}>
        <Spinner size="xl" thickness="4px" color="brand.primary" speed="0.65s" emptyColor="rgba(255,255,255,0.3)"/>
        <Text fontSize="xl" color="brand.textLight">{message}</Text>
      </VStack>
    );
  }

  let alertStatus = 'info';
  let alertTitle = 'Payment Status';
  let AlertIconComponent = InfoIcon;

  if (status === 'success') { 
    alertStatus = 'success'; 
    alertTitle = 'Payment Confirmed!';
    AlertIconComponent = CheckCircleIcon; 
  } else if (status === 'error') { 
    alertStatus = 'error'; 
    alertTitle = 'Payment Issue';
    AlertIconComponent = WarningIcon;
  } else if (status === 'processing') {
    alertStatus = 'info';
    alertTitle = 'Payment Processing';
    AlertIconComponent = InfoIcon; // Or Chakra's Spinner can be used as an icon
  }


  return (
    <VStack spacing={6} textAlign="center" py={10} px={6} mt={2} minH="70vh" justifyContent="center" bg="brand.accentOrange">
      <Box bg="brand.paper" p={{base: 6, md:10}} borderRadius="xl" shadow="2xl" maxW="lg" w="full">
        <VStack spacing={4}>
            <ChakraUIIcon as={AlertIconComponent} boxSize={{base:"48px", md:"60px"}} color={status === 'success' ? 'green.500' : status === 'error' ? 'red.500' : 'blue.500'} />
            <Heading as="h2" size="lg" mt={4} mb={2} color="brand.textDark">
            {alertTitle}
            </Heading>
            <Text color="brand.textDark" fontSize="md" px={4}>{message}</Text>
            {paymentIntentDetails && status === 'success' && (
            <Text fontSize="sm" color="gray.500" mt={4}>
                Order Confirmation: #{paymentIntentDetails.id}
            </Text>
            )}
            <Button
                mt={8}
                as={RouterLink}
                to={status === 'error' ? '/checkout' : '/my-designs'} // Or homepage for processing/success
                bg="brand.accentYellow"
                color="brand.textDark"
                _hover={{ bg: 'brand.accentYellowHover' }}
                borderRadius="full"
                px={8}
                py={6}
                size="lg"
                boxShadow="md"
            >
                {status === 'error' ? 'Try Payment Again' : 'Continue Shopping'}
            </Button>
        </VStack>
      </Box>
    </VStack>
  );
}
