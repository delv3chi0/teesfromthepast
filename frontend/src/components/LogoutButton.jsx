// frontend/src/components/LogoutButton.jsx
import { Button, Icon } from "@chakra-ui/react"; // Added Icon
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider"; // Import useAuth to use the context's logout
import { FaSignOutAlt } from 'react-icons/fa'; // Example icon

export default function LogoutButton() {
  const navigate = useNavigate();
  const { logout } = useAuth(); // Use the logout function from AuthProvider

  const handleLogout = () => {
    logout(); // Call context's logout
    // AuthProvider's logout now handles token removal and state update,
    // navigation might be handled by PrivateRoute or App logic if auth state changes.
    // If explicit navigation is still desired after AuthProvider's logout:
    navigate("/login"); 
  };

  return (
    <Button 
      variant="outline"             // Secondary Action Style
      borderColor="brand.primary"   // Secondary Action Style
      color="brand.primary"       // Secondary Action Style (text color on brand.secondary bg)
      _hover={{ bg: 'brand.primaryDark', color: 'brand.textLight' }} // Adjusted hover for better visibility on brand.secondary
      borderRadius="full"         // Secondary Action Style
      size="lg"                   // Consistent size, can be 'md' if 'lg' is too big for header
      onClick={handleLogout}
      leftIcon={<Icon as={FaSignOutAlt} />}
      px={6} // Adjust padding as needed for header
    >
      Logout
    </Button>
  );
}
