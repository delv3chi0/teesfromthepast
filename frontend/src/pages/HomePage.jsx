// frontend/src/pages/HomePage.jsx
import React from 'react';
import { Box, VStack, Heading, Text, Button, SimpleGrid, Icon, Image, Link as ChakraLink } from '@chakra-ui/react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { FaPaintBrush, FaTrophy, FaUserCheck } from 'react-icons/fa';

const FeatureCard = ({ icon, title, children }) => (
    <Box
        layerStyle="cardBlue" // <--- Ensures all card styling (including text/icon color) comes from theme
        // REMOVED: bg="brand.cardBlue" (redundant with layerStyle)
        p={8}
        borderRadius="xl"
        borderWidth="1px"
        borderColor="transparent"
        display="flex"
        flexDirection="column"
        alignItems="center"
        textAlign="center"
        transition="all 0.2s ease-in-out"
        _hover={{ transform: "translateY(-5px)", boxShadow: "lg", borderColor: "brand.accentYellow" }}
    >
        {/* ICON COLOR: Will now inherit from layerStyle="cardBlue" which sets svg to brand.textBurnt */}
        <Icon as={icon} w={12} h={12} mb={5} /> 

        {/* HEADING COLOR: Will now inherit from layerStyle="cardBlue" which sets h3 to brand.textBurnt */}
        <Heading as="h3" size="lg" mb={3}>{title}</Heading>

        {/* TEXT COLOR: Will now inherit from layerStyle="cardBlue" which sets p to brand.textDark */}
        <Text>{children}</Text>
    </Box>
);

const HomePage = () => {
    const navigate = useNavigate();

    return (
        <VStack spacing={{ base: 16, md: 24 }} py={{base: 8, md: 16}}>
            {/* Hero Section */}
            <VStack spacing={8} textAlign="center" px={4}>
                <Image src="/logo.png" alt="Tees From The Past Logo" maxW={{base: "250px", md: "350px"}} mb={4} />
                <Heading as="h1" size={{base: "xl", md: "2xl"}} fontFamily="Bungee" textTransform="uppercase" color="brand.textLight">
                    Wear Your Imagination
                </Heading>
                <Text fontSize={{base: "lg", md: "xl"}} maxW="3xl" color="whiteAlpha.800" lineHeight="tall">
                    Unleash your creativity with our AI image generator, specializing in stunning retro and vintage styles. Bring your unique ideas to life on high-quality, custom apparel.
                </Text>
                <Button
                    colorScheme="brandAccentOrange"
                    size="lg"
                    px={12}
                    py={8}
                    mt={4}
                    fontSize={{base: "xl", md: "2xl"}}
                    onClick={() => navigate('/shop')}
                >
                    Explore The Collection
                </Button>
            </VStack>

            {/* Features Section */}
            <VStack spacing={8} w="100%" px={{ base: 4, md: 8 }}>
                 <Heading as="h2" size="xl" color="brand.textLight">Create. Compete. Collect.</Heading>
                 <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} w="100%" maxW="container.xl">
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
        </VStack>
    );
};

export default HomePage;
