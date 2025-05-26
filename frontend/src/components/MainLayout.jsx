// frontend/src/components/MainLayout.jsx
import { Box, Flex, VStack, Link as ChakraLink, Text, Spacer, IconButton, useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody, Image } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { HamburgerIcon } from '@chakra-ui/icons';
import LogoutButton from './LogoutButton';

// Navigation items
const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'AI Image Generator', path: '/generate' },
  { label: 'My Saved Designs', path: '/my-designs' },
  { label: 'My Profile', path: '/profile' },
];

export default function MainLayout({ children }) {
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const SidebarContent = ({onClick}) => (
    <Box
      as="nav"
      pos="fixed"
      top="0"
      left="0"
      zIndex="sticky"
      h="full"
      pb="10"
      overflowX="hidden"
      overflowY="auto"
      bg="brand.primary" // <-- UPDATED: Use primary brand color for sidebar background
      borderColor="brand.primaryDark" // <-- UPDATED: Use a darker shade for border
      borderRightWidth="1px"
      w="60" 
    >
      <Flex 
        as={RouterLink} 
        to="/dashboard" 
        px="4" 
        py="3" 
        align="center" 
        justifyContent="center"
        _hover={{ bg: 'brand.primaryLight', textDecoration: 'none' }} // <-- UPDATED: Hover state
        h="14" 
      >
        <Image src="/logo.png" alt="Tees From The Past Logo" h="40px" />
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
            // UPDATED Link colors to use theme
            color={location.pathname === item.path ? "brand.accentYellow" : "brand.textLight"}
            bg={location.pathname === item.path ? "brand.primaryLight" : "transparent"}
            _hover={{
              textDecoration: 'none',
              bg: 'brand.primaryLight', // Use a slightly lighter primary for hover
              color: 'brand.accentYellow',    // Use an accent for hover text
            }}
            onClick={onClick}
          >
            {item.label}
          </ChakraLink>
        ))}
      </VStack>
    </Box>
  );

  return (
    // Main outer box - its background will be whatever body inherits or is set globally by your theme
    // The global style in theme.js sets body bg to brand.bgLight
    <Box as="section" minH="100vh"> 
      <SidebarContent display={{ base: 'none', md: 'unset' }} />
      
      <Drawer isOpen={isOpen} placement="left" onClose={onClose} returnFocusOnClose={false}>
        <DrawerOverlay />
        <DrawerContent bg="brand.primary" color="brand.textLight"> {/* UPDATED Drawer background and text */}
          <DrawerCloseButton />
          <DrawerHeader 
            borderBottomWidth="1px" 
            borderColor="brand.primaryDark" // UPDATED
            as={RouterLink} 
            to="/dashboard" 
            _hover={{textDecoration: 'none'}}
            display="flex"      
            alignItems="center" 
            justifyContent="center"
            py="2.5" 
          >
            <Image src="/logo.png" alt="Tees From The Past Logo" maxH="35px" /> 
          </DrawerHeader>
          <DrawerBody>
            <SidebarContent onClick={onClose}/>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Box ml={{ base: 0, md: 60 }} transition=".3s ease">
        <Flex
          as="header"
          align="center"
          justify="space-between" 
          w="full"
          px="4"
          bg="brand.paper" // <-- UPDATED: Use paper/white for top bar background
          borderBottomWidth="1px"
          borderColor="blackAlpha.200" // A subtle border, or use a brand color
          color="brand.textDark"     // <-- UPDATED: Text color for top bar items
          h="14"
        >
          <Flex align="center">
            <IconButton
              aria-label="Open Menu"
              display={{ base: 'inline-flex', md: 'none' }}
              onClick={onOpen}
              icon={<HamburgerIcon />}
              size="sm"
              variant="ghost"
              mr={{ base: 2, md: 0 }} 
            />
            <ChakraLink as={RouterLink} to="/dashboard" display={{ base: 'none', md: 'flex' }} alignItems="center">
              <Image 
                src="/logo.png" 
                alt="Tees From The Past Logo" 
                h="35px" 
                objectFit="contain"
              />
            </ChakraLink>
          </Flex>
          
          <Flex align="center">
            <LogoutButton /> {/* Ensure LogoutButton text/icon color contrasts with brand.paper */}
          </Flex>
        </Flex>

        {/* The main content area will inherit body background unless children override it */}
        <Box as="main" p="4"> 
          {children}
        </Box>
      </Box>
    </Box>
  );
}
