// frontend/src/components/CheckoutForm.jsx
import React, { useEffect, useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button, Box, Text, useToast, VStack, Link as ChakraLink } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";


export default function CheckoutForm({ designDetails }) {
  const stripe = useStripe();
  const elements = useElements();
  const toast = useToast();

  const [message, setMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      setMessage("Stripe.js is not loaded yet. Please wait a moment.");
      return;
    }

    setIsProcessing(true);
    setMessage(null); // Clear previous messages

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Make sure to change this to your payment completion page
        return_url: `${window.location.origin}/payment-success`,
        // You can pass additional payment method data here if needed
        // payment_method_data: {
        //   billing_details: {
        //     name: 'Jenny Rosen', // Example, collect this from user
        //   }
        // }
      },
      // redirect: 'if_required' // Use this if you want to handle success/failure without redirect immediately
    });

    // This point will only be reached if there is an immediate error when
    // confirming the payment. Otherwise, your customer will be redirected to
    // your `return_url`. For some payment methods like iDEAL, your customer will
    // be redirected to an intermediate site first to authorize the payment, then
    // redirected to the `return_url`.
    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message);
      } else {
        setMessage("An unexpected error occurred.");
      }
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // This block might not be reached if redirect: 'if_required' is not used,
      // as Stripe redirects to return_url on success.
      // If using redirect: 'if_required', handle success here.
      setMessage(`Payment Succeeded! Payment Intent ID: ${paymentIntent.id}`);
      toast({
        title: "Payment Successful!",
        description: "Your order is confirmed.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      // Here you would typically redirect to an order confirmation page
      // or update UI, e.g. navigate('/order-confirmation')
    }

    setIsProcessing(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <VStack spacing={6}>
        <PaymentElement id="payment-element" />
        <Button
          disabled={isProcessing || !stripe || !elements}
          id="submit"
          type="submit"
          isLoading={isProcessing}
          loadingText="Processing..."
          bg="brand.accentOrange"
          color="brand.textLight"
          _hover={{ bg: 'brand.accentOrangeHover' }}
          size="lg"
          width="full"
          borderRadius="full"
          py={6}
          fontSize="lg"
          boxShadow="md"
        >
          Pay now
        </Button>
        {/* Show any error or success messages */}
        {message && <Text id="payment-message" color={message.startsWith("Payment Succeeded") ? "green.500" : "red.500"} fontWeight="medium" pt={2}>{message}</Text>}
      </VStack>
    </form>
  );
}
