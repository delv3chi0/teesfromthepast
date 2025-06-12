import { Box, Flex, HStack, Link as ChakraLink, Button, Icon, Menu, MenuButton, MenuList, MenuItem, MenuDivider, Image } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthProvider';

const MainLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <Flex direction="column" minH="100vh" bg="brand.primary">
            <Box
                as="header"
                bg="brand.secondary"
                px={{ base: 4, md: 8 }}
                py={3}
                shadow="md"
                position="sticky"
                top={0}
                zIndex="sticky"
            >
                <Flex h={16} alignItems="center" justifyContent="space-between" maxW="8xl" mx="auto">
                    <RouterLink to="/">
                        {/* MODIFIED: Using the correct logo 'logo-text.png' from the public folder */}
                        <Image src="/logo-text.png" alt="Tees From The Past Logo" height="45px" objectFit="contain" />
                    </RouterLink>

                    <HStack spacing={8} alignItems="center">
                        <HStack as="nav" spacing={6} display={{ base: 'none', md: 'flex' }}>
                            <ChakraLink as={RouterLink} to="/shop" _hover={{ color: 'brand.accentYellow' }}>Shop</ChakraLink>
                            <ChakraLink as={RouterLink} to="/generate" _hover={{ color: 'brand.accentYellow' }}>Create</ChakraLink>
                            <ChakraLink as={RouterLink} to="/vote-now" _hover={{ color: 'brand.accentYellow' }}>Vote</ChakraLink>
                        </HStack>
                        <HStack spacing={4}>
                            {user ? (
                                <Menu>
                                    <MenuButton
                                        as={Button}
                                        rounded="full"
                                        variant="link"
                                        cursor="pointer"
                                        minW={0}
                                        _hover={{ textDecoration: 'none' }}
                                    >
                                        <Icon as={FaUserCircle} boxSize={8} color="brand.textMuted" _hover={{ color: 'brand.textLight' }} />
                                    </MenuButton>
                                    <MenuList bg="brand.cardBlue" borderColor="whiteAlpha.300">
                                        <MenuItem bg="brand.cardBlue" _hover={{ bg: 'whiteAlpha.200' }} onClick={() => navigate('/profile')}>
                                            My Profile
                                        </MenuItem>
                                        <MenuItem bg="brand.cardBlue" _hover={{ bg: 'whiteAlpha.200' }} onClick={() => navigate('/my-orders')}>
                                            My Orders
                                        </MenuItem>
                                        <MenuItem bg="brand.cardBlue" _hover={{ bg: 'whiteAlpha.200' }} onClick={() => navigate('/my-designs')}>
                                            My Designs
                                        </MenuItem>
                                        {user.isAdmin && (
                                            <MenuItem bg="brand.cardBlue" _hover={{ bg: 'whiteAlpha.200' }} onClick={() => navigate('/admin')}>
                                                Admin Console
                                            </MenuItem>
                                        )}
                                        <MenuDivider borderColor="whiteAlpha.300" />
                                        <MenuItem bg="brand.cardBlue" color="red.300" _hover={{ bg: 'red.800', color: 'white' }} onClick={handleLogout}>
                                            Logout
                                        </MenuItem>
                                    </MenuList>
                                </Menu>
                            ) : (
                                <HStack>
                                    <Button variant="ghost" onClick={() => navigate('/login')}>Log In</Button>
                                    <Button colorScheme="brandAccentOrange" onClick={() => navigate('/register')}>
                                        Sign Up
                                    </Button>
                                </HStack>
                            )}
                        </HStack>
                    </HStack>
                </Flex>
            </Box>

            <Box as="main" flex="1" py={8} px={{ base: 4, md: 8 }} maxW="8xl" mx="auto" w="100%">
                {children}
            </Box>

            <Footer />
        </Flex>
    );
};

export default MainLayout;
