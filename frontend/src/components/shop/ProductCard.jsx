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

  const displayPrice = typeof product.basePrice === 'number' ? product.basePrice : 0;
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
        layerStyle="cardBlue" 
        // Adding a subtle border for default state, and a slight shadow
        borderColor="rgba(0,0,0,0.1)" // A subtle dark border
        boxShadow="sm" // A subtle initial shadow for depth
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
        {/* Slightly increase name size for impact, use normal weight if it's too chunky */}
        <Heading as="h3" size="md" fontWeight="bold" noOfLines={1} title={product.name}> {/* Changed size to md, bold for emphasis */}
          {product.name}
        </Heading>
        {/* Increase description size and line height for better readability */}
        <Text fontSize="md" mt={1} noOfLines={2} h="40px" lineHeight="short"> {/* Changed fontSize to md, added lineHeight */}
          {product.description}
        </Text>
        {/* Keep price as textBurnt, but consider if another accent color (dark) is better */}
        <Text mt={2} fontSize="2xl" color="brand.textBurnt" fontWeight="extrabold"> {/* Changed fontSize to 2xl, fontWeight extrabold */}
          ${displayPrice.toFixed(2)}
        </Text>
      </Box>
    </Box>
  );
};

export default ProductCard;
