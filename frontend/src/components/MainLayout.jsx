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
  { label: 'My Profile', path: '/profile' },
];

export default function MainLayout({ children }) {
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user } = useAuth();

  const isDesktopView = useBreakpointValue({ base: false, md: true });
  // console.log('[MainLayout Diagnostics] isOpen:', isOpen, 'isDesktopView:', isDesktopView); 

  // MODIFIED SidebarContent to be adaptable
  const SidebarContent = ({ onClick, inDrawer = false }) => (
    <Box 
      as="nav" 
      pos={inDrawer ? "relative" : "fixed"} // Relative when in drawer, fixed otherwise
      top={inDrawer ? undefined : "0"}
      left={inDrawer ? undefined : "0"}
      zIndex={inDrawer ? "auto" : 1200} // Auto zIndex in drawer, specific for fixed
      h={inDrawer ? "100%" : "full"}      // Fill height of drawer or full viewport
      pb={inDrawer ? 4 : "10"}           // Adjust padding for drawer context
      overflowX="hidden" 
      overflowY="auto" 
      bg="brand.primary" 
      // No borderRight when in drawer, as DrawerContent provides the visual boundary
      borderColor={inDrawer ? "transparent" : "brand.primaryDark"} 
      borderRightWidth={inDrawer ? "0" : "1px"} 
      w={inDrawer ? "100%" : "60"} // Full width of drawer, or fixed width '60' for desktop
    >
      <Flex 
        as={RouterLink} 
        to="/dashboard" 
        px="4" 
        py="4" // This py might be for the logo container, keep it for now
        align="center" 
        justifyContent="center" 
        _hover={{ bg: 'brand.primaryLight', textDecoration: 'none' }}
        // For the logo inside the drawer's SidebarContent, you might want it smaller than the DrawerHeader logo
        // This specific logo is the one in the sidebar, not the drawer header
        display={inDrawer ? "none" : "flex"} // Optionally hide this logo if DrawerHeader already has one
      >
        <Image src="/logo.png" alt="Tees From The Past Logo" w="100%" maxW="190px" h="auto" maxH="150px" objectFit="contain" />
      </Flex>
      <VStack spacing={3} align="stretch" px="4" mt={inDrawer && ! (inDrawer && display === "none") ? 4 : 8}> 
      {/* Adjust mt if logo above is hidden in drawer */}
        {navItems.map((item) => (
          <ChakraLink 
            key={item.label} 
            as={RouterLink} 
            to={item.path} 
            p={3} 
            borderRadius="md" 
            fontWeight="medium" 
            color={location.pathname === item.path ? "brand.accentYellow" : "brand.textLight"} 
            bg={location.pathname === item.path ? "brand.primaryLight" : "transparent"} 
            _hover={{textDecoration: 'none', bg: 'brand.primaryLight', color: 'brand.accentYellow', }} 
            onClick={onClick} // This closes the drawer on navigation
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
        {isDesktopView && (
          <Box>
            <SidebarContent /> {/* inDrawer defaults to false */}
          </Box>
        )}
        
        {!isDesktopView && (
          <Drawer isOpen={isOpen} placement="left" onClose={onClose} returnFocusOnClose={false}>
            <DrawerOverlay />
            <DrawerContent 
              bg="brand.primary" 
              color="brand.textLight"
              border={isOpen ? "2px dashed lime" : "none"} // Kept a subtle diagnostic border for when drawer is open
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
                onClick={onClose} // Close drawer if header is clicked
              >
                <Image src="/logo.png" alt="Tees From The Past Logo" maxH="50px" objectFit="contain"/> 
              </DrawerHeader>
              <DrawerBody p={0}> {/* DrawerBody has its own padding, set to 0 if SidebarContent handles it */}
                <SidebarContent onClick={onClose} inDrawer={true} /> {/* Pass inDrawer=true */}
              </DrawerBody>
            </DrawerContent>
          </Drawer>
        )}
        
        <Box 
          flexGrow={1} 
          ml={isDesktopView ? "60" : "0"} 
          transition=".3s ease" 
          display="flex" 
          flexDirection="column"
        >
          {/* ... Header and Main content ... (remains the same as your last version) */}
          <Flex
            as="header"
            align="center"
            w="full"
            px={6} py={3} 
            bg="brand.secondary" 
            borderBottomWidth="1px"
            borderColor="brand.primaryDark" 
            color="brand.textDark"     
            h="auto" minH="14"
            flexShrink={0}
          >
            <Flex align="center" flex="0"> {/* Left Group */}
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
              <ChakraLink as={RouterLink} to="/dashboard" display="flex" alignItems="center" _hover={{textDecoration: "none"}}>
                <Image 
                  src="/logo-text.png" 
                  alt="Tees From The Past Title Logo" 
                  h="50px" 
                  objectFit="contain"
                  maxW={{ base: "180px" }} 
                />
              </ChakraLink>
            </Flex>

            <Spacer /> 

            <Flex align="center" flex="0"> {/* Right Group */}
              {user && isDesktopView && (
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
          <Box as="main" p={{base: 4, md: 6}} bg="brand.accentOrange" flexGrow={1} width="100%" > 
            {children}
          </Box>
        </Box>
      </Box>
      <Footer /> 
    </Flex>
  );
}
