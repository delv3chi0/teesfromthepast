// frontend/src/App.jsx
import { ChakraProvider } from '@chakra-ui/react';
import { Routes, Route, Navigate } from "react-router-dom"; // BrowserRouter is likely in your index.js or main.jsx
import theme from './theme';

import { AuthProvider } from './context/AuthProvider';
import Login from './Login'; // Assuming Login is directly in src, adjust if it's in pages
import RegistrationPage from './pages/RegistrationPage';

import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import Generate from "./pages/Generate";
import MyDesigns from './pages/MyDesigns';
import ProductStudio from './pages/ProductStudio';
import VotingPage from './pages/VotingPage';
import Profile from './pages/Profile';
import CheckoutPage from './pages/CheckoutPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import MyOrdersPage from './pages/MyOrdersPage'; // <-- ADDED IMPORT FOR MyOrdersPage

import PrivateRoute from './components/PrivateRoute';

export default function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        {/* Ensure BrowserRouter is wrapping this App component at a higher level,
            typically in your main.jsx or index.js file */}
        <Routes>
          {/* Public routes - no MainLayout */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegistrationPage />} />

          {/* Protected Routes - these will now use the MainLayout */}
          <Route
            path="/dashboard"
            element={<PrivateRoute><MainLayout><Dashboard/></MainLayout></PrivateRoute>}
          />
          <Route
            path="/generate"
            element={<PrivateRoute><MainLayout><Generate/></MainLayout></PrivateRoute>}
          />
          <Route
            path="/my-designs"
            element={<PrivateRoute><MainLayout><MyDesigns/></MainLayout></PrivateRoute>}
          />
          <Route
            path="/product-studio"
            element={<PrivateRoute><MainLayout><ProductStudio/></MainLayout></PrivateRoute>}
          />
          <Route
            path="/vote-now" // Path for VotingPage
            element={<PrivateRoute><MainLayout><VotingPage/></MainLayout></PrivateRoute>}
          />
          <Route
            path="/profile"
            element={<PrivateRoute><MainLayout><Profile/></MainLayout></PrivateRoute>}
          />
          <Route
            path="/checkout"
            element={<PrivateRoute><MainLayout><CheckoutPage/></MainLayout></PrivateRoute>}
          />
          <Route
            path="/payment-success"
            element={<PrivateRoute><MainLayout><PaymentSuccessPage/></MainLayout></PrivateRoute>}
          />
          {/* ADDED My Orders ROUTE */}
          <Route
            path="/my-orders"
            element={<PrivateRoute><MainLayout><MyOrdersPage/></MainLayout></PrivateRoute>}
          />

          {/* Fallback route - navigates to login or dashboard depending on auth state could be more robust */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ChakraProvider>
  );
}
