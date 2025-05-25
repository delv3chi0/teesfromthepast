// frontend/src/App.jsx
import { ChakraProvider } from '@chakra-ui/react';
import { Routes, Route, Navigate } from "react-router-dom";

// We are removing the old "./pages/Home" landing page import
// import Home from "./pages/Home"; 

import Generate from "./pages/Generate";
import Vote from "./pages/Vote";
import { AuthProvider } from './context/AuthProvider';
import Login from './Login'; // Login will be our main entry page for '/'
import RegistrationPage from './pages/RegistrationPage';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Welcome from './pages/Welcome'; // <-- ADDED import for our new Welcome page
import PrivateRoute from './components/PrivateRoute';

export default function App() {
  return (
    <ChakraProvider>
      <AuthProvider>
        <Routes>
          {/* The Login page is now the main entry point for the site at '/' */}
          <Route path="/" element={<Login />} /> 
          <Route path="/login" element={<Login />} /> 
          <Route path="/register" element={<RegistrationPage />} />
          
          {/* Protected Routes - only accessible after login */}
          <Route path="/welcome" element={<PrivateRoute><Welcome/></PrivateRoute>} /> {/* <-- ADDED route for Welcome page */}
          <Route path="/profile" element={<PrivateRoute><Profile/></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard/></PrivateRoute>} />
          <Route path="/generate" element={<PrivateRoute><Generate/></PrivateRoute>} />
          <Route path="/vote" element={<PrivateRoute><Vote/></PrivateRoute>} /> {/* Assuming Vote should also be protected */}

          {/* Redirect any other unmatched path to the login page (which is now also home) */}
          <Route path="*" element={<Navigate to="/" replace />} /> 
        </Routes>
      </AuthProvider>
    </ChakraProvider>
  );
}
