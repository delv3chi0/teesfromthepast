// frontend/src/components/Footer.jsx
import { Box, Text, HStack, Link as ChakraLink, Icon } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram } from 'react-icons/fa';

export default function Footer() {
  return (
    <Box 
      as="footer" 
      textAlign="center" 
      py={3} // Reduced padding from original MainLayout for potentially less content above
      px={4}
      bg="brand.primary" 
      color="brand.textLight" 
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
        <ChakraLink href="https://facebook.com" isExternal _hover={{ color: "brand.accentYellow" }}><Icon as={FaFacebook} boxSize={5} /></ChakraLink>
        <ChakraLink href="https://twitter.com" isExternal _hover={{ color: "brand.accentYellow" }}><Icon as={FaTwitter} boxSize={5} /></ChakraLink>
        <ChakraLink href="https://instagram.com" isExternal _hover={{ color: "brand.accentYellow" }}><Icon as={FaInstagram} boxSize={5} /></ChakraLink>
      </HStack>
    </Box>
  );
}
