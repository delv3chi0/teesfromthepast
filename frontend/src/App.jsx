// frontend/src/App.jsx
import { ChakraProvider } from '@chakra-ui/react';
import { Routes, Route, Navigate } from "react-router-dom";
import theme from './theme';

// Context and Auth Pages
import { AuthProvider } from './context/AuthProvider';
import Login from './Login'; // Assuming Login.jsx is directly in src/
import RegistrationPage from './pages/RegistrationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage'; // <-- IMPORTED

// Main Application Layout and Pages
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

// Route Protection and Admin Area
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <Routes>
          {/* Public routes - no MainLayout */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} /> {/* <-- NEW ROUTE ADDED HERE */}


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
              <AdminRoute>
                <MainLayout>
                  <AdminPage />
                </MainLayout>
              </AdminRoute>
            }
          />
          
          {/* Fallback route - navigates to login */}
          <Route path="*" element={<Navigate to="/login" replace />} /> {/* Changed fallback to /login for unauthenticated users */}
        </Routes>
      </AuthProvider>
    </ChakraProvider>
  );
}
