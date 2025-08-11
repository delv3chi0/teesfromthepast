import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Image, VStack, HStack, Heading, Text, Button, Badge, SimpleGrid,
  useColorModeValue, Skeleton
} from '@chakra-ui/react';
import { client } from '../api/client';

const Placeholder = 'https://placehold.co/800x1000/1a202c/a0aec0?text=No+Image';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [color, setColor] = useState(sp.get('color') || '');
  const [size, setSize] = useState(sp.get('size') || '');

  const titleColor = useColorModeValue('brand.textLight', 'brand.textDark');

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const res = await client.get(`/storefront/product/${slug}`, { signal: ac.signal });
        setProduct(res.data);
      } catch (e) {
        if (!ac.signal.aborted) console.error(e);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [slug]);

  const canContinue = useMemo(() => {
    const needColor = (product?.colors || []).length > 0;
    const needSize  = (product?.sizes  || []).length > 0;
    return (!needColor || color) && (!needSize || size);
  }, [product, color, size]);

  const priceText = useMemo(() => {
    const money = (n) => `$${Number(n).toFixed(2)}`;
    const mi = product?.priceMin, ma = product?.priceMax;
    if (typeof mi === 'number' && typeof ma === 'number') {
      return mi === ma ? money(mi) : `${money(mi)} – ${money(ma)}`;
    }
    if (typeof mi === 'number') return money(mi);
    if (typeof ma === 'number') return money(ma);
    return '';
  }, [product]);

  if (loading) {
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={8} p={6}>
        <Skeleton height="500px" />
        <VStack align="stretch" spacing={4}>
          <Skeleton height="32px" />
          <Skeleton height="80px" />
          <Skeleton height="40px" />
        </VStack>
      </SimpleGrid>
    );
  }

  if (!product) {
    return (
      <VStack p={10} spacing={4}>
        <Heading size="lg">Product not found</Heading>
        <Button onClick={() => navigate('/shop')}>Back to Shop</Button>
      </VStack>
    );
  }

  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} gap={8} p={6}>
      <Box rounded="lg" overflow="hidden" bg="blackAlpha.200">
        <Image
          src={product.image || Placeholder}
          alt={product.name}
          w="100%"
          h="auto"
          objectFit="cover"
        />
      </Box>

      <VStack align="stretch" spacing={5}>
        <Heading size="xl" color={titleColor}>{product.name}</Heading>
        {priceText && <Text fontSize="2xl" fontWeight="bold">{priceText}</Text>}
        {product.description && <Text opacity={0.9}>{product.description}</Text>}

        {product.colors?.length > 0 && (
          <Box>
            <Text fontWeight="medium" mb={2}>Color</Text>
            <HStack wrap="wrap" spacing={2}>
              {product.colors.map(c => (
                <Button
                  key={c}
                  variant={color === c ? 'solid' : 'outline'}
                  onClick={() => setColor(c)}
                  size="sm"
                >
                  {c}
                </Button>
              ))}
            </HStack>
          </Box>
        )}

        {product.sizes?.length > 0 && (
          <Box>
            <Text fontWeight="medium" mb={2}>Size</Text>
            <HStack wrap="wrap" spacing={2}>
              {product.sizes.map(s => (
                <Button
                  key={s}
                  variant={size === s ? 'solid' : 'outline'}
                  onClick={() => setSize(s)}
                  size="sm"
                >
                  {s}
                </Button>
              ))}
            </HStack>
          </Box>
        )}

        <HStack>
          <Badge colorScheme="purple">{product.variants?.length || 0} variants</Badge>
        </HStack>

        <Button
          isDisabled={!canContinue}
          onClick={() => {
            const params = new URLSearchParams({
              productId: product.id,
              slug: product.slug,
              ...(color ? { color } : {}),
              ...(size  ? { size  } : {}),
            });
            navigate(`/studio?${params.toString()}`);
          }}
          size="lg"
          colorScheme={canContinue ? 'purple' : 'gray'}
        >
          {canContinue ? 'Customize' : 'Select options to continue'}
        </Button>

        <Button variant="ghost" onClick={() => navigate('/shop')}>Back to Shop</Button>
      </VStack>
    </SimpleGrid>
  );
}
