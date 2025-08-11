import React from 'react';
import {
  Box,
  Image,
  Text,
  Heading,
  VStack,
  LinkBox,
  LinkOverlay,
  useColorModeValue,
} from '@chakra-ui/react';
import { Link as ReactRouterLink } from 'react-router-dom';
import PropTypes from 'prop-types';

function pickPrimaryImage(product) {
  const placeholder = 'https://placehold.co/400x500/1a202c/a0aec0?text=No+Image';
  if (!product || typeof product !== 'object') return placeholder;
  const direct = product.image || product.thumbnail || product.preview;
  if (direct) return direct;

  const images = Array.isArray(product.images) ? product.images : [];
  if (images[0]?.url) return images[0].url;
  if (images[0]) return images[0];

  const v0 = Array.isArray(product.variants) ? product.variants[0] : null;
  if (v0?.image) return v0.image;
  const set = Array.isArray(v0?.imageSet) ? v0.imageSet : [];
  if (set[0]?.url) return set[0].url;

  const files = Array.isArray(v0?.files) ? v0.files : [];
  if (files[0]?.preview_url) return files[0].preview_url;
  if (files[0]?.url) return files[0].url;
  if (files[0]?.thumbnail_url) return files[0].thumbnail_url;

  return placeholder;
}

function formatPrice(p) {
  const money = (n) => `$${Number(n).toFixed(2)}`;
  if (typeof p?.basePrice === 'number') return money(p.basePrice);
  const { priceMin, priceMax } = p || {};
  if (typeof priceMin === 'number' && typeof priceMax === 'number') {
    return priceMin === priceMax ? money(priceMin) : `${money(priceMin)} – ${money(priceMax)}`;
  }
  if (typeof priceMin === 'number') return money(priceMin);
  if (typeof priceMax === 'number') return money(priceMax);
  const vs = (p?.variants || []).map(v => Number(v.price)).filter(n => !Number.isNaN(n) && n > 0);
  if (vs.length) {
    const mi = Math.min(...vs); const ma = Math.max(...vs);
    return mi === ma ? money(mi) : `${money(mi)} – ${money(ma)}`;
  }
  return 'Price on request';
}

const ProductCard = ({ product }) => {
  const cardBg   = useColorModeValue('brand.cardBgLight', 'brand.cardBgDark');
  const textColor= useColorModeValue('brand.textLight', 'brand.textDark');

  const imageUrl = pickPrimaryImage(product);
  const price    = formatPrice(product);
  const slug     = product.slug || product.handle || String(product._id ?? product.id ?? '');

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
          alt={product?.name || "Product image"}
          objectFit="cover"
          position="absolute"
          top="0"
          left="0"
          w="100%"
          h="100%"
          fallbackSrc="https://placehold.co/400x500/1a202c/a0aec0?text=No+Image"
          transition="transform 0.3s ease-in-out"
          _groupHover={{ transform: 'scale(1.05)' }}
          loading="lazy"
        />
      </Box>

      <VStack align="flex-start" spacing={1} flexGrow={1}>
        <Heading as="h3" size="md" color={textColor} noOfLines={2}>
          <LinkOverlay as={ReactRouterLink} to={`/shop/${slug}`} />
          {product?.name || 'Untitled Product'}
        </Heading>
        <Text fontSize="lg" fontWeight="bold" color="brand.primary">{price}</Text>
      </VStack>
    </LinkBox>
  );
};

ProductCard.propTypes = { product: PropTypes.object.isRequired };
export default ProductCard;
