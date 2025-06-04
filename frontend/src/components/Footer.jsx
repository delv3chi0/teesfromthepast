// frontend/src/components/Footer.jsx
import { Box, Text, HStack, Link as ChakraLink, Icon, VStack, Divider } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram } from 'react-icons/fa';

export default function Footer() {
  return (
    <Box
      as="footer"
      textAlign="center"
      py={6}
      px={4}
      bg="brand.primaryDark" // Using primaryDark for potentially deeper footer color
      color="brand.textLight"
    >
      <VStack spacing={4}>
        <HStack spacing={{base: 3, md: 6}} fontSize={{base: "xs", md: "sm"}} flexWrap="wrap" justifyContent="center">
          <ChakraLink as={RouterLink} to="/privacy-policy" _hover={{ textDecoration: "underline", color: "brand.accentYellow" }}>
            Privacy Policy
          </ChakraLink>
          <Text display={{base: "none", md: "inline"}}>|</Text>
          <ChakraLink as={RouterLink} to="/contact" _hover={{ textDecoration: "underline", color: "brand.accentYellow" }}>
            Contact Us
          </ChakraLink>
          <Text display={{base: "none", md: "inline"}}>|</Text>
          <ChakraLink as={RouterLink} to="/terms-of-service" _hover={{ textDecoration: "underline", color: "brand.accentYellow" }}>
            Terms of Service
          </ChakraLink>
        </HStack>

        <Divider width="50%" borderColor="brand.primary" />

        <HStack spacing={5} justify="center" mt={2}>
          <ChakraLink href="https://facebook.com/yourpage" isExternal _hover={{ color: "brand.accentYellow" }} aria-label="Facebook">
            <Icon as={FaFacebook} boxSize={6} />
          </ChakraLink>
          <ChakraLink href="https://twitter.com/yourprofile" isExternal _hover={{ color: "brand.accentYellow" }} aria-label="Twitter">
            <Icon as={FaTwitter} boxSize={6} />
          </ChakraLink>
          <ChakraLink href="https://instagram.com/yourprofile" isExternal _hover={{ color: "brand.accentYellow" }} aria-label="Instagram">
            <Icon as={FaInstagram} boxSize={6} />
          </ChakraLink>
        </HStack>

        <Text fontSize="sm" mt={2}>
          &copy; {new Date().getFullYear()} TeesFromThePast.com. All Rights Reserved.
        </Text>
      </VStack>
    </Box>
  );
}
