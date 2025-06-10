// frontend/src/components/MainLayout.jsx
import React, { useMemo } from 'react';
import { Box, Flex, VStack, Link as ChakraLink, IconButton, useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody, Image, Avatar, Spacer, useBreakpointValue, Container } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { HamburgerIcon } from '@chakra-ui/icons';
import LogoutButton from './LogoutButton';
import { useAuth } from '../context/AuthProvider';
import Footer from './Footer';

const baseNavItems = [ /* ... No changes to nav items ... */ ];
const adminNavItem = { label: '🛡️ Admin Console', path: '/admin' };

export default function MainLayout({ children }) {
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user } = useAuth();
  const isDesktopView = useBreakpointValue({ base: false, md: true });

  const navItems = useMemo(() => {
    if (user?.isAdmin) {
      const items = [...baseNavItems];
      const profileIndex = items.findIndex(item => item.path === '/profile');
      items.splice(profileIndex + 1, 0, adminNavItem);
      return items;
    }
    return baseNavItems;
  }, [user]);

  const SidebarContent = ({ onClick }) => ( /* ... No changes to SidebarContent ... */ );

  return (
    <Flex direction="column" minH="100vh" bg="brand.paper">
        {/* The Sidebar for Desktop */}
        {isDesktopView && <SidebarContent />}
        
        {/* The Drawer for Mobile */}
        {!isDesktopView && (
          <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
            <DrawerOverlay />
            <DrawerContent bg="brand.primary" color="brand.textLight">
                <DrawerCloseButton />
                <DrawerHeader borderBottomWidth="1px" borderColor="brand.primaryDark" as={RouterLink} to="/shop" onClick={onClose} display="flex" justifyContent="center">
                    <Image src="/logo.png" maxH="50px" />
                </DrawerHeader>
                <DrawerBody p={0}><SidebarContent onClick={onClose} /></DrawerBody>
            </DrawerContent>
          </Drawer>
        )}

      <Flex as="main" direction="column" flex="1" ml={isDesktopView ? "60" : "0"}>
        <Flex as="header" align="center" justify="space-between" w="full" px="4" py="2" h="16" bg="white" borderBottomWidth="1px" borderColor="gray.200">
          {!isDesktopView && <IconButton aria-label="Open Menu" onClick={onOpen} icon={<HamburgerIcon />} variant="ghost" />}
          <Spacer />
          <LogoutButton />
        </Flex>
        
        {/* === THE FIX: The content area now correctly fills the space === */}
        <Box flex="1" p={{ base: 4, md: 8 }}>
            <Container maxW="container.xl" p={0}>
                {children}
            </Container>
        </Box>
        <Footer />
      </Flex>
    </Flex>
  );
}
