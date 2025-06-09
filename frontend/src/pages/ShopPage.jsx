// frontend/src/pages/ShopPage.jsx
import React, { useState, useEffect } from 'react';
import { Box, Heading, VStack, Spinner, Alert, AlertIcon, SimpleGrid, Text } from '@chakra-ui/react';
import { client } from '../api/client';
import ProductCard from '../components/shop/ProductCard';

const ShopPage = () => {
  const [shopData, setShopData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchShopData = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await client.get('/storefront/shop-data');
        setShopData(data);
      } catch (err) {
        setError('Could not load products. Please try again later.');
        console.error("Error fetching shop data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchShopData();
  }, []);

  if (loading) {
    return <VStack justifyContent="center" alignItems="center" minH="60vh"><Spinner size="xl" /></VStack>;
  }

  if (error) {
    return <Alert status="error" m={8}><AlertIcon />{error}</Alert>;
  }

  return (
    <Box maxW="container.xl" mx="auto" px={4} pb={10}>
      <VStack spacing={8} align="stretch">
        <Heading as="h1" size="pageTitle" color="brand.textLight" textAlign="center" my={8}>
          Browse Our Collection
        </Heading>
        {shopData.length === 0 && !loading && (
            <Text textAlign="center" fontSize="lg">No products are currently available. Please check back soon!</Text>
        )}
        {shopData.map((category) => (
          <Box key={category.categoryId}>
            <Heading as="h2" size="xl" mb={6} borderBottomWidth="2px" borderColor="brand.secondary" pb={2}>
              {category.categoryName}
            </Heading>
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={8}>
              {category.products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </SimpleGrid>
          </Box>
        ))}
      </VStack>
    </Box>
  );
};

export default ShopPage;
