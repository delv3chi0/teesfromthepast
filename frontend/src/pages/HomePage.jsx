// frontend/src/pages/HomePage.jsx
import React from 'react';
import { Box, VStack, Heading, Text, Button, SimpleGrid, Icon, Image, Card, CardBody } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FaPaintBrush, FaTrophy, FaUserCheck } from 'react-icons/fa';

const FeatureCard = ({ icon, title, children }) => (
  <Card>
    <CardBody p={8} display="flex" flexDirection="column" alignItems="center" textAlign="center">
      <Icon as={icon} w={12} h={12} color="brand.accentOrange" mb={4} />
      <Heading as="h3" size="lg" mb={3} color="brand.textLight">{title}</Heading>
      <Text color="brand.textMuted">{children}</Text>
    </CardBody>
  </Card>
);

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <VStack spacing={{ base: 16, md: 24 }} py={10}>
      {/* Hero Section - Reduced spacing */}
      <VStack spacing={8} textAlign="center" py={10}>
        <Image src="/logo.png" alt="Tees From The Past Logo" maxW={{base: "250px", md: "350px"}} mb={4} />
        <Heading as="h1" size="2xl" fontFamily="Bungee" textTransform="uppercase" color="brand.textLight">
          Wear Your Imagination
        </Heading>
        <Text fontSize="xl" maxW="3xl" color="brand.textMuted">
          Unleash your creativity with our AI image generator, specializing in stunning retro and vintage styles. Bring your unique ideas to life on high-quality, custom apparel.
        </Text>
        <Button
          colorScheme="brandAccentOrange"
          size="lg"
          px={12}
          py={8}
          fontSize="2xl"
          onClick={() => navigate('/shop')}
        >
          Explore The Collection
        </Button>
      </VStack>

      {/* Features Section */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} w="100%">
        <FeatureCard icon={FaPaintBrush} title="Create Custom Art">
          Use our powerful AI renderer to dial in the perfect retro design. From pixel art to vintage posters, your imagination is the only limit.
        </FeatureCard>
        <FeatureCard icon={FaTrophy} title="Win The Monthly Contest">
          Submit your best designs for a chance to win! Each month, one winning artist and one random voter receive a free shirt featuring the top-voted design.
        </FeatureCard>
        <FeatureCard icon={FaUserCheck} title="Your Designs, Your Choice">
          Keep your creations private or share them with the community. Every design you save is added to your personal collection to use any time you want.
        </FeatureCard>
      </SimpleGrid>
    </VStack>
  );
};

export default HomePage;
