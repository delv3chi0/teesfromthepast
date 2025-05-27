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
import Profile from './pages/Profile';
import Vote from "./pages/Vote"; 
import ProductStudio from './pages/ProductStudio'; // <-- ADD IMPORT for new page
import PrivateRoute from './components/PrivateRoute';

export default function App() {
  return (
    <ChakraProvider theme={theme}> 
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Login />} /> 
          <Route path="/login" element={<Login />} /> 
          <Route path="/register" element={<RegistrationPage />} />
          
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
            path="/product-studio" // <-- ADD ROUTE for the new Design Studio page
            element={<PrivateRoute><MainLayout><ProductStudio/></MainLayout></PrivateRoute>} 
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
