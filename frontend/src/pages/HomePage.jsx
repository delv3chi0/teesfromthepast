// frontend/src/pages/HomePage.jsx
import React from 'react';
import { Box, VStack, Heading, Text, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <VStack spacing={8} textAlign="center" py={20}>
      <Heading as="h1" size="2xl" fontFamily="Bungee">
        Welcome to Tees From The Past
      </Heading>
      <Text fontSize="xl" maxW="2xl" color="brand.textDark">
        Create unique, retro-style t-shirts with the power of AI. Bring your imagination to life on high-quality apparel.
      </Text>
      <Button
        colorScheme="brandPrimary"
        bg="brand.accentOrange"
        color="white"
        size="lg"
        px={10}
        py={8}
        fontSize="xl"
        onClick={() => navigate('/shop')}
        _hover={{ bg: 'brand.accentOrangeHover' }}
      >
        Start Shopping
      </Button>
    </VStack>
  );
};

export default HomePage;
