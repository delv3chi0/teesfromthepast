// frontend/src/components/MainLayout.jsx
import React, { useMemo } from 'react'; // Added useMemo
import {
  Box,
  Flex,
  VStack,
  Link as ChakraLink,
  IconButton,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  Image,
  Avatar,
  HStack,
  Icon, // Re-added Icon for potential use in navItems
  Spacer,
  useBreakpointValue,
} from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { HamburgerIcon } from '@chakra-ui/icons';
// Example icons if you choose to add them to navItems:
// import { FiHome, FiSettings, FiGrid, FiShoppingBag, FiGift, FiUser, FiShield } from 'react-icons/fi';
import LogoutButton from './LogoutButton';
import { useAuth } from '../context/AuthProvider';
import Footer from './Footer';

// Base navigation items available to all authenticated users
const baseNavItems = [
  { label: 'Dashboard', path: '/dashboard' /* icon: FiHome */ },
  { label: 'AI Image Generator', path: '/generate' /* icon: FiGrid */ },
  { label: 'My Saved Designs', path: '/my-designs' /* icon: FiShoppingBag */ },
  { label: 'Customize My Shirt', path: '/product-studio' /* icon: FiSettings */ },
  { label: '🏆 Monthly Design Contest', path: '/vote-now' /* icon: FiGift */ },
  { label: 'My Orders', path: '/my-orders' /* icon: FiShoppingBag */ },
  { label: 'My Profile', path: '/profile' /* icon: FiUser */ },
];

// Admin-specific navigation item
const adminNavItem = { label: '🛡️ Admin Console', path: '/admin' /* icon: FiShield */ };


export default function MainLayout({ children }) {
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user } = useAuth(); // Get user from AuthContext

  const isDesktopView = useBreakpointValue({ base: false, md: true });

  // Dynamically generate navItems based on user role
  const navItems = useMemo(() => {
    if (user?.isAdmin) {
      // Find the position of 'My Profile' to insert 'Admin Console' before it, or add to end
      const profileIndex = baseNavItems.findIndex(item => item.path === '/profile');
      if (profileIndex !== -1 && profileIndex < baseNavItems.length -1) { // Ensure 'My Profile' is not the last item for this logic
        const items = [...baseNavItems];
        items.splice(profileIndex + 1, 0, adminNavItem); // Insert after My Profile
        return items;
      } else {
         // Fallback: add to the end or directly after profile if it's last
        return [...baseNavItems, adminNavItem];
      }
    }
    return baseNavItems;
  }, [user]);


  const SidebarContent = ({ onClick, inDrawer = false }) => {
    const showInternalLogo = !inDrawer;

    return (
      <Box
        as="nav"
        pos={inDrawer ? 'relative' : 'fixed'}
        top={inDrawer ? undefined : '0'}
        left={inDrawer ? undefined : '0'}
        zIndex={inDrawer ? 'auto' : 1200}
        h={inDrawer ? '100%' : 'full'}
        pb={inDrawer ? 4 : '10'}
        overflowX="hidden"
        overflowY="auto"
        bg="brand.primary"
        borderColor={inDrawer ? 'transparent' : 'brand.primaryDark'}
        borderRightWidth={inDrawer ? '0' : '1px'}
        w={inDrawer ? '100%' : '60'}
      >
        {showInternalLogo && (
          <Flex
            as={RouterLink}
            to="/dashboard"
            px="4"
            py="4"
            align="center"
            justifyContent="center"
            _hover={{ bg: 'brand.primaryLight', textDecoration: 'none' }}
            onClick={inDrawer ? onClick : undefined}
          >
            <Image
              src="/logo.png"
              alt="Tees From The Past Logo"
              w="100%"
              maxW="190px"
              h="auto"
              maxH="150px"
              objectFit="contain"
            />
          </Flex>
        )}
        <VStack
          spacing={3}
          align="stretch"
          px="4"
          mt={showInternalLogo ? 8 : 4}
        >
          {navItems.map((item) => (
            <ChakraLink
              key={item.label}
              as={RouterLink}
              to={item.path}
              p={3}
              borderRadius="md"
              fontWeight="medium"
              display="flex" // Added for icon alignment
              alignItems="center" // Added for icon alignment
              color={
                location.pathname === item.path ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/')) ||
                (item.path === '/dashboard' && location.pathname === '/')
                  ? 'brand.accentYellow'
                  : 'brand.textLight'
              }
              bg={
                location.pathname === item.path ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/')) ||
                (item.path === '/dashboard' && location.pathname === '/')
                  ? 'brand.primaryLight'
                  : 'transparent'
              }
              _hover={{
                textDecoration: 'none',
                bg: 'brand.primaryLight',
                color: 'brand.accentYellow',
              }}
              onClick={onClick} // Closes drawer when a nav item is clicked
            >
              {/* {item.icon && <Icon as={item.icon} mr={3} w={5} h={5} />} */}
              {item.label}
            </ChakraLink>
          ))}
        </VStack>
      </Box>
    );
  };

  return (
    <Flex direction="column" minH="100vh">
      <Box as="section" display="flex" flexGrow={1}>
        {isDesktopView && (
          <Box as="aside" w="60" flexShrink={0}>
            <SidebarContent />
          </Box>
        )}

        {!isDesktopView && (
          <Drawer
            isOpen={isOpen}
            placement="left"
            onClose={onClose}
            returnFocusOnClose={false}
          >
            <DrawerOverlay />
            <DrawerContent bg="brand.primary" color="brand.textLight">
              <DrawerCloseButton />
              <DrawerHeader
                borderBottomWidth="1px"
                borderColor="brand.primaryDark"
                as={RouterLink}
                to="/dashboard"
                _hover={{ textDecoration: 'none' }}
                display="flex"
                alignItems="center"
                justifyContent="center"
                py="2.5"
                onClick={onClose}
              >
                <Image
                  src="/logo.png"
                  alt="Tees From The Past Logo"
                  maxH="50px"
                  objectFit="contain"
                />
              </DrawerHeader>
              <DrawerBody p={0}>
                <SidebarContent onClick={onClose} inDrawer={true} />
              </DrawerBody>
            </DrawerContent>
          </Drawer>
        )}

        <Box
          flexGrow={1}
          ml={isDesktopView ? "0" : "0"}
          transition=".3s ease"
          display="flex"
          flexDirection="column"
        >
          <Flex
            as="header"
            align="center"
            w="full"
            px={6}
            py={3}
            bg="brand.secondary"
            borderBottomWidth="1px"
            borderColor="brand.primaryDark"
            color="brand.textDark"
            h="auto"
            minH="14"
            flexShrink={0}
          >
            <Flex align="center" flex="0">
              {!isDesktopView && (
                <IconButton
                  aria-label="Open Menu"
                  onClick={onOpen}
                  icon={<HamburgerIcon />}
                  size="md"
                  variant="ghost"
                  mr={2}
                  color="brand.primaryDark"
                  _hover={{ bg: 'brand.primaryLight' }}
                />
              )}
              <ChakraLink
                as={RouterLink}
                to="/dashboard"
                display="flex"
                alignItems="center"
                _hover={{ textDecoration: 'none' }}
              >
                <Image
                  src="/logo-text.png"
                  alt="Tees From The Past Title Logo"
                  h="50px"
                  objectFit="contain"
                  maxW={{ base: '180px' }}
                />
              </ChakraLink>
            </Flex>

            <Spacer />

            <Flex align="center" flex="0">
              {user && isDesktopView && (
                <ChakraLink as={RouterLink} to="/profile" mr={4}>
                  <Avatar
                    size="sm"
                    name={user.username || user.email}
                    src={user.avatarUrl || ''}
                    bg="brand.primaryDark"
                    color="brand.textLight"
                  />
                </ChakraLink>
              )}
              <LogoutButton />
            </Flex>
          </Flex>

          <Box
            as="main"
            p={{ base: 4, md: 6 }}
            bg="brand.accentOrange"
            flexGrow={1}
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
