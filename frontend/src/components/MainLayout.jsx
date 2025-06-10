// frontend/src/components/MainLayout.jsx
import React, { useMemo } from 'react';
import {
  Box, Flex, VStack, Link as ChakraLink, IconButton, useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody,
  Image as ChakraImage, // === FIX: Renamed import to avoid naming conflict ===
  Avatar, HStack, Icon, Spacer, useBreakpointValue, Container, Button, Text
} from '@chakra-ui/react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { HamburgerIcon } from '@chakra-ui/icons';
import LogoutButton from './LogoutButton';
import { useAuth } from '../context/AuthProvider';
import Footer from './Footer';

// Updated nav items to remove the now-redundant Dashboard link
const baseNavItems = [
  { label: 'Shop', path: '/shop' },
  { label: 'AI Image Generator', path: '/generate' },
  { label: 'Customize Apparel', path: '/product-studio' },
  { label: '🏆 Monthly Contest', path: '/vote-now' },
  { label: 'My Saved Designs', path: '/my-designs' },
  { label: 'My Orders', path: '/my-orders' },
  { label: 'My Profile', path: '/profile' },
];

const adminNavItem = { label: '🛡️ Admin Console', path: '/admin' };

export default function MainLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
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

  // Sidebar for logged-in users
  const SidebarContent = ({ onClick }) => (
    <Box as="nav" pos="fixed" top="0" left="0" zIndex={1200} h="full" pb="10" overflowX="hidden" overflowY="auto" bg="brand.primary" borderRightWidth="1px" borderColor="brand.primaryDark" w="60">
        <Flex as={RouterLink} to="/shop" px="4" py="4" align="center" justifyContent="center">
            <ChakraImage src="/logo.png" alt="Tees From The Past Logo" maxW="190px"/>
        </Flex>
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

  // A smarter Header that changes based on login state
  const Header = () => (
    <Flex as="header" align="center" justify="space-between" w="full" px={{base: 4, md: 6}} py={2} h="16" bg="brand.secondary" borderBottomWidth="1px" borderColor="brand.primaryDark" flexShrink={0}>
        <HStack spacing={4}>
            {user && !isDesktopView && <IconButton aria-label="Open Menu" onClick={onOpen} icon={<HamburgerIcon />} variant="ghost" />}
            <ChakraLink as={RouterLink} to="/">
                <ChakraImage src="/logo-text.png" alt="Tees From The Past" h="40px" />
            </ChakraLink>
        </HStack>
        <HStack spacing={2}>
            {user ? (
                <HStack spacing={4}>
                    <Avatar size="sm" name={user.username || user.email} src={user.avatarUrl || ''} as={RouterLink} to="/profile" cursor="pointer" bg="brand.primaryDark" color="white" />
                    <LogoutButton />
                </HStack>
            ) : (
                <HStack spacing={{base: 1, md: 2}}>
                    <Button variant="ghost" onClick={() => navigate('/login')} color="brand.textDark" _hover={{bg: 'blackAlpha.100'}}>Login</Button>
                    <Button colorScheme="brandPrimary" onClick={() => navigate('/register')}>Sign Up</Button>
                </HStack>
            )}
        </HStack>
    </Flex>
  );

  return (
    <Flex direction="column" minH="100vh" bg="brand.paper">
        {user && isDesktopView && <SidebarContent />}
        {user && !isDesktopView && (
          <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
            <DrawerOverlay /><DrawerContent bg="brand.primary" color="brand.textLight"><DrawerCloseButton /><DrawerHeader borderBottomWidth="1px" as={RouterLink} to="/shop" onClick={onClose} display="flex" justifyContent="center"><ChakraImage src="/logo.png" maxH="50px" /></DrawerHeader><DrawerBody p={0}><SidebarContent onClick={onClose} /></DrawerBody></DrawerContent>
          </Drawer>
        )}

      <Flex as="main" direction="column" flex="1" ml={user && isDesktopView ? "60" : "0"}>
        <Header />
        <Box flex="1" w="100%" p={{ base: 4, md: 8 }}>
            <Container maxW="container.xl" p={0}>
                {children}
            </Container>
        </Box>
        <Footer />
      </Flex>
    </Flex>
  );
}
