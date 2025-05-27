// frontend/src/components/MainLayout.jsx
import { Box, Flex, VStack, Link as ChakraLink, Text, IconButton, useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody, Image } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { HamburgerIcon } from '@chakra-ui/icons';
import LogoutButton from './LogoutButton';

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
      bg="brand.primary" 
      borderColor="brand.primaryDark" 
      borderRightWidth="1px"
      w="60" 
    >
      <Flex 
        as={RouterLink} 
        to="/dashboard" 
        align="center" 
        justifyContent="center" 
        _hover={{ bg: 'brand.primaryLight', textDecoration: 'none' }}
      >
        <Image 
          src="/logo.png" // This is your main graphical logo for the sidebar
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
            onClick={onClick}
          >
            {item.label}
          </ChakraLink>
        ))}
      </VStack>
    </Box>
  );

  return (
    <Box as="section" minH="100vh"> 
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
            {/* This uses the main graphical logo for the mobile drawer */}
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
          px="4"
          bg="brand.secondary" 
          borderBottomWidth="1px"
          borderColor="brand.primaryDark" 
          color="brand.textDark"     
          h="14" // Top bar height is 56px
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
                src="/logo-text.png" 
                alt="Tees From The Past Title" 
                h="350px" 
                objectFit="contain"
              />
            </ChakraLink>
          </Flex>          
          <Flex align="center">
            <LogoutButton /> 
          </Flex>
        </Flex>

        <Box 
          as="main" 
          p="4" 
          bg="brand.accentOrange"
        > 
          {children}
        </Box>
      </Box>
    </Box>
  );
}
