k// frontend/src/App.jsx
import { ChakraProvider } from '@chakra-ui/react';
import { Routes, Route, Navigate } from "react-router-dom";
import theme from './theme';

import { AuthProvider } from './context/AuthProvider';
import Login from './Login';
import RegistrationPage from './pages/RegistrationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';

import MainLayout from './components/MainLayout';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import Generate from "./pages/Generate";
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

export default function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <Routes>
          {/* === PUBLIC ROUTES === */}
          <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
          <Route path="/shop" element={<MainLayout><ShopPage /></MainLayout>} />
          <Route path="/product/:slug" element={<MainLayout><ProductDetailPage /></MainLayout>} />
          
          {/* Auth pages do not use MainLayout */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Other public pages */}
          <Route path="/contact" element={<MainLayout><ContactPage /></MainLayout>} />
          <Route path="/privacy-policy" element={<MainLayout><PrivacyPolicyPage /></MainLayout>} />
          <Route path="/terms-of-service" element={<MainLayout><TermsOfServicePage /></MainLayout>} />

          {/* === PROTECTED ROUTES (Require Login) === */}
          <Route path="/generate" element={<PrivateRoute><MainLayout><Generate/></MainLayout></PrivateRoute>} />
          <Route path="/my-designs" element={<PrivateRoute><MainLayout><MyDesigns/></MainLayout></PrivateRoute>} />
          <Route path="/product-studio" element={<PrivateRoute><MainLayout><ProductStudio/></MainLayout></PrivateRoute>} />
          <Route path="/vote-now" element={<PrivateRoute><MainLayout><VotingPage/></MainLayout></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><MainLayout><Profile/></MainLayout></PrivateRoute>} />
          <Route path="/checkout" element={<PrivateRoute><MainLayout><CheckoutPage/></MainLayout></PrivateRoute>} />
          <Route path="/payment-success" element={<PrivateRoute><MainLayout><PaymentSuccessPage/></MainLayout></PrivateRoute>} />
          <Route path="/my-orders" element={<PrivateRoute><MainLayout><MyOrdersPage/></MainLayout></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><MainLayout><AdminPage /></MainLayout></AdminRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ChakraProvider>
  );
}
