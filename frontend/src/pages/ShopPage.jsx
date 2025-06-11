// frontend/src/pages/ShopPage.jsx
import React, { useState, useEffect } from 'react';
import { Box, Heading, VStack, Spinner, Alert, AlertIcon, SimpleGrid, Text, Card, CardBody } from '@chakra-ui/react';
import { client } from '../api/client';
import ProductCard from '../components/shop/ProductCard';

const ShopPage = () => {
  const [shopData, setShopData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    client.get('/storefront/shop-data')
      .then(res => setShopData(res.data))
      .catch(() => setError('Could not load products.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <VStack justifyContent="center" minH="60vh"><Spinner size="xl" /></VStack>;
  if (error) return <Alert status="error"><AlertIcon />{error}</Alert>;

  return (
    <VStack spacing={12} align="stretch">
      <Heading as="h1" size="pageTitle" textAlign="center">Browse Our Collection</Heading>
      {shopData.length === 0 && !loading && ( <Text textAlign="center" fontSize="lg">No products are currently available.</Text> )}
      {shopData.map((category) => (
        <Card key={category.categoryId}>
          <CardBody>
            <Heading as="h2" size="xl" mb={6} borderBottomWidth="2px" borderColor="brand.primaryLight" pb={2}>
              {category.categoryName}
            </Heading>
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={{ base: 6, md: 8 }}>
              {category.products.map((product) => (<ProductCard key={product._id} product={product} />))}
            </SimpleGrid>
          </CardBody>
        </Card>
      ))}
    </VStack>
  );
};

export default ShopPage;
