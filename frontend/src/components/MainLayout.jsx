// frontend/src/components/MainLayout.jsx
import { Box, Flex, VStack, Link as ChakraLink, IconButton, useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody, Image, Avatar, HStack, Icon, Spacer, useBreakpointValue } from '@chakra-ui/react';
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
  { label: 'My Orders', path: '/my-orders' }, // <-- ADDED "My Orders"
  { label: 'My Profile', path: '/profile' },
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
        pos={inDrawer ? "relative" : "fixed"}
        top={inDrawer ? undefined : "0"}
        left={inDrawer ? undefined : "0"}
        zIndex={inDrawer ? "auto" : 1200} // Ensure fixed sidebar is above some content if needed
        h={inDrawer ? "100%" : "full"}
        pb={inDrawer ? 4 : "10"}
        overflowX="hidden"
        overflowY="auto"
        bg="brand.primary"
        borderColor={inDrawer ? "transparent" : "brand.primaryDark"}
        borderRightWidth={inDrawer ? "0" : "1px"}
        w={inDrawer ? "100%" : "60"} // Standard Chakra unit for width (240px if 1 unit = 4px)
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
            onClick={onClick} // Close drawer if logo in fixed sidebar is clicked when drawer is open (edge case)
          >
            <Image src="/logo.png" alt="Tees From The Past Logo" w="100%" maxW="190px" h="auto" maxH="150px" objectFit="contain" />
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
              color={location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/')) || (item.path === '/dashboard' && location.pathname === '/') ? "brand.accentYellow" : "brand.textLight"}
              bg={location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/')) || (item.path === '/dashboard' && location.pathname === '/') ? "brand.primaryLight" : "transparent"}
              _hover={{textDecoration: 'none', bg: 'brand.primaryLight', color: 'brand.accentYellow', }}
              onClick={onClick} // This closes the drawer when a nav item is clicked
            >
              {/* If you add an icon property to navItems, you could render it here: 
                {item.icon && <Icon as={item.icon} mr={2} />} 
              */}
              {item.label}
            </ChakraLink>
          ))}
        </VStack>
      </Box>
    );
  };

  return (
    <Flex direction="column" minH="100vh"> {/* Base flex container for sticky footer */}
      <Box as="section" display="flex" flexGrow={1}> {/* Section for sidebar and main content */}
        {isDesktopView && (
          <Box as="aside" w="60" flexShrink={0}> {/* Occupy space for fixed sidebar */}
            <SidebarContent />
          </Box>
        )}
        
        {!isDesktopView && (
          <Drawer isOpen={isOpen} placement="left" onClose={onClose} returnFocusOnClose={false}>
            <DrawerOverlay />
            <DrawerContent
              bg="brand.primary"
              color="brand.textLight"
            >
              <DrawerCloseButton />
              <DrawerHeader
                borderBottomWidth="1px"
                borderColor="brand.primaryDark"
                as={RouterLink} to="/dashboard"
                _hover={{textDecoration: 'none'}}
                display="flex"
                alignItems="center"
                justifyContent="center"
                py="2.5" // Adjusted padding
                onClick={onClose} // Close drawer when header logo is clicked
              >
                <Image src="/logo.png" alt="Tees From The Past Logo" maxH="50px" objectFit="contain"/>
              </DrawerHeader>
              <DrawerBody p={0}> {/* Remove padding to allow SidebarContent to control its own */}
                <SidebarContent onClick={onClose} inDrawer={true} />
              </DrawerBody>
            </DrawerContent>
          </Drawer>
        )}
        
        <Box
          flexGrow={1}
          ml={isDesktopView ? "60" : "0"} // Adjust margin left if desktop view
          transition=".3s ease" // Smooth transition for margin change (optional)
          display="flex"
          flexDirection="column" // Ensure this box can also manage a footer within its own flow if needed
        >
          {/* Header bar */}
          <Flex
            as="header"
            align="center"
            w="full" // Take full width of its container
            px={6} py={3}
            bg="brand.secondary" // Your header background color
            borderBottomWidth="1px"
            borderColor="brand.primaryDark" // Or your theme's border color
            color="brand.textDark" // Text color for header
            h="auto" minH="14" // Chakra unit for height (56px if 1 unit = 4px)
            flexShrink={0} // Prevent header from shrinking
          >
            <Flex align="center" flex="0"> {/* Container for hamburger and mobile logo */}
              {!isDesktopView && (
                <IconButton
                  aria-label="Open Menu"
                  onClick={onOpen}
                  icon={<HamburgerIcon />}
                  size="md"
                  variant="ghost"
                  mr={2}
                  color="brand.primaryDark" // Or your desired icon color
                  _hover={{ bg: 'brand.primaryLight' }}
                />
              )}
              {/* Text Logo in header */}
              <ChakraLink as={RouterLink} to="/dashboard" display="flex" alignItems="center" _hover={{textDecoration: "none"}}>
                <Image
                  src="/logo-text.png" // Assuming this is your text-based logo image
                  alt="Tees From The Past Title Logo"
                  h="50px" // Adjust height as needed
                  objectFit="contain"
                  maxW={{ base: "180px" }} // Responsive max width
                />
              </ChakraLink>
            </Flex>

            <Spacer /> {/* Pushes avatar and logout button to the right */}

            <Flex align="center" flex="0"> {/* Container for Profile Avatar and Logout */}
              {user && isDesktopView && ( // Show avatar on desktop if user is logged in
                <ChakraLink
                  as={RouterLink}
                  to="/profile"
                  mr={4}
                >
                  <Avatar size="sm" name={user.username || user.email} src={user.avatarUrl || ''} bg="brand.primaryDark" color="brand.textLight"/>
                </ChakraLink>
              )}
              <LogoutButton />
            </Flex>
          </Flex>
          {/* Main content area where page components are rendered */}
          <Box as="main" p={{base: 4, md: 6}} bg="brand.accentOrange" flexGrow={1} width="100%" > 
            {children} {/* This is where <Dashboard />, <Generate />, etc., will be rendered */}
          </Box>
        </Box>
      </Box>
      <Footer /> {/* Your existing Footer component */}
    </Flex>
  );
}
