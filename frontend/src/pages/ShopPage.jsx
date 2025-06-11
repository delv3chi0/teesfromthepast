// frontend/src/pages/ShopPage.jsx

import React, { useState, useEffect } from 'react';
import { Box, Heading, VStack, Spinner, Alert, AlertIcon, SimpleGrid, Text } from '@chakra-ui/react';
import { client } from '../api/client';
import ProductCard from '../components/shop/ProductCard';

/**
 * Shop Page
 * REFRACTORED:
 * - Replaced default Card components with custom-styled dark cards for category sections.
 * - Updated heading and divider styles to match the dark theme aesthetic.
 * - Styled loader and alert states for better visual consistency.
 * - Ensured a full-width layout suitable for a product gallery.
 */
const ShopPage = () => {
    const [shopData, setShopData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        client.get('/storefront/shop-data')
            .then(res => setShopData(res.data))
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

            {shopData.length === 0 && !loading && (
                <Box textAlign="center" py={10}>
                    <Text fontSize="xl" color="whiteAlpha.800">No products are currently available.</Text>
                </Box>
            )}

            {shopData.map((category) => (
                // Use a styled Box instead of a default Card for theming
                <Box key={category.categoryId} bg="brand.primaryLight" p={{base: 5, md: 8}} borderRadius="xl">
                    <Heading
                        as="h2"
                        size="xl"
                        mb={8}
                        color="brand.textLight"
                        borderBottomWidth="2px"
                        borderColor="whiteAlpha.300" // Use a lighter border color for dark theme
                        pb={3}
                    >
                        {category.categoryName}
                    </Heading>
                    <SimpleGrid columns={{ base: 1, sm: 2, md: 3, xl: 4 }} spacing={{ base: 6, md: 8 }}>
                        {category.products.map((product) => (
                            <ProductCard key={product._id} product={product} />
                        ))}
                    </SimpleGrid>
                </Box>
            ))}
        </VStack>
    );
};

export default ShopPage;
