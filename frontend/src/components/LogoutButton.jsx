// frontend/src/components/LogoutButton.jsx
import { Button, IconButton, Icon, Box } from "@chakra-ui/react"; // Added IconButton and Box
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { FaSignOutAlt } from 'react-icons/fa';

export default function LogoutButton() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout(); 
    navigate("/login"); 
  };

  return (
    <>
      {/* IconButton for Mobile View */}
      <IconButton
        aria-label="Logout"
        icon={<Icon as={FaSignOutAlt} />}
        onClick={handleLogout}
        variant="outline"             // Secondary Action Style base
        borderColor="brand.primary"   // Secondary Action Style base
        color="brand.primary"       // Secondary Action Style base
        _hover={{ bg: 'brand.primaryDark', color: 'brand.textLight' }}
        borderRadius="full"         // Consistent shape
        size="lg"                   // Consistent size with other header items
        display={{ base: 'inline-flex', md: 'none' }} // Show only on mobile
      />

      {/* Full Button for Desktop View */}
      <Button 
        variant="outline"             // Secondary Action Style
        borderColor="brand.primary"   // Secondary Action Style
        color="brand.primary"       // Secondary Action Style
        _hover={{ bg: 'brand.primaryDark', color: 'brand.textLight' }}
        borderRadius="full"         // Secondary Action Style
        size="lg"                   // Consistent size
        onClick={handleLogout}
        leftIcon={<Icon as={FaSignOutAlt} />}
        display={{ base: 'none', md: 'inline-flex' }} // Show only on desktop
        px={6} 
      >
        Logout
      </Button>
    </>
  );
}
