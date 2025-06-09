// frontend/src/Home.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Box, Button, Input, Image, Text, VStack, Heading, Spinner, Alert, AlertIcon } from '@chakra-ui/react';

function Home() {
    const [prompt, setPrompt] = useState('');
    const [generatedImageUrl, setGeneratedImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Function to handle image generation
    const handleGenerateImage = async () => {
        setError(''); // Clear previous errors
        if (!prompt.trim()) {
            setError('Please enter a prompt to generate a design.');
            return;
        }
        setLoading(true);
        setGeneratedImageUrl(''); // Clear previous image

        try {
            // Call your backend's image generation endpoint
            // IMPORTANT: For local development, use http://localhost:5000.
            // For deployment, replace with your Render backend URL (e.g., https://your-backend-name.onrender.com/api/generateImage)
            const response = await axios.post('http://localhost:5000/api/generateImage', { prompt });

            if (response.data && response.data.imageUrl) {
                setGeneratedImageUrl(response.data.imageUrl);
            } else {
                setError('No image received from the server. Please try again.');
            }
        } catch (err) {
            console.error('Error generating image:', err);
            setError(err.response?.data?.message || 'Failed to generate image. Please check backend logs.');
        } finally {
            setLoading(false);
        }
    };

    // Function to handle Stripe checkout
    const handleCheckout = async () => {
        setError(''); // Clear previous errors
        if (!generatedImageUrl) {
            setError('Please generate a design before proceeding to checkout.');
            return;
        }
        setLoading(true); // You might want a separate loading state for checkout

        try {
            // Call your backend's Stripe checkout endpoint
            // IMPORTANT: For local development, use http://localhost:5000.
            // For deployment, replace with your Render backend URL (e.g., https://your-backend-name.onrender.com/api/checkout)
            const response = await axios.post('http://localhost:5000/api/checkout', {
                items: [
                    {
                        // These details would ideally come from a database or a more robust product definition
                        // For now, we're hardcoding a generic T-shirt product
                        id: 'ai-generated-tshirt-design', // A static product ID for now
                        name: 'AI Generated Retro T-Shirt',
                        price: 2500, // Price in cents ($25.00)
                        imageUrl: generatedImageUrl, // Pass the generated image to the backend for Stripe
                        quantity: 1,
                    },
                ],
            });

            if (response.data && response.data.url) {
                // Redirect the user to Stripe Checkout
                window.location.href = response.data.url;
            } else {
                setError('Failed to initiate checkout. No Stripe URL received.');
            }
        } catch (err) {
            console.error('Error during checkout:', err);
            setError(err.response?.data?.message || 'Failed to proceed to checkout. Please check backend logs and Stripe configuration.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <VStack spacing={8} p={5} align="center">
            <Heading as="h1" size="xl" mb={4}>Tees From The Past</Heading>
            <Text fontSize="lg">Generate your unique retro t-shirt design!</Text>

            <Box width="100%" maxWidth="500px">
                <Input
                    placeholder="e.g., 'A pixel art dinosaur playing a guitar in the 80s'"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    size="lg"
                    mb={3}
                />
                <Button
                    colorScheme="purple"
                    size="lg"
                    onClick={handleGenerateImage}
                    isLoading={loading}
                    disabled={loading}
                    width="100%"
                >
                    Generate Retro Design
                </Button>
            </Box>

            {error && (
                <Alert status="error" mt={4} maxWidth="500px">
                    <AlertIcon />
                    {error}
                </Alert>
            )}

            {loading && !generatedImageUrl && (
                <VStack spacing={4} mt={8}>
                    <Spinner size="xl" color="purple.500" />
                    <Text>Generating your awesome retro design...</Text>
                </VStack>
            )}

            {generatedImageUrl && (
                <VStack spacing={4} mt={8}>
                    <Heading as="h2" size="md">Your Custom Design:</Heading>
                    <Image
                        src={generatedImageUrl}
                        alt="Generated T-Shirt Design"
                        boxSize="300px" // Adjust size as needed
                        objectFit="cover"
                        borderRadius="lg"
                        boxShadow="lg"
                    />
                    <Button
                        colorScheme="green"
                        size="lg"
                        onClick={handleCheckout}
                        isLoading={loading} // Reuse loading, or make a separate one for checkout
                        disabled={loading}
                        mt={4}
                    >
                        Buy This Retro Tee for $25.00!
                    </Button>
                </VStack>
            )}
        </VStack>
    );
}

export default Home;
