// frontend/src/pages/ShopPage.jsx

import React, { useState, useEffect } from 'react';
import { Box, Heading, VStack, Spinner, Alert, AlertIcon, SimpleGrid, Text } from '@chakra-ui/react';
import { client } from '../api/client';
import ProductCard from '../components/shop/ProductCard';

const ShopPage = () => {
    const [products, setProducts] = useState([]); // Renamed from shopData
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        // Changed API endpoint to fetch all products directly
        client.get('/storefront/products') 
            .then(res => setProducts(res.data)) // Updated state setter
            .catch(() => setError('Could not load products. Please try again later.'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <VStack justifyContent="center" minH="60vh">
                <Spinner size="xl" color="brand.accentYellow" thickness="4px" />
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
        <VStack spacing={12} align="stretch">
            <Heading as="h1" size="2xl" color="brand.textLight" textAlign="center">
                Browse Our Collection
            </Heading>

            {products.length === 0 && !loading && ( // Updated state check
                <Box textAlign="center" py={10}>
                    <Text fontSize="xl" color="whiteAlpha.800">No products are currently available.</Text>
                </Box>
            )}

            {/* Removed category mapping, now directly maps over products */}
            <Box bg="brand.primaryLight" p={{base: 5, md: 8}} borderRadius="xl">
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3, xl: 4 }} spacing={{ base: 6, md: 8 }}>
                    {products.map((product) => ( // Directly map products
                        <ProductCard key={product._id} product={product} />
                    ))}
                </SimpleGrid>
            </Box>
        </VStack>
    );
};

export default ShopPage;
