// frontend/src/components/shop/ProductCard.jsx

import React from 'react';
import { Box, Image, Text, Flex, Heading, VStack, LinkBox, LinkOverlay, useColorModeValue } from '@chakra-ui/react';
import { Link as ReactRouterLink } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * ProductCard component displays a single product with its image, name, and price.
 * It is designed to be robust against missing data by using placeholder images and default values.
 *
 * @param {object} product The product object from the backend.
 */
const ProductCard = ({ product }) => {
  const cardBg = useColorModeValue('brand.cardBgLight', 'brand.cardBgDark');
  const textColor = useColorModeValue('brand.textLight', 'brand.textDark');
  const placeholderImg = 'https://placehold.co/400x500/1a202c/a0aec0?text=No+Image';

  // Safely get the first variant's image or use a placeholder
  const imageUrl = product.variants?.[0]?.imageSet?.[0]?.url || placeholderImg;
  const productPrice = product.basePrice ? `$${product.basePrice.toFixed(2)}` : 'Price on request';

  return (
    <LinkBox
      as={VStack}
      spacing={4}
      p={4}
      bg={cardBg}
      borderRadius="lg"
      boxShadow="md"
      _hover={{ boxShadow: 'xl', transform: 'scale(1.02)' }}
      transition="all 0.2s ease-in-out"
      align="stretch"
      role="group"
      cursor="pointer"
    >
      <Box position="relative" overflow="hidden" borderRadius="md" w="100%" pt="125%">
        <Image
          src={imageUrl}
          alt={product.name || "Product image"}
          objectFit="cover"
          position="absolute"
          top="0"
          left="0"
          w="100%"
          h="100%"
          fallbackSrc={placeholderImg}
          transition="transform 0.3s ease-in-out"
          _groupHover={{ transform: 'scale(1.05)' }}
          loading="lazy"
        />
      </Box>

      <VStack align="flex-start" spacing={1} flexGrow={1}>
        <Heading as="h3" size="md" color={textColor} noOfLines={2}>
          <LinkOverlay as={ReactRouterLink} to={`/shop/${product.slug}`} />
          {product.name || 'Untitled Product'}
        </Heading>
        <Text fontSize="lg" fontWeight="bold" color="brand.primary">
          {productPrice}
        </Text>
      </VStack>
    </LinkBox>
  );
};

ProductCard.propTypes = {
  product: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string,
    basePrice: PropTypes.number,
    slug: PropTypes.string,
    variants: PropTypes.arrayOf(
      PropTypes.shape({
        imageSet: PropTypes.arrayOf(
          PropTypes.shape({
            url: PropTypes.string,
          })
        ),
      })
    ),
  }).isRequired,
};

export default ProductCard;
