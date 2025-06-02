// frontend/src/components/MainLayout.jsx
import { Box, Flex, VStack, Link as ChakraLink, IconButton, useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody, Image, Avatar, HStack, Icon, Spacer, useBreakpointValue, Text } from '@chakra-ui/react';
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
];

export default function MainLayout({ children }) {
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user } = useAuth();

  const isDesktopView = useBreakpointValue({ base: false, md: true });

   const finalNavItems = [...navItems];
   if (user && user.isAdmin) {
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
        zIndex={inDrawer ? "auto" : 1200}
        h={inDrawer ? "100%" : "full"}
        pb={inDrawer ? 4 : "10"}
        overflowX="hidden"
        overflowY="auto"
        bg="brand.primary"
        borderColor={inDrawer ? "transparent" : "brand.primaryDark"}
        borderRightWidth={inDrawer ? "0" : "1px"}
        w={inDrawer ? "100%" : "60"}
      >
        {showInternalLogo && (
          <Flex
            as={RouterLink}
            to="/dashboard"
            px="4" py="4" align="center" justifyContent="center"
            _hover={{ bg: 'brand.primaryLight', textDecoration: 'none' }}
            onClick={onClick}
          >
            <Image src="/logo.png" alt="Tees From The Past Logo" w="100%" maxW="190px" h="auto" maxH="150px" objectFit="contain" />
          </Flex>
        )}
        <VStack spacing={3} align="stretch" px="4" mt={showInternalLogo ? 8 : 4}>
          {finalNavItems.map((item) => (
            <ChakraLink
              key={item.label} as={RouterLink} to={item.path}
              p={3} borderRadius="md" fontWeight="medium"
              color={location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path)) ? "brand.accentYellow" : "brand.textLight"}
              bg={location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path)) ? "brand.primaryLight" : "transparent"}
              _hover={{textDecoration: 'none', bg: 'brand.primaryLight', color: 'brand.accentYellow', }}
              onClick={onClick}
            >
              {item.label}
            </ChakraLink>
          ))}
        </VStack>
      </Box>
    );
  };

  return (
    <Flex direction="column" minH="100vh" bg="gray.800"> {/* Overall page background */}
      <Box as="section" display="flex" flexGrow={1} >
        {isDesktopView && (
          <Box as="aside" w="60" flexShrink={0} /* Fixed sidebar placeholder */ >
            <SidebarContent />
          </Box>
        )}

        {!isDesktopView && (
          <Drawer isOpen={isOpen} placement="left" onClose={onClose} returnFocusOnClose={false}>
            <DrawerOverlay />
            <DrawerContent bg="brand.primary" color="brand.textLight">
              <DrawerCloseButton />
              <DrawerHeader
                borderBottomWidth="1px" borderColor="brand.primaryDark"
                as={RouterLink} to="/dashboard" _hover={{textDecoration: 'none'}}
                display="flex" alignItems="center" justifyContent="center" py="2.5" onClick={onClose}
              >
                <Image src="/logo.png" alt="Tees From The Past Logo" maxH="50px" objectFit="contain"/>
              </DrawerHeader>
              <DrawerBody p={0}> <SidebarContent onClick={onClose} inDrawer={true} /> </DrawerBody>
            </DrawerContent>
          </Drawer>
        )}

        {/* Main Content Column (Header + Page Content) */}
        <Flex // Changed from Box to Flex
          flexGrow={1}
          ml={isDesktopView ? "60" : "0"}
          direction="column" // Keep as column for header and main content
          // bg="rgba(0,255,0,0.1)" // Optional debug background
        >
          {/* Header */}
          <Flex
            as="header"
            align="center"
            w="100%"
            px={6} py={3}
            bg="brand.secondary" // Brown bar
            borderBottomWidth="1px" borderColor="brand.primaryDark"
            color="brand.textDark"
            minH="14"
            flexShrink={0} // Prevent header from shrinking
          >
            <Flex align="center" flex="0">
              {!isDesktopView && (
                <IconButton
                  aria-label="Open Menu" onClick={onOpen} icon={<HamburgerIcon />}
                  size="md" variant="ghost" mr={2} color="brand.primaryDark" _hover={{ bg: 'brand.primaryLight' }}
                />
              )}
              <ChakraLink as={RouterLink} to="/dashboard" display="flex" alignItems="center" _hover={{textDecoration: "none"}}>
                <Image src="/logo-text.png" alt="Tees From The Past Title Logo" h="50px" objectFit="contain" maxW={{ base: "180px" }} />
              </ChakraLink>
            </Flex>
            <Spacer />
            <Flex align="center" flex="0">
              {user && isDesktopView && (
                <ChakraLink as={RouterLink} to="/profile" mr={4}>
                  <Avatar size="sm" name={user.username || user.email} src={user.avatarUrl || ''} bg="brand.primaryDark" color="brand.textLight"/>
                </ChakraLink>
              )}
              <LogoutButton />
            </Flex>
          </Flex>

          {/* Page Content Area (where children render) */}
          {/* This Box is now a direct child of a Flex column parent */}
          <Box
            as="main"
            p={{base: 4, md: 6}}
            bg="brand.accentOrange" // The orange background
            flexGrow={1} // Should expand to fill remaining vertical space
            width="100%" // Should take full width of its parent Flex column
            overflowY="auto"
            // Forcing some height and obvious content for debugging
            minH="50vh" // Ensure it has some visible height
            border="5px solid blue" // Debug border
          >
            <Text bg="white" color="black" p={2} fontSize="xl" fontWeight="bold">
              MAIN LAYOUT - CHILDREN START HERE:
            </Text>
            {/* The {children} (e.g., AdminPage) will render here */}
            {children}
            <Text bg="white" color="black" p={2} fontSize="xl" fontWeight="bold" mt={4}>
              MAIN LAYOUT - CHILDREN END HERE.
            </Text>
          </Box>
        </Flex>
      </Box>
      <Footer />
    </Flex>
  );
}
