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

  let displayPrice = 0; // Default to 0 in case no variants or prices are found

  if (product.variants && product.variants.length > 0) {
    displayPrice = product.variants[0].price;
  }
  const finalDisplayPrice = typeof displayPrice === 'number' ? displayPrice : 0;
  const imageUrl = product.defaultImage || '';

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
        layerStyle="cardBlue" // Applies the light background and dark default text
        borderColor="transparent"
    >
      <Box h="220px" bg="brand.secondary" p={4} display="flex" alignItems="center" justifyContent="center">
        <Image
          src={imageUrl}
          alt={`Image of ${product.name}`}
          objectFit="contain"
          w="100%"
          h="100%"
          fallback={<Icon as={FaImage} boxSize="50px" color="gray.500" />}
        />
      </Box>
      <Box p="4" mt="auto">
        {/* MODIFIED: Removed explicit color="brand.textLight". It will now inherit brand.textBurnt from layerStyle="cardBlue" */}
        <Heading as="h3" size="sm" fontWeight="semibold" noOfLines={1} title={product.name}>
          {product.name}
        </Heading>
        {/* MODIFIED: Removed explicit color="brand.textMuted". It will now inherit brand.textDark from layerStyle="cardBlue" */}
        <Text fontSize="sm" mt={1} noOfLines={2} h="40px">
          {product.description}
        </Text>
        {/* MODIFIED: Changed color to brand.textBurnt for strong contrast on light background */}
        <Text mt={2} fontSize="xl" color="brand.textBurnt" fontWeight="bold">
          ${finalDisplayPrice.toFixed(2)}
        </Text>
      </Box>
    </Box>
  );
};

export default ProductCard;
