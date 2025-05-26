// frontend/src/components/MainLayout.jsx
import { Box, Flex, VStack, Link as ChakraLink, Text, Spacer, IconButton, useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody, Image } from '@chakra-ui/react'; // Ensure Image is imported
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
      w="60"
    >
      {/* UPDATED Sidebar Header with Logo */}
      <Flex as={RouterLink} to="/dashboard" px="4" py="3" align="center" _hover={{ bg: 'gray.700', textDecoration: 'none' }}>
        <Image src="/logo.png" alt="Tees From The Past Logo" h="40px" mr="3" /> {/* LOGO ADDED HERE */}
        <Text fontSize="xl" color="white" fontWeight="semibold">
          TeesFT P(ast) {/* You can keep or remove this text based on your design preference */}
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
          {/* UPDATED Drawer Header with Logo */}
          <DrawerHeader borderBottomWidth="1px" borderColor="gray.700" as={RouterLink} to="/dashboard" _hover={{textDecoration: 'none'}}>
            <Flex align="center">
              <Image src="/logo.png" alt="Tees From The Past Logo" h="30px" mr="3" /> {/* LOGO ADDED HERE */}
              Tees From The Past
            </Flex>
          </DrawerHeader>
          <DrawerBody>
            <SidebarContent onClick={onClose}/>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Box ml={{ base: 0, md: 60 }} transition=".3s ease">
        {/* UPDATED Top Bar with Logo */}
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
          h="14"
        >
          {/* Left Section: Hamburger for mobile, Logo for larger screens */}
          <Flex align="center">
            <IconButton
              aria-label="Open Menu"
              display={{ base: 'inline-flex', md: 'none' }}
              onClick={onOpen}
              icon={<HamburgerIcon />}
              size="sm"
              variant="ghost"
              mr={2} // Margin between hamburger and logo if both were somehow visible
            />
            <ChakraLink as={RouterLink} to="/dashboard"> {/* Make logo clickable, goes to dashboard */}
              <Image 
                src="/logo.png" 
                alt="Tees From The Past Logo" 
                h="35px" // Adjust height as needed
              />
            </ChakraLink>
          </Flex>
          
          {/* Right Section: Logout Button */}
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
