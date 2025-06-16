import React, { useState, useEffect } from 'react';
import { Box, Heading, VStack, Spinner, Alert, AlertIcon, SimpleGrid, Text } from '@chakra-ui/react';
import { client } from '../api/client';
import ProductCard from '../components/shop/ProductCard';

/**
 * Shop Page
 * Displays all products in a single, responsive grid, without categories.
 */
const ShopPage = () => {
    const [products, setProducts] = useState([]); // Renamed from shopData for clarity
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        // Assuming your backend endpoint /storefront/shop-data now returns a flat array of products
        client.get('/storefront/shop-data')
            .then(res => {
                // If backend still sends categories, flatten it here for now (TEMPORARY FIX)
                // This is a fallback if you can't update the backend immediately.
                // It's better to change the backend.
                // const allProducts = res.data.flatMap(category => category.products);
                // setProducts(allProducts);

                // If backend directly sends a flat array of products (IDEAL)
                setProducts(res.data);
            })
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
        <VStack spacing={8} align="stretch" py={8} px={{ base: 4, md: 8 }}> {/* Added padding for better spacing */}
            <Heading as="h1" size="2xl" color="brand.textLight" textAlign="center" mb={6}>
                Our Awesome Collection
            </Heading>

            {products.length === 0 && ( // Removed !loading as it's already handled by the loading state check
                <Box textAlign="center" py={10}>
                    <Text fontSize="xl" color="whiteAlpha.800">No products are currently available. Check back soon!</Text>
                </Box>
            )}

            {products.length > 0 && (
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={{ base: 6, md: 8 }}> {/* Adjusted columns for potentially 12 items */}
                    {products.map((product) => (
                        <ProductCard key={product._id} product={product} />
                    ))}
                </SimpleGrid>
            )}
        </VStack>
    );
};

export default ShopPage;
