// frontend/src/components/MainLayout.jsx
import React, { useMemo } from 'react';
import { Box, Flex, VStack, Link as ChakraLink, IconButton, useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody, Image, Avatar, Spacer, useBreakpointValue, Container } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { HamburgerIcon } from '@chakra-ui/icons';
import LogoutButton from './LogoutButton';
import { useAuth } from '../context/AuthProvider';
import Footer from './Footer';

const baseNavItems = [
    { label: 'Shop', path: '/shop' },
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'AI Image Generator', path: '/generate' },
    { label: 'Customize Apparel', path: '/product-studio' },
    { label: 'My Saved Designs', path: '/my-designs' },
    { label: 'My Orders', path: '/my-orders' },
    { label: '🏆 Monthly Contest', path: '/vote-now' },
    { label: 'My Profile', path: '/profile' },
];

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
      if (profileIndex !== -1) {
        items.splice(profileIndex + 1, 0, adminNavItem);
      } else {
        items.push(adminNavItem);
      }
      return items;
    }
    return baseNavItems;
  }, [user]);

  const SidebarContent = ({ onClick }) => (
    <Box as="nav" pos="fixed" top="0" left="0" zIndex={1200} h="full" pb="10" overflowX="hidden" overflowY="auto" bg="brand.primary" borderRightWidth="1px" borderColor="brand.primaryDark" w="60">
        <Flex as={RouterLink} to="/shop" px="4" py="4" align="center" justifyContent="center"><Image src="/logo.png" alt="Tees From The Past Logo" maxW="190px"/></Flex>
        <VStack spacing={3} align="stretch" px="4" mt={8}>
            {navItems.map((item) => (
                <ChakraLink key={item.label} as={RouterLink} to={item.path} p={3} borderRadius="md" fontWeight="medium" display="flex" alignItems="center"
                    color={location.pathname.startsWith(item.path) ? 'brand.accentYellow' : 'brand.textLight'}
                    bg={location.pathname.startsWith(item.path) ? 'brand.primaryLight' : 'transparent'}
                    _hover={{ textDecoration: 'none', bg: 'brand.primaryLight', color: 'brand.accentYellow' }}
                    onClick={onClick}>
                    {item.label}
                </ChakraLink>
            ))}
        </VStack>
    </Box>
  );

  return (
    <Flex direction="column" minH="100vh">
      <Box as="section" display="flex" flexGrow={1}>
        {isDesktopView ? (<Box as="aside" w="60" flexShrink={0}><SidebarContent /></Box>) : (
          <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
            <DrawerOverlay /><DrawerContent bg="brand.primary" color="brand.textLight"><DrawerCloseButton /><DrawerHeader borderBottomWidth="1px" as={RouterLink} to="/shop" onClick={onClose}><Image src="/logo.png" maxH="50px" mx="auto" /></DrawerHeader><DrawerBody p={0}><SidebarContent onClick={onClose} /></DrawerBody></DrawerContent>
          </Drawer>
        )}
        <Box flexGrow={1} ml={isDesktopView ? "60" : "0"} transition=".3s ease" display="flex" flexDirection="column">
          <Flex as="header" align="center" w="full" px={6} py={3} bg="white" borderBottomWidth="1px" borderColor="gray.200" h="auto" minH="14" flexShrink={0}>
            {!isDesktopView && (<IconButton aria-label="Open Menu" onClick={onOpen} icon={<HamburgerIcon />} variant="ghost" mr={2} />)}
            <Spacer />
            <Flex align="center"><LogoutButton /></Flex>
          </Flex>
          {/* === THE FIX: Removed orange background, added a max-width Container === */}
          <Box as="main" p={{ base: 4, md: 6 }} flexGrow={1} w="100%">
            <Container maxW="container.xl" p={0}>
              {children}
            </Container>
          </Box>
        </Box>
      </Box>
      <Footer />
    </Flex>
  );
}
