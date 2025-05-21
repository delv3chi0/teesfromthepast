import { ChakraProvider } from '@chakra-ui/react';
import { Routes, Route, Navigate } from 'react-router-dom';";
import Home from "./pages/Home";
import Generate from "./pages/Generate";
import Vote from "./pages/Vote"
import SchedulePost from "./pages/SchedulePost";
import { AuthProvider } from './context/AuthProvider';
import Login from './Login';
import RegistrationPage from './pages/RegistrationPage';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import PrivateRoute from './components/PrivateRoute';

export default function App() {
  return (
    <ChakraProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/profile" element={<PrivateRoute><Profile/></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard/></PrivateRoute>} />
  <Route path="/schedule" element={<PrivateRoute><SchedulePost/></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
          <Route path="/" element={<Home />} />
  <Route path="/generate" element={<Generate />} />
  <Route path="/vote" element={<Vote />} />
</Routes>
      </AuthProvider>
    </ChakraProvider>
  );
}
