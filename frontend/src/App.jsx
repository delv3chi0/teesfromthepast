// frontend/src/App.jsx
import { ChakraProvider } from '@chakra-ui/react';
import { Routes, Route, Navigate } from "react-router-dom";
import theme from './theme'; // <-- ADDED THIS IMPORT

import { AuthProvider } from './context/AuthProvider';
import Login from './Login';
import RegistrationPage from './pages/RegistrationPage';

import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import Generate from "./pages/Generate";
import MyDesigns from './pages/MyDesigns';
import Profile from './pages/Profile';
import Vote from "./pages/Vote"; 

import PrivateRoute from './components/PrivateRoute';

export default function App() {
  return (
    <ChakraProvider theme={theme}> {/* <-- THEME PROP ADDED HERE */}
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
            path="/profile" 
            element={<PrivateRoute><MainLayout><Profile/></MainLayout></PrivateRoute>} 
          />
          <Route 
            path="/vote" 
            element={<PrivateRoute><MainLayout><Vote/></MainLayout></PrivateRoute>} 
          />

          <Route path="*" element={<Navigate to="/" replace />} /> 
        </Routes>
      </AuthProvider>
    </ChakraProvider>
  );
}
