import { Box, Text, HStack, Link as ChakraLink, Icon, VStack, Divider, Tooltip, IconButton } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaFacebookF, FaTwitter, FaInstagram } from 'react-icons/fa';

export default function Footer() {
  return (
    <Box
      as="footer"
      textAlign="center"
      py={6}
      px={4}
      // MODIFIED: Using a defined color from your theme for consistency
      bg="brand.secondary" 
      color="brand.textMuted" // Using muted text for a softer look
    >
      <VStack spacing={4}>
        <HStack spacing={{base: 4, md: 8}} fontSize={{base: "xs", md: "sm"}} flexWrap="wrap" justifyContent="center">
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

        {/* MODIFIED: Using a more subtle divider */}
        <Divider width="60%" maxW="400px" borderColor="whiteAlpha.300" />

        <HStack spacing={5} justify="center">
          {/* MODIFIED: Using IconButton for better accessibility and hover effect */}
          <Tooltip label="Facebook">
            <IconButton
              as="a"
              href="https://facebook.com" // Replace with your URL
              target="_blank"
              aria-label="Facebook"
              icon={<FaFacebookF />}
              isRound
              variant="ghost"
              _hover={{ bg: 'whiteAlpha.200', color: 'brand.textLight' }}
            />
          </Tooltip>
          <Tooltip label="Twitter">
            <IconButton
              as="a"
              href="https://twitter.com" // Replace with your URL
              target="_blank"
              aria-label="Twitter"
              icon={<FaTwitter />}
              isRound
              variant="ghost"
              _hover={{ bg: 'whiteAlpha.200', color: 'brand.textLight' }}
            />
          </Tooltip>
          <Tooltip label="Instagram">
            <IconButton
              as="a"
              href="https://instagram.com" // Replace with your URL
              target="_blank"
              aria-label="Instagram"
              icon={<FaInstagram />}
              isRound
              variant="ghost"
              _hover={{ bg: 'whiteAlpha.200', color: 'brand.textLight' }}
            />
          </Tooltip>
        </HStack>

        <Text fontSize="xs" color="brand.textMuted" mt={2}>
          &copy; {new Date().getFullYear()} Tees From The Past. All Rights Reserved.
        </Text>
      </VStack>
    </Box>
  );
}
