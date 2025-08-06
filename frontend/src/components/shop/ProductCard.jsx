// frontend/src/components/shop/ProductCard.jsx

import React from 'react';
import { Box, Image, Text, Heading, Skeleton, Icon, Flex } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaImage } from 'react-icons/fa'; // Ensure this is installed: npm install react-icons

/**
 * ProductCard Component
 * Displays a single product with its image, name, and price.
 * Links to the product detail page using the product slug.
 *
 * @param {object} product - The product object with properties like _id, name, unitPrice, productImage, slug.
 */
const ProductCard = ({ product }) => {
    // Show skeleton loading state if product is not yet available
    if (!product) {
        return (
            <Box><Skeleton height="220px" borderRadius="lg"/><Skeleton height="20px" mt="4" /><Skeleton height="20px" mt="2" /></Box>
        );
    }

    // Use unitPrice from the backend, which is now derived from Printful's retail_price
    const displayPrice = typeof product.unitPrice === 'number' ? product.unitPrice : 0;
    // Use productImage from the backend, which is now derived from Printful's thumbnail_url
    const imageUrl = product.productImage || '';

    // Ensure slug is present for linking
    const productUrl = product.slug ? `/product/${product.slug}` : '#';
    const isClickable = !!product.slug;

    return (
        <Box
            as={isClickable ? RouterLink : 'div'}
            to={productUrl}
            borderWidth="2px"
            borderRadius="lg"
            overflow="hidden"
            transition="all 0.2s ease-in-out"
            _hover={isClickable ? { shadow: 'lg', transform: 'translateY(-4px)', borderColor: 'brand.accentYellow' } : {}}
            cursor={isClickable ? 'pointer' : 'not-allowed'}
            display="flex"
            flexDirection="column"
            // Retain your custom layerStyle and subtle border/shadow
            layerStyle="cardBlue"
            borderColor="rgba(0,0,0,0.1)"
            boxShadow="sm"
            pb="0"
        >
            <Box
                h="220px"
                bg="brand.cardBlue"
                p={0}
                display="flex"
                alignItems="center"
                justifyContent="center"
                borderBottom="1px solid"
                borderColor="rgba(0,0,0,0.05)"
            >
                {/* Use your existing Image component setup with fallback */}
                <Image
                    src={imageUrl}
                    alt={`Image of ${product.name}`}
                    objectFit="contain" // Keep objectFit="contain" as per your original
                    w="100%"
                    h="100%"
                    // Use FaImage as a fallback icon if imageUrl is empty or fails to load
                    fallback={<Icon as={FaImage} boxSize="50px" color="gray.500" />}
                />
            </Box>
            <Box p="4" mt="auto">
                <Heading as="h3" size="md" fontWeight="bold" noOfLines={1} title={product.name}>
                    {product.name}
                </Heading>
                {/* Use description from the product object if available */}
                <Text fontSize="md" mt={1} noOfLines={2} h="40px" lineHeight="short">
                    {product.description || "No description available."}
                </Text>
                <Text mt={2} fontSize="2xl" color="brand.textBurnt" fontWeight="extrabold">
                    ${displayPrice.toFixed(2)}
                </Text>
            </Box>
        </Box>
    );
};

export default ProductCard;
