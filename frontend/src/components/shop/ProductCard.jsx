import React from 'react';
import {
  Box, Image, Text, Heading, VStack, LinkBox, LinkOverlay,
  useDisclosure, HStack, Button, Tooltip, Badge, useColorModeValue
} from '@chakra-ui/react';
import { Link as ReactRouterLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import QuickViewModal from './QuickViewModal';

function pickPrimaryImage(product) {
  const placeholder = 'https://placehold.co/600x750/1a202c/a0aec0?text=No+Image';
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
function priceText(p) {
  const money = (n) => `$${Number(n).toFixed(2)}`;
  if (typeof p?.basePrice === 'number') return money(p.basePrice);
  const { priceMin, priceMax } = p || {};
  if (typeof priceMin === 'number' && typeof priceMax === 'number') {
    return priceMin === priceMax ? money(priceMin) : `${money(priceMin)} – ${money(priceMax)}`;
  }
  if (typeof priceMin === 'number') return money(priceMin);
  if (typeof priceMax === 'number') return money(priceMax);
  return 'Price on request';
}
function previewColors(product) {
  const set = new Set();
  (product?.colors || []).forEach((c) => set.add(c));
  (product?.variants || []).forEach((v) => v?.color && set.add(v.color));
  return Array.from(set).slice(0, 6);
}

export default function ProductCard({ product }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cardBg = useColorModeValue('brand.cardBgLight', 'brand.cardBgDark');
  const textColor = useColorModeValue('brand.textLight', 'brand.textDark');

  const img = pickPrimaryImage(product);
  const price = priceText(product);
  const slug = product.slug || product.handle || String(product._id ?? product.id ?? '');

  const colors = previewColors(product);

  return (
    <>
      <LinkBox
        as={VStack}
        spacing={4}
        p={5}
        bg={cardBg}
        borderRadius="xl"
        boxShadow="md"
        _hover={{ boxShadow: 'xl', transform: 'scale(1.01)' }}
        transition="all 0.2s ease-in-out"
        align="stretch"
        role="group"
        cursor="pointer"
      >
        <Box position="relative" overflow="hidden" borderRadius="lg" w="100%" pt="125%">
          <Image
            src={img}
            alt={product?.name || "Product image"}
            objectFit="cover"
            position="absolute"
            top="0"
            left="0"
            w="100%"
            h="100%"
            loading="lazy"
            transition="transform 0.3s ease-in-out"
            _groupHover={{ transform: 'scale(1.03)' }}
          />
        </Box>

        <VStack align="flex-start" spacing={2} flexGrow={1}>
          <Heading as="h3" size="lg" color={textColor} noOfLines={2}>
            <LinkOverlay as={ReactRouterLink} to={`/shop/${slug}`} />
            {product?.name || 'Untitled Product'}
          </Heading>
          <HStack spacing={2}>
            <Text fontSize="xl" fontWeight="bold" color="brand.primary">{price}</Text>
            <Badge colorScheme="purple">{product?.variants?.length || 0} variants</Badge>
          </HStack>

          {colors.length > 0 && (
            <HStack spacing={2}>
              {colors.map((c) => (
                <Tooltip key={c} label={c}>
                  <Box w="16px" h="16px" borderRadius="full" bg="gray.500" border="1px solid rgba(255,255,255,0.5)" />
                </Tooltip>
              ))}
              { (product?.colors?.length || 0) > colors.length && <Text fontSize="xs">+ more</Text> }
            </HStack>
          )}

          <HStack pt={2}>
            <Button size="sm" as={ReactRouterLink} to={`/shop/${slug}`} variant="outline">
              View details
            </Button>
            <Button size="sm" colorScheme="purple" onClick={onOpen}>
              Quick view / Customize
            </Button>
          </HStack>
        </VStack>
      </LinkBox>

      <QuickViewModal product={product} isOpen={isOpen} onClose={onClose} />
    </>
  );
}

ProductCard.propTypes = { product: PropTypes.object.isRequired };
