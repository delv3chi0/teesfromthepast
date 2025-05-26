// frontend/src/components/MainLayout.jsx
import { Box, Flex, VStack, Link as ChakraLink, Text, Spacer, IconButton, useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { HamburgerIcon } from '@chakra-ui/icons'; // For mobile menu
import LogoutButton from './LogoutButton'; // Assuming LogoutButton is in components folder
// If LogoutButton is elsewhere, adjust the import path, e.g., import LogoutButton from '../components/LogoutButton';


// Navigation items
const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'AI Image Generator', path: '/generate' },
  { label: 'My Saved Designs', path: '/my-designs' },
  { label: 'My Profile', path: '/profile' },
  // Add other main navigation links here later if needed
];

export default function MainLayout({ children }) {
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure(); // For mobile drawer

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
      w="60" // width of the sidebar
    >
      <Flex px="4" py="5" align="center">
        {/* We'll add the logo here later */}
        <Text fontSize="2xl" ml="2" color="white" fontWeight="semibold">
          TeesFT P(ast)
        </Text>
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
            color={location.pathname === item.path ? "teal.300" : "gray.300"}
            bg={location.pathname === item.path ? "teal.700" : "transparent"}
            _hover={{
              textDecoration: 'none',
              bg: 'gray.700',
              color: 'white',
            }}
            onClick={onClick} // To close drawer on mobile after click
          >
            {item.label}
          </ChakraLink>
        ))}
      </VStack>
    </Box>
  );

  return (
    <Box as="section" bg="gray.50" _dark={{ bg: "gray.700" }} minH="100vh">
      {/* Sidebar for larger screens */}
      <SidebarContent display={{ base: 'none', md: 'unset' }} />

      {/* Mobile Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose} returnFocusOnClose={false}>
        <DrawerOverlay />
        <DrawerContent bg="gray.800" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor="gray.700">
            Tees From The Past
          </DrawerHeader>
          <DrawerBody>
            <SidebarContent onClick={onClose}/>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Box ml={{ base: 0, md: 60 }} transition=".3s ease"> {/* Adjust margin for sidebar width */}
        <Flex
          as="header"
          align="center"
          justify="space-between" // Changed to space-between
          w="full"
          px="4"
          bg="white"
          _dark={{ bg: 'gray.800' }}
          borderBottomWidth="1px"
          borderColor="blackAlpha.300"
          color="inherit"
          h="14"
        >
          <IconButton
            aria-label="Menu"
            display={{ base: 'inline-flex', md: 'none' }} // Show only on mobile
            onClick={onOpen}
            icon={<HamburgerIcon />}
            size="sm"
          />
          {/* Logo placeholder for larger screens (if different from sidebar) or other top bar content */}
          <Box display={{ base: 'none', md: 'block' }}>
            {/* You can put a smaller version of logo or title here if needed */}
          </Box>

          <Spacer display={{ base: 'none', md: 'block' }} /> {/* Pushes logout to the right on larger screens */}

          <Flex align="center">
            <LogoutButton />
          </Flex>
        </Flex>

        <Box as="main" p="4"> {/* This is where the page content will go */}
          {children}
        </Box>
      </Box>
    </Box>
  );
}
