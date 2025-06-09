// frontend/src/components/shop/ProductCard.jsx
import React from 'react';
import { Box, Image, Text, VStack, Heading, Skeleton } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

const ProductCard = ({ product }) => {
  if (!product) {
    return (
      <Box>
        <Skeleton height="220px" borderRadius="lg"/>
        <Skeleton height="20px" mt="4" />
        <Skeleton height="20px" mt="2" />
      </Box>
    );
  }

  return (
    <Box
      as={RouterLink}
      to={`/product/${product.slug}`}
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      transition="all 0.2s ease-in-out"
      _hover={{ shadow: 'lg', transform: 'translateY(-4px)' }}
      display="block"
      bg="white"
    >
      <Image
        src={product.defaultImage}
        alt={`Image of ${product.name}`}
        objectFit="cover"
        w="100%"
        h="220px" // Made image smaller
        fallback={<Skeleton height="220px" />}
        htmlWidth="400" // Hint for browser on image quality
        htmlHeight="400"
      />
      <Box p="4"> {/* Reduced padding */}
        <Heading as="h3" size="sm" fontWeight="semibold" noOfLines={1} title={product.name}>
          {product.name}
        </Heading>
        <Text fontSize="sm" color="gray.600" mt={1} noOfLines={2} h="40px">
          {product.description}
        </Text>
        <Text mt={2} fontSize="xl" color="brand.textDark" fontWeight="bold">
          ${product.basePrice.toFixed(2)}
        </Text>
      </Box>
    </Box>
  );
};

export default ProductCard;
