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
      bg="gray.800"
      borderColor="gray.700"
      borderRightWidth="1px"
      w="60" // width of the sidebar (15rem or 240px)
    >
      {/* === LOGO IN SIDEBAR HEADER (IMAGE ONLY & LARGER) === */}
      <Flex 
        as={RouterLink} 
        to="/dashboard" 
        px="4"        // Side padding for the logo area
        py="6"        // Increased vertical padding to give logo more space
        align="center" 
        justifyContent="center" 
        _hover={{ bg: 'gray.700', textDecoration: 'none' }}
        // Removed fixed height from this Flex, it will now size to its content + padding
      >
        <Image 
          src="/logo.png" 
          alt="Tees From The Past Logo" 
          maxH="100px" // << INCREASED max height for the logo, adjust as needed
          // maxW="80%" // Optionally, constrain width too, e.g., 80% of sidebar padded width
          objectFit="contain" // Ensures the entire logo is visible and scales proportionally
        />
      </Flex>
      {/* === END LOGO IN SIDEBAR HEADER === */}
      <VStack spacing={3} align="stretch" px="4" mt={8}>
        {navItems.map((item) => (
          <ChakraLink
            key={item.label}
            as={RouterLink}
            to={item.path}
            p={3}
            borderRadius="md"
            fontWeight="medium"
            color={location.pathname === item.path ? "teal.300" : "gray.300"}
            bg={location.pathname === item.path ? "teal.700" : "transparent"}
            _hover={{
              textDecoration: 'none',
              bg: 'gray.700',
              color: 'white',
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
    <Box as="section" bg="gray.50" _dark={{ bg: "gray.700" }} minH="100vh">
      <SidebarContent display={{ base: 'none', md: 'unset' }} />
      
      <Drawer isOpen={isOpen} placement="left" onClose={onClose} returnFocusOnClose={false}>
        <DrawerOverlay />
        <DrawerContent bg="gray.800" color="white">
          <DrawerCloseButton />
          <DrawerHeader 
            borderBottomWidth="1px" 
            borderColor="gray.700" 
            as={RouterLink} 
            to="/dashboard" 
            _hover={{textDecoration: 'none'}}
            display="flex"      
            alignItems="center" 
            justifyContent="center"
            py="3" 
          >
            {/* You might want to make this logo larger too if the sidebar one is now much larger */}
            <Image src="/logo.png" alt="Tees From The Past Logo" maxH="50px" objectFit="contain" /> 
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
          bg="white"
          _dark={{ bg: 'gray.800' }}
          borderBottomWidth="1px"
          borderColor="blackAlpha.300"
          color="inherit"
          h="14" // Top bar has a fixed height
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
              {/* This logo is constrained by the top bar's height of "14" (56px) */}
              <Image 
                src="/logo.png" 
                alt="Tees From The Past Logo" 
                h="40px" // Max practical height here is around 40-45px with padding
                objectFit="contain"
              />
            </ChakraLink>
          </Flex>
          
          <Flex align="center">
            <LogoutButton />
          </Flex>
        </Flex>

        <Box as="main" p="4">
          {children}
        </Box>
      </Box>
    </Box>
  );
}
