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
  { label: '🏆 Monthly Design Contest', path: '/vote-now' }, // Assuming you made title change here
  { label: 'My Profile', path: '/profile' },
];

export default function MainLayout({ children }) {
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user } = useAuth();

  const isDesktopView = useBreakpointValue({ base: false, md: true });
  // console.log('[MainLayout Diagnostics] isOpen:', isOpen, 'isDesktopView:', isDesktopView); // Keep for debugging if needed

  const SidebarContent = ({onClick}) => (
    <Box 
      as="nav" 
      pos="fixed" 
      top="0" 
      left="0" 
      zIndex={1200} 
      h="full" 
      pb="10" 
      overflowX="hidden" 
      overflowY="auto" 
      bg="brand.primary" 
      borderColor="brand.primaryDark" 
      borderRightWidth="1px" 
      w="60" 
    >
      <Flex as={RouterLink} to="/dashboard" px="4" py="4" align="center" justifyContent="center" _hover={{ bg: 'brand.primaryLight', textDecoration: 'none' }}>
        <Image src="/logo.png" alt="Tees From The Past Logo" w="100%" maxW="190px" h="auto" maxH="150px" objectFit="contain" />
      </Flex>
      <VStack spacing={3} align="stretch" px="4" mt={8}>
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
        {/* Desktop Sidebar: Render only if isDesktopView is true */}
        {isDesktopView && (
          <Box> {/* Removed display={{ base: 'none', md: 'block' }} as isDesktopView now controls rendering */}
            <SidebarContent /> 
          </Box>
        )}
        
        {/* Mobile Drawer: Render only if NOT isDesktopView */}
        {!isDesktopView && (
          <Drawer isOpen={isOpen} placement="left" onClose={onClose} returnFocusOnClose={false}>
            <DrawerOverlay />
            <DrawerContent 
              bg="brand.primary" 
              color="brand.textLight"
              border={isOpen ? "5px dashed lime" : "none"} // Keep diagnostic border only if open, for clarity
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
              >
                <Image src="/logo.png" alt="Tees From The Past Logo" maxH="50px" objectFit="contain"/> 
              </DrawerHeader>
              <DrawerBody p={0}>
                <SidebarContent onClick={onClose}/>
              </DrawerBody>
            </DrawerContent>
          </Drawer>
        )}
        
        <Box 
          flexGrow={1} 
          ml={isDesktopView ? "60" : "0"} // Use isDesktopView for margin logic
          transition=".3s ease" 
          display="flex" 
          flexDirection="column"
        >
          <Flex // Header
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
              {/* Hamburger Icon: Render only if NOT isDesktopView */}
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
              {/* Profile Icon: Render only if user exists AND isDesktopView */}
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
