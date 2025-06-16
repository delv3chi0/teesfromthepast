import React from 'react';
import { Box, Image, Text, Heading, Skeleton, Icon, Flex } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaImage } from 'react-icons/fa';

const ProductCard = ({ product }) => {
  if (!product) {
    return (
      <Box><Skeleton height="220px" borderRadius="lg"/><Skeleton height="20px" mt="4" /><Skeleton height="20px" mt="2" /></Box>
    );
  }

  // --- MODIFICATION START ---

  let displayPrice = 0; // Default to 0 in case no variants or prices are found

  // Check if product has variants and at least one variant exists
  if (product.variants && product.variants.length > 0) {
    // Option 1: Display the price of the first variant (common for simple shop pages)
    displayPrice = product.variants[0].price;

    // Option 2 (Alternative): Find the lowest price among all variants
    // const prices = product.variants.map(variant => variant.price);
    // if (prices.length > 0) {
    //   displayPrice = Math.min(...prices);
    // }
  }

  // Ensure displayPrice is a number before calling toFixed.
  // The nullish coalescing (?? 0) helps, but an explicit check is safer if the backend might send non-numbers.
  const finalDisplayPrice = typeof displayPrice === 'number' ? displayPrice : 0;

  // --- MODIFICATION END ---

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
        bg="brand.cardBlue"
        borderColor="transparent"
    >
      <Box h="220px" bg="brand.secondary" p={4} display="flex" alignItems="center" justifyContent="center">
        <Image
          src={product.defaultImage}
          alt={`Image of ${product.name}`}
          objectFit="contain"
          w="100%"
          h="100%"
          fallback={<Icon as={FaImage} boxSize="50px" color="gray.500" />}
        />
      </Box>
      <Box p="4" mt="auto">
        <Heading as="h3" size="sm" fontWeight="semibold" noOfLines={1} title={product.name} color="brand.textLight">
          {product.name}
        </Heading>
        <Text fontSize="sm" color="brand.textMuted" mt={1} noOfLines={2} h="40px">
          {product.description}
        </Text>
        <Text mt={2} fontSize="xl" color="brand.accentYellow" fontWeight="bold">
          ${finalDisplayPrice.toFixed(2)} {/* Use the calculated finalDisplayPrice */}
        </Text>
      </Box>
    </Box>
  );
};

export default ProductCard;
