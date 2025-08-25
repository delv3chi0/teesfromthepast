// frontend/src/App.jsx
import './index.css';

import React, { useEffect } from 'react';
import {
  VStack,
  Heading,
  Text,
  Button,
  SimpleGrid,
  Icon,
  Image,
  ChakraProvider,
  Spinner,
} from '@chakra-ui/react';
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import theme from './theme';
import { initAxe } from './utils/axeAccessibility';
import { HelmetProvider } from 'react-helmet-async';

import { AuthProvider, useAuth } from './context/AuthProvider';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';

import MainLayout from './components/MainLayout';
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import Generate from './pages/Generate';
import MyDesigns from './pages/MyDesigns';
import ProductStudio from './pages/ProductStudio';
import VotingPage from './pages/VotingPage';
import Profile from './pages/Profile';
import CheckoutPage from './pages/CheckoutPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import MyOrdersPage from './pages/MyOrdersPage';

import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import AdminPage from './pages/AdminPage';
import AdminDevices from './pages/AdminDevices';
import AdminAuditLogs from './pages/AdminAuditLogs';

// ✅ NEW: email verification pages
import CheckEmail from './pages/CheckEmail';
import VerifyEmailPage from './pages/VerifyEmailPage';

import { FaPaintBrush, FaTrophy, FaUserCheck } from 'react-icons/fa';

// --- HomePage ---
const FeatureCard = ({ icon, title, children }) => (
  <VStack
    layerStyle="cardBlue"
    p={8}
    borderRadius="xl"
    borderWidth="1px"
    borderColor="transparent"
    transition="all 0.2s ease-in-out"
    _hover={{
      transform: 'translateY(-5px)',
      boxShadow: 'lg',
      borderColor: 'brand.accentYellow',
    }}
  >
    <Icon as={icon} w={12} h={12} mb={5} />
    <Heading as="h3" size="lg" mb={3}>
      {title}
    </Heading>
    <Text>{children}</Text>
  </VStack>
);

const HomePage = () => {
  const navigate = useNavigate();
  return (
    <VStack spacing={{ base: 16, md: 24 }} py={{ base: 8, md: 16 }}>
      <VStack spacing={8} textAlign="center" px={4}>
        <Image src="/logo.png" alt="Tees From The Past Logo" maxW={{ base: '250px', md: '350px' }} mb={4} />
        <Heading
          as="h1"
          size={{ base: 'xl', md: '2xl' }}
          fontFamily="Bungee"
          textTransform="uppercase"
          color="brand.textLight"
        >
          Wear Your Imagination
        </Heading>
        <Text fontSize={{ base: 'lg', md: 'xl' }} maxW="3xl" color="whiteAlpha.800" lineHeight="tall">
          Unleash your creativity with our AI image generator…
        </Text>
        <Button
          colorScheme="brandAccentOrange"
          size="lg"
          px={12}
          py={8}
          mt={4}
          fontSize={{ base: 'xl', md: '2xl' }}
          onClick={() => navigate('/shop')}
        >
          Explore The Collection
        </Button>
      </VStack>

      <VStack spacing={8} w="100%" px={{ base: 4, md: 8 }}>
        <Heading as="h2" size="xl" color="brand.textLight">
          Create. Compete. Collect.
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} w="100%" maxW="container.xl">
          <FeatureCard icon={FaPaintBrush} title="Create Custom Art">
            Use our powerful AI renderer…
          </FeatureCard>
          <FeatureCard icon={FaTrophy} title="Win The Monthly Contest">
            Submit your best designs…
          </FeatureCard>
          <FeatureCard icon={FaUserCheck} title="Your Designs, Your Choice">
            Keep your creations private…
          </FeatureCard>
        </SimpleGrid>
      </VStack>
    </VStack>
  );
};

// Debug: log current path
const PathLogger = () => {
  const location = useLocation();
  React.useEffect(() => {
    console.log('[Router] at:', location.pathname + location.search);
  }, [location]);
  return null;
};

const AppContent = () => {
  const { loadingAuth } = useAuth();

  if (loadingAuth) {
    return (
      <VStack
        flex="1"
        justifyContent="center"
        alignItems="center"
        minH="100vh"
        w="100vw"
        bg="brand.primary"
        position="fixed"
        top="0"
        left="0"
        zIndex="banner"
      >
        <Spinner size="xl" thickness="4px" />
        <Text mt={4} fontSize="lg" color="brand.textLight">
          Loading Authentication...
        </Text>
      </VStack>
    );
  }

  return (
    <>
      <PathLogger />
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
        <Route path="/shop" element={<MainLayout><ShopPage /></MainLayout>} />
        <Route path="/product/:slug" element={<MainLayout><ProductDetailPage /></MainLayout>} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/contact" element={<MainLayout><ContactPage /></MainLayout>} />
        <Route path="/privacy-policy" element={<MainLayout><PrivacyPolicyPage /></MainLayout>} />
        <Route path="/terms-of-service" element={<MainLayout><TermsOfServicePage /></MainLayout>} />

        {/* ✅ NEW: email verification flow (public) */}
        <Route path="/check-email" element={<MainLayout><CheckEmail /></MainLayout>} />
        <Route path="/verify-email" element={<MainLayout><VerifyEmailPage /></MainLayout>} />

        {/* PROTECTED */}
        <Route path="/generate" element={<PrivateRoute><MainLayout><Generate /></MainLayout></PrivateRoute>} />
        <Route path="/my-designs" element={<PrivateRoute><MainLayout><MyDesigns /></MainLayout></PrivateRoute>} />

        {/* ✅ Product Studio: support both query (?slug=) and param (/product-studio/:slug) */}
        <Route path="/product-studio" element={<PrivateRoute><MainLayout><ProductStudio /></MainLayout></PrivateRoute>} />
        <Route path="/product-studio/:slug" element={<PrivateRoute><MainLayout><ProductStudio /></MainLayout></PrivateRoute>} />

        <Route path="/vote-now" element={<PrivateRoute><MainLayout><VotingPage /></MainLayout></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><MainLayout><Profile /></MainLayout></PrivateRoute>} />
        <Route path="/checkout" element={<PrivateRoute><MainLayout><CheckoutPage /></MainLayout></PrivateRoute>} />
        <Route path="/payment-success" element={<PrivateRoute><MainLayout><PaymentSuccessPage /></MainLayout></PrivateRoute>} />
        <Route path="/my-orders" element={<PrivateRoute><MainLayout><MyOrdersPage /></MainLayout></PrivateRoute>} />
        <Route path="/admin" element={<AdminRoute><MainLayout><AdminPage /></MainLayout></AdminRoute>} />
        <Route path="/admin/devices" element={<AdminDevices/>} />
        <Route path="/admin/audit-logs" element={<AdminAuditLogs/>} />

        {/* Aliases */}
        <Route path="/studio" element={<Navigate to="/product-studio" replace />} />
        <Route path="/shop/:slug" element={<Navigate to="/product/:slug" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default function App() {
  // Initialize axe-core for accessibility checking in development
  useEffect(() => {
    initAxe();
  }, []);

  return (
    <HelmetProvider>
      <ChakraProvider theme={theme}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ChakraProvider>
    </HelmetProvider>
  );
}
