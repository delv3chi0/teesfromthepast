// frontend/src/components/shop/ProductCard.jsx
import React from 'react';
import { Box, Image, Text, VStack, Heading, Skeleton } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

const ProductCard = ({ product }) => {
  if (!product) {
    return (
      <Box>
        <Skeleton height="250px" />
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
        src={product.defaultImage || 'https://via.placeholder.com/400?text=No+Image'}
        alt={`Image of ${product.name}`}
        objectFit="cover"
        w="100%"
        h="250px"
        fallback={<Skeleton height="250px" />}
      />
      <Box p="6">
        <Heading as="h3" size="md" fontWeight="semibold" noOfLines={1}>
          {product.name}
        </Heading>
        <Text mt={2} fontSize="lg" color="brand.textSlightlyDark">
          ${product.basePrice.toFixed(2)}
        </Text>
      </Box>
    </Box>
  );
};

export default ProductCard;
