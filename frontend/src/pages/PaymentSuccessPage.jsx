// frontend/src/pages/PaymentSuccessPage.jsx

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Box, Heading, Text, Spinner, Button, VStack, Icon as ChakraUIIcon } from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, InfoIcon } from '@chakra-ui/icons';

/**
 * Payment Success Page
 * REFRACTORED:
 * - Page background and content card updated to match the site's dark theme.
 * - All text, icon, and spinner colors changed to light/accent variants for high contrast.
 * - Button style standardized for consistency with the rest of the application.
 */

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function PaymentSuccessPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [message, setMessage] = useState('Verifying your payment, please wait...');
    const [status, setStatus] = useState('loading');
    const [paymentIntentDetails, setPaymentIntentDetails] = useState(null);

    useEffect(() => {
        const clientSecret = searchParams.get('payment_intent_client_secret');
        
        if (!clientSecret) {
            setMessage('Error: Payment information is missing. Unable to confirm payment status.');
            setStatus('error');
            return;
        }

        const verifyPayment = async () => {
            const stripe = await stripePromise;
            if (!stripe) {
                setMessage('Error: Payment system could not be initialized. Please contact support.');
                setStatus('error');
                return;
            }

            const { error, paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

            if (error) {
                setMessage(error.message || 'An error occurred while verifying your payment.');
                setStatus('error');
            } else if (paymentIntent) {
                setPaymentIntentDetails(paymentIntent);

                switch (paymentIntent.status) {
                    case 'succeeded':
                        setMessage('Thank you! Your payment was successful and your order is confirmed.');
                        setStatus('success');
                        break;
                    case 'processing':
                        setMessage('Your payment is processing. We will update you once it is confirmed.');
                        setStatus('processing');
                        break;
                    case 'requires_payment_method':
                        setMessage('Payment failed. Please try another payment method or check your details.');
                        setStatus('error');
                        break;
                    default:
                        setMessage(`Payment status: ${paymentIntent.status}. Please contact support if this persists.`);
                        setStatus('error');
                        break;
                }
            }
        };

        verifyPayment();
    }, [searchParams, navigate]);

    if (status === 'loading') {
        return (
            <VStack justifyContent="center" alignItems="center" minH="80vh" spacing={5} bg="brand.primary" p={4}>
                <Spinner size="xl" thickness="4px" color="brand.accentYellow" speed="0.65s" emptyColor="whiteAlpha.300"/>
                <Text fontSize="xl" color="brand.textLight" fontWeight="medium">{message}</Text>
            </VStack>
        );
    }

    let alertTitle = 'Payment Status';
    let AlertIconComponent = InfoIcon;
    let iconColor = 'blue.400';

    if (status === 'success') {
        alertTitle = 'Payment Confirmed!';
        AlertIconComponent = CheckCircleIcon;
        iconColor = 'green.400';
    } else if (status === 'error') {
        alertTitle = 'Payment Issue';
        AlertIconComponent = WarningIcon;
        iconColor = 'red.400';
    } else if (status === 'processing') {
        alertTitle = 'Payment Processing';
        AlertIconComponent = InfoIcon;
        iconColor = 'blue.400';
    }

    return (
        <VStack spacing={6} textAlign="center" py={10} px={6} minH="80vh" justifyContent="center" bg="brand.primary">
            <Box bg="brand.primaryLight" p={{base: 6, md:10}} borderRadius="xl" shadow="2xl" maxW="lg" w="full" borderWidth="1px" borderColor="whiteAlpha.200">
                <VStack spacing={5}>
                    <ChakraUIIcon as={AlertIconComponent} boxSize={{base:"48px", md:"60px"}} color={iconColor} />
                    <Heading as="h2" size="xl" mt={4} color="brand.textLight">
                        {alertTitle}
                    </Heading>
                    <Text color="whiteAlpha.800" fontSize="lg" px={4}>{message}</Text>
                    {paymentIntentDetails && status === 'success' && (
                        <Text fontSize="md" color="whiteAlpha.600" pt={4}>
                            Order Confirmation: #{paymentIntentDetails.id}
                        </Text>
                    )}
                    <Button
                        mt={8}
                        as={RouterLink}
                        to={status === 'error' ? '/checkout' : '/shop'}
                        bg="brand.accentYellow"
                        color="brand.textDark"
                        _hover={{ bg: 'brand.accentYellowHover' }}
                        borderRadius="lg" // Standardized border radius
                        px={8}
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
