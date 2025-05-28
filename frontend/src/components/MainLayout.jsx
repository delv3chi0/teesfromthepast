// frontend/src/components/MainLayout.jsx
import { Box, Flex, VStack, Link as ChakraLink, Text, IconButton, useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody, Image, Avatar, HStack, Icon } from '@chakra-ui/react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { HamburgerIcon } from '@chakra-ui/icons';
import LogoutButton from './LogoutButton';
import { useAuth } from '../context/AuthProvider';
import Footer from './Footer';
import { FaFacebook, FaTwitter, FaInstagram } from 'react-icons/fa';


const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'AI Image Generator', path: '/generate' },
  { label: 'My Saved Designs', path: '/my-designs' },
  { label: 'Customize My Shirt', path: '/product-studio' },
  { label: '🏆 Vote Now!', path: '/vote-now' },
  { label: 'My Profile', path: '/profile' },
];

export default function MainLayout({ children }) {
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user } = useAuth();
  // useNavigate is not directly used in MainLayout in this version, but good to keep if sub-components might need it passed
  // const navigate = useNavigate(); 

  const SidebarContent = ({onClick}) => ( /* ... Your existing SidebarContent ... */ );
  // For brevity, assuming SidebarContent is correct from previous versions

  return (
    <Flex direction="column" minH="100vh"> 
      <Box as="section" display="flex" flexGrow={1}> {/* Changed to display:flex */}
        <SidebarContent display={{ base: 'none', md: 'unset' }} />
        
        <Drawer isOpen={isOpen} placement="left" onClose={onClose} returnFocusOnClose={false}>
          {/* ... Your existing Drawer content ... */}
        </Drawer>

        {/* This Box now also becomes a flex column to manage header and main content */}
        <Box 
          flexGrow={1} // Make this box take remaining width
          ml={{ base: 0, md: 60 }} 
          transition=".3s ease"
          display="flex"
          flexDirection="column" // Ensure header is above main
        >
          <Flex
            as="header"
            align="center"
            justify="space-between" 
            w="full"
            px={6} 
            py={3} 
            bg="brand.secondary" 
            borderBottomWidth="1px"
            borderColor="brand.primaryDark" 
            color="brand.textDark"     
            h="auto" 
            minH="14"
            flexShrink={0} // Prevent header from shrinking
          >
            {/* ... Your existing top bar content (logo, logout) ... */}
            <Flex align="center">
              <IconButton aria-label="Open Menu" display={{ base: 'inline-flex', md: 'none' }} onClick={onOpen} icon={<HamburgerIcon />} size="md" variant="ghost" mr={2} />
              <ChakraLink as={RouterLink} to="/dashboard" display={{ base: 'none', md: 'flex' }} alignItems="center" _hover={{textDecoration: "none"}}>
                <Image src="/logo-text.png" alt="Tees From The Past Title Logo" h="48px" objectFit="contain"/>
              </ChakraLink>
            </Flex>
            <Flex align="center">
              {user && (
                <ChakraLink as={RouterLink} to="/profile" mr={4}>
                  <Avatar size="sm" name={user.username || user.email} src={user.avatarUrl || ''} bg="brand.primaryDark" color="brand.textLight"/>
                </ChakraLink>
              )}
              <LogoutButton /> 
            </Flex>
          </Flex>

          <Box 
            as="main" 
            p={{base: 4, md: 6}} 
            bg="brand.accentOrange"
            flexGrow={1} // Make this area take all available vertical space
            width="100%" 
          > 
            {children}
          </Box>
        </Box>
      </Box>

      <Footer /> 
    </Flex>
  );
}
