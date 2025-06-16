import './index.css';

import React from 'react';
import { Box, VStack, Heading, Text, Button, SimpleGrid, Icon, Image, Link as ChakraLink, ChakraProvider, Spinner } from '@chakra-ui/react'; // Ensure Spinner and Text are imported
import { useNavigate, Link as RouterLink, Routes, Route, Navigate } from 'react-router-dom';

// Import your theme
import theme from './theme'; // Make sure this path is correct relative to App.jsx

// Import AuthProvider and all page components
import { AuthProvider, useAuth } from './context/AuthProvider'; // Import useAuth here
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';

import MainLayout from './components/MainLayout';
// If HomePage.jsx exists as a separate file in pages/, you should import it from there and remove its definition from here.
// For now, I'll keep the HomePage definition in this file as you provided it.
// If it's a separate file, uncomment: import HomePage from './pages/HomePage';

import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import Generate from "./pages/Generate";
import MyDesigns from './pages/MyDesigns';
import ProductStudio from './pages/ProductStudio'; // Assuming ProductStudio.jsx is in ProductJS folder
import VotingPage from './pages/VotingPage';
import Profile from './pages/Profile';
import CheckoutPage from './pages/CheckoutPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import MyOrdersPage from './pages/MyOrdersPage';

import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import AdminPage from './pages/AdminPage';

// --- START: HomePage Component Definition (Adjusted for Readability Fix) ---
const FeatureCard = ({ icon, title, children }) => (
    <Box
        layerStyle="cardBlue" // This applies ALL styles from theme.js's layerStyles.cardBlue
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
        {/* Icon color now inherits from layerStyle="cardBlue" which has '& svg' rule */}
        <Icon as={icon} w={12} h={12} mb={5} /> 

        {/* Heading and Text colors will inherit from layerStyle="cardBlue" or its internal rules */}
        <Heading as="h3" size="lg" mb={3}>{title}</Heading>
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
// --- END: HomePage Component Definition ---


// NEW: AppContent component to handle initial loading based on AuthProvider state
const AppContent = () => {
    const { loadingAuth } = useAuth(); // Get loading state from AuthProvider

    if (loadingAuth) {
        // This is the full-screen loading overlay.
        // It uses your theme's primary background and text colors.
        return (
            <VStack
                flex="1"
                justifyContent="center"
                alignItems="center"
                minH="100vh" // Take full viewport height
                w="100vw" // Take full viewport width
                bg="brand.primary" // Use your main dark background color from the theme
                position="fixed" // Fixed to cover entire screen
                top="0"
                left="0"
                zIndex="banner" // Ensure it's on top of everything
            >
                {/* Spinner color now comes from theme.js component styling */}
                <Spinner size="xl" thickness="4px" />
                <Text mt={4} fontSize="lg" color="brand.textLight">Loading Authentication...</Text>
            </VStack>
        );
    }

    // Once authentication is loaded, render your routes
    return (
        <Routes>
            {/* === PUBLIC ROUTES === */}
            <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
            <Route path="/shop" element={<MainLayout><ShopPage /></MainLayout>} />
            <Route path="/product/:slug" element={<MainLayout><ProductDetailPage /></MainLayout>} />

            {/* Auth pages do not use MainLayout */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Other public pages */}
            <Route path="/contact" element={<MainLayout><ContactPage /></MainLayout>} />
            <Route path="/privacy-policy" element={<MainLayout><PrivacyPolicyPage /></MainLayout>} />
            <Route path="/terms-of-service" element={<MainLayout><TermsOfServicePage /></MainLayout>} />

            {/* === PROTECTED ROUTES (Require Login) === */}
            <Route path="/generate" element={<PrivateRoute><MainLayout><Generate /></MainLayout></PrivateRoute>} />
            <Route path="/my-designs" element={<PrivateRoute><MainLayout><MyDesigns /></MainLayout></PrivateRoute>} />
            <Route path="/product-studio" element={<PrivateRoute><MainLayout><ProductStudio /></MainLayout></PrivateRoute>} />
            <Route path="/vote-now" element={<PrivateRoute><MainLayout><VotingPage /></MainLayout></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><MainLayout><Profile /></MainLayout></PrivateRoute>} />
            <Route path="/checkout" element={<PrivateRoute><MainLayout><CheckoutPage /></MainLayout></PrivateRoute>} />
            <Route path="/payment-success" element={<PrivateRoute><MainLayout><PaymentSuccessPage /></MainLayout></PrivateRoute>} />
            <Route path="/my-orders" element={<PrivateRoute><MainLayout><MyOrdersPage /></MainLayout></PrivateRoute>} />
            <Route path="/admin" element={<AdminRoute><MainLayout><AdminPage /></MainLayout></AdminRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

// Main App component wrapping ChakraProvider and AuthProvider
export default function App() {
    return (
        <ChakraProvider theme={theme}>
            <AuthProvider>
                <AppContent /> {/* Render the new AppContent component */}
            </AuthProvider>
        </ChakraProvider>
    );
}
