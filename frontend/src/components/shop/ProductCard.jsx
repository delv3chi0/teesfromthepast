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

  let displayPrice = 0;
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
        pb="0" // Set padding bottom to 0 for a tighter image/text separation if desired
    >
      {/* MODIFIED: Change background of image container to match cardBlue */}
      <Box 
        h="220px" 
        bg="brand.cardBlue" // <--- CRITICAL CHANGE: Matches the card background
        p={0} // <--- Set padding to 0, assume image has its own padding or is full bleed
        display="flex" 
        alignItems="center" 
        justifyContent="center"
        borderBottom="1px solid" // Add a subtle border below image if it helps separation
        borderColor="rgba(0,0,0,0.05)" // Very light border for separation
      >
        <Image
          src={imageUrl}
          alt={`Image of ${product.name}`}
          objectFit="contain" // Ensures image fits without cropping
          w="100%"
          h="100%"
          fallback={<Icon as={FaImage} boxSize="50px" color="gray.500" />}
          // Consider adding maxW="90%" maxH="90%" to give some internal padding to image itself
          // maxW="90%"
          // maxH="90%"
          // p={4} // Or add padding directly to the image if it should shrink
        />
      </Box>
      <Box p="4" mt="auto">
        <Heading as="h3" size="sm" fontWeight="semibold" noOfLines={1} title={product.name}>
          {product.name}
        </Heading>
        <Text fontSize="sm" mt={1} noOfLines={2} h="40px">
          {product.description}
        </Text>
        <Text mt={2} fontSize="xl" color="brand.textBurnt" fontWeight="bold">
          ${finalDisplayPrice.toFixed(2)}
        </Text>
      </Box>
    </Box>
  );
};

export default ProductCard;
