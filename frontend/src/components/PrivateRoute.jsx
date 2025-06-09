// frontend/src/components/PrivateRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { Spinner, Box, Text } from '@chakra-ui/react';

export default function PrivateRoute({ children }) {
  const { user, token, loadingAuth } = useAuth();
  const location = useLocation();

  // Log state every time PrivateRoute renders
  console.log(
    `[PrivateRoute Render] Path: ${location.pathname}, loadingAuth: ${loadingAuth}, Token: ${token ? 'Exists' : 'No Token'}, User: ${user ? 'Exists' : 'No User'}`
  );

  if (loadingAuth) {
    console.log("[PrivateRoute Decision] Auth is loading. Rendering Spinner.");
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="100vh" bg="brand.accentOrange">
        <Spinner size="xl" thickness="4px" color="brand.primary" />
        <Text ml={3} color="brand.textLight">Loading Authentication...</Text>
      </Box>
    );
  }

  if (!token) { // Primary check should be the token; user object is derived from it.
    console.log("[PrivateRoute Decision] No token and Auth not loading. Redirecting to /login.");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If loading is false and token exists, user should ideally be populated by AuthProvider.
  // If user is still null here but token exists, AuthProvider's profile fetch might have failed,
  // or is in an intermediate state. However, AuthProvider should clear token if profile fetch fails.
  // So, if token exists, we generally trust it and allow access, letting the component deal with a temporarily null user if needed.
  console.log("[PrivateRoute Decision] Token exists and Auth not loading. Rendering children.");
  return children; 
  // Note: We removed <Outlet /> for now. If you use nested routes where PrivateRoute is a layout, 
  // you'd do: return children ? children : <Outlet />; For simple page protection, just 'children' is fine.
}
