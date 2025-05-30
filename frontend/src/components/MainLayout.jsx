// frontend/src/components/MainLayout.jsx
import { Box, Flex, VStack, Link as ChakraLink, IconButton, useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody, Image, Avatar, HStack, Icon, Spacer } from '@chakra-ui/react'; // Added Spacer import
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
  { label: '🏆 Vote Now!', path: '/vote-now' },
  { label: 'My Profile', path: '/profile' },
];

export default function MainLayout({ children }) {
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user } = useAuth();

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
        <Box 
          display={{ base: 'none', md: 'block' }} 
        >
          <SidebarContent /> 
        </Box>
        
        <Drawer isOpen={isOpen} placement="left" onClose={onClose} returnFocusOnClose={false}>
          <DrawerOverlay />
          <DrawerContent bg="brand.primary" color="brand.textLight"> 
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
        
        <Box flexGrow={1} ml={{ base: 0, md: 60 }} transition=".3s ease" display="flex" flexDirection="column">
          <Flex
            as="header"
            align="center"
            // justify="space-between" // Spacer will handle this now
            w="full"
            px={6} py={3} 
            bg="brand.secondary" 
            borderBottomWidth="1px"
            borderColor="brand.primaryDark" 
            color="brand.textDark"     
            h="auto" minH="14"
            flexShrink={0}
          >
            <Flex align="center"> {/* Left Group */}
              <IconButton 
                aria-label="Open Menu" 
                display={{ base: 'inline-flex', md: 'none' }} 
                onClick={onOpen} 
                icon={<HamburgerIcon />} 
                size="md" 
                variant="ghost" 
                mr={2} 
                color="brand.primaryDark"
                _hover={{ bg: 'brand.primaryLight' }}
              />
              <ChakraLink as={RouterLink} to="/dashboard" display="flex" alignItems="center" _hover={{textDecoration: "none"}}>
                <Image 
                  src="/logo-text.png" 
                  alt="Tees From The Past Title Logo" 
                  h="50px" 
                  objectFit="contain"
                />
              </ChakraLink>
            </Flex>

            <Spacer /> {/* This will push the left and right groups apart */}

            <Flex align="center"> {/* Right Group */}
              {user && (
                <ChakraLink as={RouterLink} to="/profile" mr={4}>
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
