// frontend/src/components/CheckoutForm.jsx
import React, { useState } from "react"; // Removed useEffect as it wasn't used
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button, Box, Text, useToast, VStack } from "@chakra-ui/react"; // Removed Link as ChakraLink and RouterLink as they weren't used

export default function CheckoutForm({ designDetails }) {
  const stripe = useStripe();
  const elements = useElements();
  const toast = useToast();

  const [message, setMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setMessage("Stripe.js is not loaded yet. Please wait a moment.");
      return;
    }

    setIsProcessing(true);
    setMessage(null); 

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
    });

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message);
      } else {
        setMessage("An unexpected error occurred.");
      }
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setMessage(`Payment Succeeded! Payment Intent ID: ${paymentIntent.id}`);
      toast({
        title: "Payment Successful!",
        description: "Your order is confirmed.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
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
          bg="brand.accentYellow"      // Primary Action Style
          color="brand.textDark"       // Primary Action Style
          _hover={{ bg: 'brand.accentYellowHover' }} // Assuming this is in your theme
          size="lg"                    // Primary Action Style (consistent size)
          width="full"
          borderRadius="full"         // Primary Action Style
          // py={6} // Using size="lg" for consistent padding, can be re-added if larger button desired
          // fontSize="lg" // size="lg" implies appropriate font size
          boxShadow="md" // Kept for prominence
        >
          Pay now
        </Button>
        {message && (
          <Text 
            id="payment-message" 
            color={message.startsWith("Payment Succeeded") ? "green.500" : "red.500"} 
            fontWeight="medium" 
            pt={2}
          >
            {message}
          </Text>
        )}
      </VStack>
    </form>
  );
}
