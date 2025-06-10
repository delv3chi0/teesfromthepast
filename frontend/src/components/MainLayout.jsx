// frontend/src/components/MainLayout.jsx
import React, { useMemo } from 'react';
import {
  Box, Flex, VStack, Link as ChakraLink, IconButton, useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody, Image, Avatar, HStack, Icon, Spacer, useBreakpointValue
} from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { HamburgerIcon } from '@chakra-ui/icons';
import LogoutButton from './LogoutButton';
import { useAuth } from '../context/AuthProvider';
import Footer from './Footer';

// === RE-ORDERED per your request for a better user flow ===
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
      // Insert Admin Console right after My Profile
      if (profileIndex !== -1) {
        items.splice(profileIndex + 1, 0, adminNavItem);
      } else {
        items.push(adminNavItem); // Fallback
      }
      return items;
    }
    return baseNavItems;
  }, [user]);

  const SidebarContent = ({ onClick, inDrawer = false }) => (
    <Box as="nav" pos={inDrawer ? 'relative' : 'fixed'} top="0" left="0" zIndex={1200} h="full" pb="10" overflowX="hidden" overflowY="auto" bg="brand.primary" borderColor={inDrawer ? 'transparent' : 'brand.primaryDark'} borderRightWidth={inDrawer ? '0' : '1px'} w="60">
        <Flex as={RouterLink} to="/shop" px="4" py="4" align="center" justifyContent="center" _hover={{ bg: 'brand.primaryLight' }} onClick={inDrawer ? onClick : undefined}>
            <Image src="/logo.png" alt="Tees From The Past Logo" w="100%" maxW="190px" h="auto" maxH="150px" objectFit="contain" />
        </Flex>
        <VStack spacing={3} align="stretch" px="4" mt={8}>
            {navItems.map((item) => (
                <ChakraLink key={item.label} as={RouterLink} to={item.path} p={3} borderRadius="md" fontWeight="medium" display="flex" alignItems="center"
                    color={location.pathname.startsWith(item.path) ? 'brand.accentYellow' : 'brand.textLight'}
                    bg={location.pathname.startsWith(item.path) ? 'brand.primaryLight' : 'transparent'}
                    _hover={{ textDecoration: 'none', bg: 'brand.primaryLight', color: 'brand.accentYellow' }}
                    onClick={onClick}
                >
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
            <DrawerOverlay /><DrawerContent bg="brand.primary" color="brand.textLight"><DrawerCloseButton /><DrawerHeader borderBottomWidth="1px" borderColor="brand.primaryDark" as={RouterLink} to="/shop" _hover={{ textDecoration: 'none' }} display="flex" alignItems="center" justifyContent="center" py="2.5" onClick={onClose}><Image src="/logo.png" alt="Tees From The Past Logo" maxH="50px" objectFit="contain" /></DrawerHeader><DrawerBody p={0}><SidebarContent onClick={onClose} inDrawer={true} /></DrawerBody></DrawerContent>
          </Drawer>
        )}
        <Box flexGrow={1} ml="0" transition=".3s ease" display="flex" flexDirection="column">
          <Flex as="header" align="center" w="full" px={6} py={3} bg="brand.secondary" borderBottomWidth="1px" borderColor="brand.primaryDark" h="auto" minH="14" flexShrink={0}>
            <Flex align="center" flex="0">{!isDesktopView && (<IconButton aria-label="Open Menu" onClick={onOpen} icon={<HamburgerIcon />} size="md" variant="ghost" mr={2} />)}<ChakraLink as={RouterLink} to="/shop" display="flex" alignItems="center" _hover={{ textDecoration: 'none' }}><Image src="/logo-text.png" alt="Tees From The Past Title Logo" h="50px" objectFit="contain" maxW={{ base: '180px' }} /></ChakraLink></Flex>
            <Spacer />
            <Flex align="center" flex="0">{user && isDesktopView && (<ChakraLink as={RouterLink} to="/profile" mr={4}><Avatar size="sm" name={user.username || user.email} src={user.avatarUrl || ''} bg="brand.primaryDark" color="brand.textLight" /></ChakraLink>)}<LogoutButton /></Flex>
          </Flex>
          <Box as="main" p={{ base: 4, md: 6 }} bg="brand.accentOrange" flexGrow={1} width="100%">{children}</Box>
        </Box>
      </Box>
      <Footer />
    </Flex>
  );
}
