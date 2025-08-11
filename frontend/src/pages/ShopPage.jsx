import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Heading,
  VStack,
  Spinner,
  Alert,
  AlertIcon,
  SimpleGrid,
  Text,
  Button,
  HStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { client } from '../api/client';
import ProductCard from '../components/shop/ProductCard';

function normalizeProducts(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.products)) return data.products;
  if (data?.result?.items && Array.isArray(data.result.items)) return data.result.items;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

const ShopPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [attempt, setAttempt]   = useState(0);
  const headingColor = useColorModeValue('brand.textLight', 'brand.textDark');

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await client.get('/storefront/shop-data', { signal: ac.signal });
        setProducts(normalizeProducts(res.data));
      } catch (err) {
        if (!ac.signal.aborted) {
          console.error("Error loading products:", err);
          setError('Could not load products. Please try again.');
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [attempt]);

  const gridProducts = useMemo(() => products.filter(Boolean), [products]);

  if (loading) {
    return (
      <VStack justifyContent="center" minH="60vh" spacing={4}>
        <Spinner size="xl" thickness="4px" />
        <Text mt={2} fontSize="lg" color="brand.textLight">Loading Collection…</Text>
      </VStack>
    );
  }

  if (error) {
    return (
      <VStack justifyContent="center" minH="60vh" spacing={6}>
        <Alert status="error" bg="red.900" borderRadius="md" p={6} borderWidth="1px" borderColor="red.500" w="fit-content">
          <AlertIcon color="red.300" />
          <Text color="white">{error}</Text>
        </Alert>
        <Button onClick={() => setAttempt(a => a + 1)} variant="solid" colorScheme="purple">
          Retry
        </Button>
      </VStack>
    );
  }

  return (
    <VStack spacing={8} align="stretch" py={8} px={{ base: 4, md: 8 }}>
      <HStack justify="space-between" align="baseline">
        <Heading as="h1" size="2xl" color={headingColor}>Our Awesome Collection</Heading>
      </HStack>

      {gridProducts.length === 0 ? (
        <Box textAlign="center" py={10}>
          <Text fontSize="xl" color="whiteAlpha.800">No products are currently available. Check back soon!</Text>
          <Button mt={6} onClick={() => setAttempt(a => a + 1)}>Refresh</Button>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={{ base: 6, md: 8 }}>
          {gridProducts.map((p) => {
            const key = String(p._id ?? p.id ?? p.slug ?? Math.random());
            return <ProductCard key={key} product={p} />;
          })}
        </SimpleGrid>
      )}
    </VStack>
  );
};

export default ShopPage;
