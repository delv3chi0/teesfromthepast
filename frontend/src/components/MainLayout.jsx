import { Box, Flex, HStack, Link as ChakraLink, Button, Icon, Menu, MenuButton, MenuList, MenuItem, MenuDivider, Image, Tooltip, IconButton as ChakraIconButton } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthProvider';
import Footer from './Footer.jsx'; // MODIFIED: Added the missing import for the Footer

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
                        <Image src="/logo-text.png" alt="Tees From The Past Logo" height="45px" objectFit="contain" />
                    </RouterLink>

                    <HStack spacing={8} alignItems="center">
                        <HStack as="nav" spacing={6} display={{ base: 'none', md: 'flex' }}>
                            {/* Navigation links will inherit brand.textLight from header, hover is accentYellow - looks good */}
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
                                        {/* MODIFIED: Icon color to brand.textLight by default, accentYellow on hover */}
                                        <Icon as={FaUserCircle} boxSize={8} color="brand.textLight" _hover={{ color: 'brand.accentYellow' }} />
                                    </MenuButton>
                                    {/* MODIFIED: MenuList and MenuItem hover states */}
                                    <MenuList bg="brand.cardBlue" borderColor="rgba(0,0,0,0.1)"> {/* MODIFIED: Border color for menu list */}
                                        {/* Menu items will inherit brand.textDark from layerStyle.cardBlue (via MenuList's bg) */}
                                        <MenuItem bg="brand.cardBlue" _hover={{ bg: 'brand.secondary', color: 'brand.textLight' }} onClick={() => navigate('/profile')}> {/* MODIFIED: Hover state */}
                                            My Profile
                                        </MenuItem>
                                        <MenuItem bg="brand.cardBlue" _hover={{ bg: 'brand.secondary', color: 'brand.textLight' }} onClick={() => navigate('/my-orders')}> {/* MODIFIED: Hover state */}
                                            My Orders
                                        </MenuItem>
                                        <MenuItem bg="brand.cardBlue" _hover={{ bg: 'brand.secondary', color: 'brand.textLight' }} onClick={() => navigate('/my-designs')}> {/* MODIFIED: Hover state */}
                                            My Designs
                                        </MenuItem>
                                        {user.isAdmin && (
                                            <MenuItem bg="brand.cardBlue" _hover={{ bg: 'brand.secondary', color: 'brand.textLight' }} onClick={() => navigate('/admin')}> {/* MODIFIED: Hover state */}
                                                Admin Console
                                            </MenuItem>
                                        )}
                                        {/* MODIFIED: MenuDivider color */}
                                        <MenuDivider borderColor="rgba(0,0,0,0.1)" />
                                        {/* MODIFIED: Logout MenuItem color for better visibility on cardBlue background, hover state is good */}
                                        <MenuItem bg="brand.cardBlue" color="red.600" _hover={{ bg: 'red.800', color: 'white' }} onClick={handleLogout}>
                                            Logout
                                        </MenuItem>
                                    </MenuList>
                                </Menu>
                            ) : (
                                <HStack>
                                    {/* Log In button (ghost variant) should inherit brand.textLight from header */}
                                    <Button variant="ghost" onClick={() => navigate('/login')}>Log In</Button>
                                    {/* Sign Up button uses brandAccentOrange, which is consistent */}
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

            <Footer /> {/* Footer component path is correct */}
        </Flex>
    );
};

export default MainLayout;
