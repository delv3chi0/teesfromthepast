// frontend/src/components/shop/ProductCard.jsx

import React from 'react';
import { Box, Image, Text, Heading, Skeleton, Icon, Flex, VStack } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaImage } from 'react-icons/fa';

/**
 * ProductCard Component
 * Displays a single product with its image, name, and price.
 * It links to the product detail page using the product slug.
 *
 * @param {object} product - The product object, with properties like _id, name, unitPrice, productImage, and slug.
 */
const ProductCard = ({ product }) => {
    // Show a skeleton loading state if the product data is not yet available.
    // This provides a better user experience than showing an empty card.
    if (!product) {
        return (
            <VStack spacing={4} p={4} layerStyle="cardBlue" borderRadius="lg" borderWidth="2px" borderColor="rgba(0,0,0,0.1)" boxShadow="sm">
                <Skeleton height="220px" width="100%" borderRadius="md" />
                <Skeleton height="24px" width="80%" />
                <Skeleton height="20px" width="50%" />
            </VStack>
        );
    }

    // The backend now sends `unitPrice` and `productImage`.
    const displayPrice = typeof product.unitPrice === 'number' ? product.unitPrice : 0;
    const imageUrl = product.productImage || '';
    const productName = product.name || 'Untitled Product';
    const productDescription = product.description || 'No description available.';

    // Ensure the slug exists for a valid navigation link.
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
            _hover={isClickable ? {
                shadow: 'xl',
                transform: 'translateY(-4px)',
                borderColor: 'brand.accentYellow'
            } : {}}
            cursor={isClickable ? 'pointer' : 'not-allowed'}
            display="flex"
            flexDirection="column"
            layerStyle="cardBlue"
            borderColor="rgba(0,0,0,0.1)"
            boxShadow="sm"
            pb="0"
            height="100%"
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
                position="relative" // For the fallback icon to be centered
            >
                <Image
                    src={imageUrl}
                    alt={`Image of ${productName}`}
                    objectFit="contain"
                    w="100%"
                    h="100%"
                    // Use FaImage as a fallback icon if imageUrl is empty or fails to load
                    fallbackSrc="https://placehold.co/300x220/383838/A9A9A9?text=Loading..." // Placeholder during image load
                >
                    <Icon as={FaImage} boxSize="50px" color="gray.500" position="absolute" />
                </Image>
            </Box>
            <Box p="4" mt="auto">
                <Heading as="h3" size="md" fontWeight="bold" noOfLines={1} title={productName}>
                    {productName}
                </Heading>
                <Text fontSize="md" mt={1} noOfLines={2} h="40px" lineHeight="short">
                    {productDescription}
                </Text>
                <Text mt={2} fontSize="2xl" color="brand.textBurnt" fontWeight="extrabold">
                    ${displayPrice.toFixed(2)}
                </Text>
            </Box>
        </Box>
    );
};

export default ProductCard;
