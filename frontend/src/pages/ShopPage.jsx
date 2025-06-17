// frontend/src/pages/ShopPage.jsx

import React, { useState, useEffect } from 'react';
import { Box, Heading, VStack, Spinner, Alert, AlertIcon, SimpleGrid, Text } from '@chakra-ui/react';
import { client } from '../api/client';
import ProductCard from '../components/shop/ProductCard';

/**
 * Shop Page
 * Displays all products in a single, responsive grid, without categories.
 * Now directly expects and processes a flat array of products from the backend.
 */
const ShopPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        client.get('/storefront/shop-data')
            .then(res => {
                // Backend now consistently sends a flat array of products.
                // The previous `flatMap` logic for handling categories is no longer needed.
                setProducts(res.data);
            })
            .catch((err) => {
                console.error("Error loading products:", err);
                setError('Could not load products. Please try again later.');
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <VStack justifyContent="center" minH="60vh">
                {/* Removed explicit color prop; Spinner will now use its default from theme.js */}
                <Spinner size="xl" thickness="4px" />
                <Text mt={4} fontSize="lg" color="brand.textLight">Loading Collection...</Text>
            </VStack>
        );
    }

    if (error) {
        return (
            <Alert status="error" bg="red.900" borderRadius="md" p={6} borderWidth="1px" borderColor="red.500">
                <AlertIcon color="red.300" />
                <Text color="white">{error}</Text>
            </Alert>
        );
    }

    return (
        <VStack spacing={8} align="stretch" py={8} px={{ base: 4, md: 8 }}>
            <Heading as="h1" size="2xl" color="brand.textLight" textAlign="center" mb={6}>
                Our Awesome Collection
            </Heading>

            {products.length === 0 && (
                <Box textAlign="center" py={10}>
                    <Text fontSize="xl" color="whiteAlpha.800">No products are currently available. Check back soon!</Text>
                </Box>
            )}

            {products.length > 0 && (
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={{ base: 6, md: 8 }}>
                    {products.map((product) => (
                        <ProductCard key={product._id} product={product} />
                    ))}
                </SimpleGrid>
            )}
        </VStack>
    );
};

export default ShopPage;
