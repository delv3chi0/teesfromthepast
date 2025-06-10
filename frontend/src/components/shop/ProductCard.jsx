// frontend/src/components/shop/ProductCard.jsx
import React from 'react';
import { Box, Image, Text, VStack, Heading, Skeleton, Icon, Flex } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaImage } from 'react-icons/fa';

const ProductCard = ({ product }) => {
  if (!product) {
    return (
      <Box><Skeleton height="220px" borderRadius="lg"/><Skeleton height="20px" mt="4" /><Skeleton height="20px" mt="2" /></Box>
    );
  }

  const productUrl = product.slug ? `/product/${product.slug}` : '#';
  const isClickable = !!product.slug;

  return (
    <Box as={isClickable ? RouterLink : 'div'} to={productUrl} borderWidth="1px" borderRadius="lg" overflow="hidden" transition="all 0.2s ease-in-out" _hover={isClickable ? { shadow: 'lg', transform: 'translateY(-4px)' } : {}} cursor={isClickable ? 'pointer' : 'not-allowed'} display="flex" flexDirection="column" bg="white">
      <Box h="220px" bg="gray.50" p={4} display="flex" alignItems="center" justifyContent="center">
        <Image
          src={product.defaultImage || ''}
          alt={`Image of ${product.name}`}
          objectFit="contain"
          w="100%"
          h="100%"
          fallback={<Icon as={FaImage} boxSize="50px" color="gray.300" />}
          htmlWidth="400"
          htmlHeight="400"
        />
      </Box>
      <Box p="4" mt="auto">
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
