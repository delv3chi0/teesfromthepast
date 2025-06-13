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

  const productUrl = product.slug ? `/product/${product.slug}` : '#';
  const isClickable = !!product.slug;

  return (
    // MODIFIED: Applied themed background and border colors
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
      {/* MODIFIED: Updated image container background */}
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
        {/* MODIFIED: Updated text colors for dark theme */}
        <Heading as="h3" size="sm" fontWeight="semibold" noOfLines={1} title={product.name} color="brand.textLight">
          {product.name}
        </Heading>
        <Text fontSize="sm" color="brand.textMuted" mt={1} noOfLines={2} h="40px">
          {product.description}
        </Text>
        <Text mt={2} fontSize="xl" color="brand.accentYellow" fontWeight="bold">
          ${product.basePrice.toFixed(2)}
        </Text>
      </Box>
    </Box>
  );
};

export default ProductCard;
