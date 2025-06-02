// frontend/src/components/MainLayout.jsx
import { Box, Flex, VStack, Link as ChakraLink, IconButton, useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody, Image, Avatar, HStack, Icon, Spacer, useBreakpointValue } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { HamburgerIcon } from '@chakra-ui/icons';
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
  // Consider adding an "Admin" link here if user is admin
  // { label: 'Admin Dashboard', path: '/admin', adminOnly: true },
];

export default function MainLayout({ children }) {
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user } = useAuth();

  const isDesktopView = useBreakpointValue({ base: false, md: true });

  // Filter nav items based on admin status if needed for the Admin link
  const accessibleNavItems = navItems.filter(item => {
    if (item.adminOnly) {
      return user && user.isAdmin;
    }
    return true;
  });
   // Add Admin link conditionally if user is admin
   const finalNavItems = [...navItems];
   if (user && user.isAdmin) {
       // Check if Admin link already exists to prevent duplicates if manually added to navItems
       if (!finalNavItems.find(item => item.path === '/admin')) {
           finalNavItems.push({ label: '⚙️ Admin Dashboard', path: '/admin' });
       }
   }


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
        w={inDrawer ? "100%" : "60"} // This is 240px if theme.space.1 = 4px
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
            onClick={onClick} // Ensure drawer closes if logo clicked from within drawer
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
          {finalNavItems.map((item) => ( // Use finalNavItems
            <ChakraLink
              key={item.label}
              as={RouterLink}
              to={item.path}
              p={3}
              borderRadius="md"
              fontWeight="medium"
              color={location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path)) ? "brand.accentYellow" : "brand.textLight"}
              bg={location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path)) ? "brand.primaryLight" : "transparent"}
              _hover={{textDecoration: 'none', bg: 'brand.primaryLight', color: 'brand.accentYellow', }}
              onClick={onClick} // Ensure drawer closes on nav item click
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
      <Box as="section" display="flex" flexGrow={1} position="relative"> {/* Added position relative for z-index context if needed */}
        {isDesktopView && (
          <Box as="aside" w="60" flexShrink={0} /* The fixed sidebar takes up this space */>
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
                py="2.5"
                onClick={onClose}
              >
                <Image src="/logo.png" alt="Tees From The Past Logo" maxH="50px" objectFit="contain"/>
              </DrawerHeader>
              <DrawerBody p={0}>
                <SidebarContent onClick={onClose} inDrawer={true} />
              </DrawerBody>
            </DrawerContent>
          </Drawer>
        )}
        
        {/* Main Content Area Wrapper */}
        <Box
          flexGrow={1}
          // Corrected margin-left for desktop view to account for fixed sidebar width
          ml={isDesktopView ? "60" : "0"} // Width of the sidebar ("60" * theme.space unit)
          transition="margin-left .3s ease" // Keep transition if you like the effect
          display="flex"
          flexDirection="column"
          width={isDesktopView ? "calc(100% -theme.space.60)" : "100%"} // Ensure it takes remaining width
        >
          {/* Header */}
          <Flex
            as="header"
            align="center"
            w="full" // Takes full width of its parent (the Box above)
            px={6} py={3}
            bg="brand.secondary"
            borderBottomWidth="1px"
            borderColor="brand.primaryDark"
            color="brand.textDark"   
            h="auto" minH="14" // Or specific height like "70px"
            flexShrink={0} // Prevent header from shrinking
          >
            <Flex align="center" flex="0"> {/* For Hamburger and Mobile Logo */}
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
              {/* Show text logo in header only on mobile, or if sidebar is collapsed on desktop */}
              {/* Or always show it if you prefer */}
              <ChakraLink as={RouterLink} to="/dashboard" display="flex" alignItems="center" _hover={{textDecoration: "none"}}>
                <Image
                  src="/logo-text.png"
                  alt="Tees From The Past Title Logo"
                  h="50px" // Adjust as needed
                  objectFit="contain"
                  maxW={{ base: "180px" }} // Ensure it's not too wide on mobile
                />
              </ChakraLink>
            </Flex>

            <Spacer />

            <Flex align="center" flex="0"> {/* For Profile Avatar and Logout */}
              {user && isDesktopView && ( // Only show avatar on desktop in header
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

          {/* Page Content (children) */}
          <Box 
            as="main" 
            p={{base: 4, md: 6}} 
            bg="brand.accentOrange" // This is the orange background
            flexGrow={1} 
            width="100%" // Ensure it takes full width of its parent
            overflowY="auto" // Add scroll for content longer than viewport height
          >
            {children} {/* AdminPage or other page content renders here */}
          </Box>
        </Box>
      </Box>
      <Footer />
    </Flex>
  );
}
