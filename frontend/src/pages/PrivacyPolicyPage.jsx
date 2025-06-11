// frontend/src/pages/PrivacyPolicyPage.jsx

import React from 'react';
import { Container, Heading, Text, VStack, Link as ChakraLink, UnorderedList, ListItem, Divider, Icon } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';

/**
 * Privacy Policy Page
 * REFRACTORED:
 * - Removed redundant outer Box to allow MainLayout to control the page background and padding.
 * - Wrapped content in a <Container> to apply a constrained width for readability, following the hybrid layout strategy.
 * - Updated text colors from 'brand.textDark' to 'brand.textLight' to ensure contrast against the site's dark theme.
 * - Updated link colors to use 'brand.accentYellow' for better visibility.
 */
const PrivacyPolicyPage = () => {
  return (
    <Container maxW="container.lg" py={{ base: 6, md: 12 }}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="2xl" textAlign="center" color="brand.textLight" mb={4}>
          Privacy Policy
        </Heading>
        <Text color="brand.textLight" fontSize="sm" textAlign="center" opacity={0.7}>
          Last Updated: June 10, 2025
        </Text>

        <Text bg="yellow.400" color="black" p={4} borderRadius="md" fontWeight="bold">
          IMPORTANT: This is a general template and NOT a complete or legally binding Privacy Policy. You MUST consult with a legal professional to create a policy tailored to your specific business practices, data handling for TeesFromThePast.com (including AI generation, e-commerce, Stripe, SendGrid), and all applicable legal requirements (e.g., GDPR, CCPA).
        </Text>

        <Divider my={4} borderColor="whiteAlpha.300" />

        <Text color="brand.textLight">
          Welcome to TeesFromThePast.com (the "Site"). We are committed to protecting your privacy. This Privacy Policy explains how TeesFromThePast ("we," "us," or "our") collects, uses, discloses, and safeguards your information when you visit our website and use our services, including our AI image generator and e-commerce platform. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
        </Text>

        <Heading as="h2" size="lg" color="brand.textLight" mt={4} mb={2}>1. Information We Collect</Heading>
        <Text color="brand.textLight">We may collect information about you in a variety of ways. The information we may collect on the Site includes:</Text>
        <UnorderedList spacing={3} pl={6} color="brand.textLight">
          <ListItem>
            <Text as="strong">Personal Data:</Text> When you register, make a purchase, or use certain features, we collect personally identifiable information you voluntarily provide, such as your name, username, email address, shipping address, billing address, and phone number.
            <Text as="em" display="block" mt={1} opacity={0.8} fontSize="sm">[You must list ALL types of personal data accurately: e.g., What specific payment info do you handle, even if processed by Stripe? Details about user-generated content like AI prompts and resulting designs, IP addresses, browser type, device information, etc.]</Text>
          </ListItem>
          <ListItem>
            <Text as="strong">Derivative Data:</Text> Information our servers automatically collect, such as your IP address, browser type, operating system, access times, and the pages you view.
            <Text as="em" display="block" mt={1} opacity={0.8} fontSize="sm">[Detail any analytics, cookies, or tracking technologies used and what they collect.]</Text>
          </ListItem>
          <ListItem>
            <Text as="strong">Financial Data:</Text> We use Stripe for payment processing. We do not directly store your full credit card information. Stripe handles this securely. We may store transaction identifiers or partial payment information for order fulfillment and record-keeping. Please review Stripe's Privacy Policy.
            <Text as="em" display="block" mt={1} opacity={0.8} fontSize="sm">[Be precise about what financial data, if any, touches your systems.]</Text>
          </ListItem>
          <ListItem>
            <Text as="strong">Data from AI Image Generation:</Text> Prompts you submit to our AI image generator and the images that are generated as a result.
            <Text as="em" display="block" mt={1} opacity={0.8} fontSize="sm">[Crucially, specify: How is this data used by you? How is it stored? Is it shared with the AI provider (e.g., Stability AI)? What are their terms and privacy policies regarding this data? What rights do users have over these prompts and images in relation to your service?]</Text>
          </ListItem>
          <ListItem>
            <Text as="strong">Communication Data:</Text> If you contact us (e.g., via the contact form), we will collect your name, email address, and the content of your message.
          </ListItem>
        </UnorderedList>

        <Heading as="h2" size="lg" color="brand.textLight" mt={6} mb={2}>2. How We Use Your Information</Heading>
        <Text color="brand.textLight">We use the information we collect for purposes such as:</Text>
        <UnorderedList spacing={2} pl={6} color="brand.textLight">
          <ListItem>Creating and managing your account.</ListItem>
          <ListItem>Processing orders, payments, and delivering products.</ListItem>
          <ListItem>Operating and improving the AI image generation service.</ListItem>
          <ListItem>Communicating with you about your account, orders, or inquiries (including password reset emails via SendGrid).</ListItem>
          <ListItem>Administering contests and promotions.</ListItem>
          <ListItem>Improving our website, services, and user experience.</ListItem>
          <ListItem>Ensuring security, preventing fraud, and enforcing our Terms of Service.</ListItem>
          <ListItem>Complying with legal obligations.</ListItem>
          <ListItem><Text as="em">[List ALL specific uses of data. Be thorough.]</Text></ListItem>
        </UnorderedList>

        <Heading as="h2" size="lg" color="brand.textLight" mt={6} mb={2}>3. Disclosure of Your Information</Heading>
        <Text color="brand.textLight">We may share your information in certain situations:</Text>
        <UnorderedList spacing={2} pl={6} color="brand.textLight">
          <ListItem><strong>With Service Providers:</strong> We share information with third-party vendors and service providers who perform services for us or on our behalf, such as payment processing (Stripe), email delivery (SendGrid), AI model providers (e.g., Stability AI - specify what is shared), web hosting, data analysis, and customer service. These providers will only have access to the information necessary to perform their functions and are obligated to protect your information.</ListItem>
          <ListItem><strong>By Law or to Protect Rights:</strong> If required by law or if we believe in good faith that disclosure is necessary to protect our rights, your safety or the safety of others, investigate fraud, or respond to a government request.</ListItem>
          <ListItem><strong>Business Transfers:</strong> In connection with any merger, sale of company assets, financing, or acquisition of all or a portion of our business by another company.</ListItem>
          <ListItem><Text as="em">[Specify any other circumstances under which data might be shared.]</Text></ListItem>
        </UnorderedList>

        {/* ----- SECTIONS TO BE DETAILED BY YOU (WITH LEGAL COUNSEL) ----- */}
        <Heading as="h2" size="lg" color="brand.textLight" mt={6} mb={2}>4. Tracking Technologies (Cookies)</Heading>
        <Text as="em" color="brand.textLight" opacity={0.8}>[Describe your use of cookies, web beacons, and other tracking technologies. What types of cookies? What for? How can users manage them?]</Text>

        <Heading as="h2" size="lg" color="brand.textLight" mt={6} mb={2}>5. Data Security</Heading>
        <Text as="em" color="brand.textLight" opacity={0.8}>[Describe the security measures you take to protect user data. Be realistic and don't overstate. Mention that no system is 100% secure.]</Text>

        <Heading as="h2" size="lg" color="brand.textLight" mt={6} mb={2}>6. Data Retention</Heading>
        <Text as="em" color="brand.textLight" opacity={0.8}>[How long do you keep different types of personal data? Explain your policy.]</Text>

        <Heading as="h2" size="lg" color="brand.textLight" mt={6} mb={2}>7. Your Privacy Rights</Heading>
        <Text as="em" color="brand.textLight" opacity={0.8}>[Depending on your users' locations, detail their rights, e.g., access, correction, deletion, opt-out of sales (if applicable under CCPA), GDPR rights. How can they exercise these rights?]</Text>

        <Heading as="h2" size="lg" color="brand.textLight" mt={6} mb={2}>8. Policy for Children</Heading>
        <Text as="em" color="brand.textLight" opacity={0.8}>[State whether your service is directed to children under 13 (or 16 in some regions). If so, you have specific COPPA/GDPR obligations. If not, state that you do not knowingly collect information from children.]</Text>
        
        <Heading as="h2" size="lg" color="brand.textLight" mt={6} mb={2}>9. Changes to This Privacy Policy</Heading>
        <Text as="em" color="brand.textLight" opacity={0.8}>[Explain that you may update this policy and how users will be notified.]</Text>
        {/* ----- END OF SECTIONS TO BE DETAILED ----- */}

        <Heading as="h2" size="lg" color="brand.textLight" mt={6} mb={2}>10. Contact Us</Heading>
        <Text color="brand.textLight">
          If you have questions or comments about this Privacy Policy, please contact us at:
          <br />TeesFromThePast.com
          <br />[Your Business Name, if different]
          <br />[Your Physical Address, if applicable for legal notices]
          <br />Email: <ChakraLink href="mailto:privacy@teesfromthepast.com" color="brand.accentYellow" fontWeight="bold" isExternal>privacy@teesfromthepast.com</ChakraLink> <em>(Ensure this email is monitored)</em>
        </Text>

        <Divider my={6} borderColor="whiteAlpha.300" />
        <ChakraLink as={RouterLink} to="/" color="brand.accentYellow" fontWeight="semibold" _hover={{ textDecoration: 'underline' }} display="flex" alignItems="center" justifyContent="center">
          <Icon as={FaHome} mr={2} />
          Back to Home
        </ChakraLink>
      </VStack>
    </Container>
  );
};

export default PrivacyPolicyPage;
