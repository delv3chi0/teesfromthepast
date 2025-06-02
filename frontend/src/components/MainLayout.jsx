// frontend/src/components/MainLayout.jsx
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
  // Icon, // Icon was imported but not used in the provided code. Removed for cleanup.
  Spacer,
  useBreakpointValue,
} from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { HamburgerIcon } from '@chakra-ui/icons';
// If you decide to add icons to navItems, you might import them here, e.g.:
// import { FiShoppingBag } from 'react-icons/fi';
import LogoutButton from './LogoutButton';
import { useAuth } from '../context/AuthProvider';
import Footer from './Footer';

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'AI Image Generator', path: '/generate' },
  { label: 'My Saved Designs', path: '/my-designs' },
  { label: 'Customize My Shirt', path: '/product-studio' },
  { label: '🏆 Monthly Design Contest', path: '/vote-now' },
  { label: 'My Orders', path: '/my-orders' },
  { label: 'My Profile', path: '/profile' },
  // If 'Admin Dashboard' is needed, add it here:
  // { label: 'Admin Dashboard', path: '/admin-dashboard' },
];

export default function MainLayout({ children }) {
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user } = useAuth();

  const isDesktopView = useBreakpointValue({ base: false, md: true });

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
            onClick={onClick} // Assuming onClick is for closing drawer, which isn't relevant here
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
              {item.label}
            </ChakraLink>
          ))}
        </VStack>
      </Box>
    );
  };

  return (
    <Flex direction="column" minH="100vh">
      {/* This Box is the container for Sidebar + Main Content Area */}
      <Box as="section" display="flex" flexGrow={1}>
        {isDesktopView && (
          // This aside takes up space in the document flow, pushing the main content.
          <Box as="aside" w="60" flexShrink={0}>
            <SidebarContent /> {/* SidebarContent itself is position: fixed */}
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
              </DrawerBody
            </DrawerContent>
          </Drawer>
        )}

        {/* This is the Main Content Wrapper Box */}
        {/* It has NO explicit background color set in this "correct" version. */}
        {/* Its ml="0" is correct on desktop because the <aside> element above already reserves space. */}
        <Box
          flexGrow={1}
          ml={isDesktopView ? "0" : "0"}
          transition=".3s ease"
          display="flex"
          flexDirection="column"
          // If you want to ensure this area has a specific non-dark background,
          // you could add, e.g., bg="white" or bg="gray.50" (or a theme color) here.
        >
          <Flex // Header
            as="header"
            align="center"
            w="full"
            px={6}
            py={3}
            bg="brand.secondary" // Header background
            borderBottomWidth="1px"
            borderColor="brand.primaryDark"
            color="brand.textDark"
            h="auto"
            minH="14"
            flexShrink={0} // Header should not shrink
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

          {/* This is where your page content (children) gets rendered */}
          {/* It has its own background (brand.accentOrange) and padding. */}
          <Box
            as="main"
            p={{ base: 4, md: 6 }}
            bg="brand.accentOrange" // Main content area background
            flexGrow={1} // Ensures it tries to fill available vertical space
            width="100%" // Ensures it tries to fill available horizontal space
          >
            {children}
          </Box>
        </Box>
      </Box>
      <Footer />
    </Flex>
  );
}
