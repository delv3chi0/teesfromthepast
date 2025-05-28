// frontend/src/components/MainLayout.jsx
import { Box, Flex, VStack, Link as ChakraLink, Text, IconButton, useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody, Image, Avatar, HStack, Divider as ChakraDivider } from '@chakra-ui/react'; // Added Avatar, HStack, ChakraDivider
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'; // Added useNavigate
import { HamburgerIcon } from '@chakra-ui/icons';
import LogoutButton from './LogoutButton';
import { useAuth } from '../context/AuthProvider'; // To get user for Avatar
import { FaFacebook, FaTwitter, FaInstagram } from 'react-icons/fa'; // Example social icons

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'AI Image Generator', path: '/generate' },
  { label: 'My Saved Designs', path: '/my-designs' },
  { label: 'Customize My Shirt', path: '/product-studio' },
  { label: '🏆 Vote Now!', path: '/vote-now' },
  { label: 'My Profile', path: '/profile' },
];

export default function MainLayout({ children }) {
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user } = useAuth(); // Get user for Avatar name/initials
  const navigate = useNavigate();

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
      bg="brand.primary" 
      borderColor="brand.primaryDark" 
      borderRightWidth="1px"
      w="60" 
    >
      <Flex 
        as={RouterLink} 
        to="/dashboard" 
        px="4"        
        py="4"        
        align="center" 
        justifyContent="center" 
        _hover={{ bg: 'brand.primaryLight', textDecoration: 'none' }}
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
            _hover={{
              textDecoration: 'none',
              bg: 'brand.primaryLight', 
              color: 'brand.accentYellow',    
            }}
            onClick={onClick} // For mobile drawer
          >
            {item.label}
          </ChakraLink>
        ))}
      </VStack>
    </Box>
  );

  return (
    <Flex direction="column" minH="100vh"> {/* Changed to Flex direction column */}
      <Box as="section" flexGrow={1}> {/* Allows main content to grow */}
        <SidebarContent display={{ base: 'none', md: 'unset' }} />
        
        <Drawer isOpen={isOpen} placement="left" onClose={onClose} returnFocusOnClose={false}>
          <DrawerOverlay />
          <DrawerContent bg="brand.primary" color="brand.textLight"> 
            <DrawerCloseButton />
            <DrawerHeader 
              borderBottomWidth="1px" 
              borderColor="brand.primaryDark" 
              as={RouterLink} 
              to="/dashboard" 
              _hover={{textDecoration: 'none'}}
              display="flex"      
              alignItems="center" 
              justifyContent="center"
              py="2.5" 
            >
              <Image src="/logo.png" alt="Tees From The Past Logo" maxH="50px" objectFit="contain"/> 
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
            px={6} // Increased padding slightly
            py={3} // Adjusted py for consistent vertical rhythm
            bg="brand.secondary" 
            borderBottomWidth="1px"
            borderColor="brand.primaryDark" 
            color="brand.textDark"     
            h="auto" // Allow height to adjust to content a bit more
            minH="14" // Keep a minimum height
          >
            <Flex align="center">
              <IconButton
                aria-label="Open Menu"
                display={{ base: 'inline-flex', md: 'none' }}
                onClick={onOpen}
                icon={<HamburgerIcon />}
                size="md" // Slightly larger hamburger
                variant="ghost"
                mr={2} 
              />
              <ChakraLink as={RouterLink} to="/dashboard" display="flex" alignItems="center" _hover={{textDecoration: "none"}}>
                <Image 
                  src="/logo-text.png" 
                  alt="Tees From The Past Title Logo" 
                  h="48px" // Kept at 48px, can be adjusted
                  objectFit="contain"
                  mr={3} // Margin between image logo and text title
                />
                {/* ADDED Text Site Title */}
                <Text fontSize="xl" fontWeight="bold" color="brand.primaryDark" display={{ base: 'none', lg: 'block' }}>
                  Tees From The Past
                </Text>
              </ChakraLink>
            </Flex>
            
            <Flex align="center">
              {/* ADDED User Avatar */}
              {user && (
                <ChakraLink as={RouterLink} to="/profile" mr={4}>
                  <Avatar 
                    size="sm" 
                    name={user.username || user.email} 
                    src={user.avatarUrl || ''} // If you add avatarUrl to your user model later
                    bg="brand.primaryDark" 
                    color="brand.textLight"
                  />
                </ChakraLink>
              )}
              <LogoutButton /> 
            </Flex>
          </Flex>

          <Box 
            as="main" 
            p={{base: 4, md: 6}} // Responsive padding
            bg="brand.accentOrange"
            flexGrow={1} // Ensure main content takes available space if footer is at bottom
          > 
            {children}
          </Box>
        </Box>
      </Box>

      {/* ADDED FOOTER */}
      <Box 
        as="footer" 
        textAlign="center" 
        py={6} // Increased padding
        px={4}
        bg="brand.primary" // Dark brown footer
        color="brand.textLight" // Light text for footer
      >
        <Text fontSize="sm" mb={2}>
          © {new Date().getFullYear()} Tees From The Past. All rights reserved.
        </Text>
        <HStack spacing={4} justify="center" fontSize="sm">
          <ChakraLink as={RouterLink} to="/privacy-policy" _hover={{textDecoration: "underline"}}>Privacy Policy</ChakraLink>
          <Text>|</Text>
          <ChakraLink as={RouterLink} to="/contact" _hover={{textDecoration: "underline"}}>Contact Us</ChakraLink>
        </HStack>
        <HStack spacing={5} justify="center" mt={3}>
          <ChakraLink href="https://facebook.com" isExternal><Icon as={FaFacebook} boxSize={5} /></ChakraLink>
          <ChakraLink href="https://twitter.com" isExternal><Icon as={FaTwitter} boxSize={5} /></ChakraLink>
          <ChakraLink href="https://instagram.com" isExternal><Icon as={FaInstagram} boxSize={5} /></ChakraLink>
        </HStack>
      </Box>
    </Flex>
  );
}
