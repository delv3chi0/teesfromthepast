// frontend/src/App.jsx
import { ChakraProvider } from '@chakra-ui/react';
import { Routes, Route, Navigate } from "react-router-dom";
import theme from './theme';

import { AuthProvider } from './context/AuthProvider';
import Login from './Login';
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
import MyOrdersPage from './pages/MyOrdersPage';

import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute'; // <-- IMPORT AdminRoute
import AdminPage from './pages/AdminPage';     // <-- IMPORT AdminPage (will be created next)

export default function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
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
            path="/vote-now"
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
          <Route
            path="/my-orders"
            element={<PrivateRoute><MainLayout><MyOrdersPage/></MainLayout></PrivateRoute>}
          />

          {/* ADMIN ROUTE */}
          <Route
            path="/admin"
            element={
              <AdminRoute>  {/* Protects with AdminRoute */}
                <MainLayout> {/* Uses the same MainLayout */}
                  <AdminPage />
                </MainLayout>
              </AdminRoute>
            }
          />
          {/* We can add more nested admin routes later, e.g., /admin/users, /admin/orders */}


          {/* Fallback route - navigates to login or dashboard depending on auth state could be more robust */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ChakraProvider>
  );
}
