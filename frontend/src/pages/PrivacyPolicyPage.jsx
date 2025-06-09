// frontend/src/pages/PrivacyPolicyPage.jsx
import React from 'react';
import { Box, Heading, Text, VStack, Link as ChakraLink, UnorderedList, ListItem, Divider, Icon } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';

const PrivacyPolicyPage = () => {
  return (
    <Box bg="brand.accentOrange" minH="100vh" py={{ base: 8, md: 16 }} px={{ base: 4, md: 8 }}>
      <Box maxW="3xl" mx="auto" bg="brand.paper" p={{ base: 6, md: 10 }} borderRadius="xl" boxShadow="xl">
        <VStack spacing={6} align="stretch">
          <Heading as="h1" size="xl" textAlign="center" color="brand.textDark" mb={6}>
            Privacy Policy
          </Heading>
          <Text color="brand.textDark" fontSize="sm" textAlign="center" mb={4}>
            Last Updated: [Insert Date of Last Update Here - e.g., June 3, 2025]
          </Text>

          <Text color="brand.textDark" fontWeight="bold" fontStyle="italic">
            IMPORTANT: This is a general template and NOT a complete or legally binding Privacy Policy. You MUST consult with a legal professional to create a policy tailored to your specific business practices, data handling for TeesFromThePast.com (including AI generation, e-commerce, Stripe, SendGrid), and all applicable legal requirements (e.g., GDPR, CCPA).
          </Text>

          <Divider my={4} />

          <Text color="brand.textDark">
            Welcome to TeesFromThePast.com (the "Site"). We are committed to protecting your privacy. This Privacy Policy explains how TeesFromThePast ("we," "us," or "our") collects, uses, discloses, and safeguards your information when you visit our website and use our services, including our AI image generator and e-commerce platform. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
          </Text>

          <Heading as="h2" size="lg" color="brand.textDark" mt={4} mb={2}>1. Information We Collect</Heading>
          <Text color="brand.textDark">We may collect information about you in a variety of ways. The information we may collect on the Site includes:</Text>
          <UnorderedList spacing={3} pl={6} color="brand.textDark" styleType="disc">
            <ListItem>
              <strong>Personal Data:</strong> When you register, make a purchase, or use certain features, we collect personally identifiable information you voluntarily provide, such as your name, username, email address, shipping address, billing address, and phone number.
              <br /><em>[You must list ALL types of personal data accurately: e.g., What specific payment info do you handle, even if processed by Stripe? Details about user-generated content like AI prompts and resulting designs, IP addresses, browser type, device information, etc.]</em>
            </ListItem>
            <ListItem>
              <strong>Derivative Data:</strong> Information our servers automatically collect, such as your IP address, browser type, operating system, access times, and the pages you view.
              <br /><em>[Detail any analytics, cookies, or tracking technologies used and what they collect.]</em>
            </ListItem>
            <ListItem>
              <strong>Financial Data:</strong> We use Stripe for payment processing. We do not directly store your full credit card information. Stripe handles this securely. We may store transaction identifiers or partial payment information for order fulfillment and record-keeping. Please review Stripe's Privacy Policy.
              <br /><em>[Be precise about what financial data, if any, touches your systems.]</em>
            </ListItem>
             <ListItem>
              <strong>Data from AI Image Generation:</strong> Prompts you submit to our AI image generator and the images that are generated as a result.
              <br /><em>[Crucially, specify: How is this data used by you? How is it stored? Is it shared with the AI provider (e.g., Stability AI)? What are their terms and privacy policies regarding this data? What rights do users have over these prompts and images in relation to your service?]</em>
            </ListItem>
            <ListItem>
              <strong>Communication Data:</strong> If you contact us (e.g., via the contact form), we will collect your name, email address, and the content of your message.
            </ListItem>
          </UnorderedList>

          <Heading as="h2" size="lg" color="brand.textDark" mt={6} mb={2}>2. How We Use Your Information</Heading>
          <Text color="brand.textDark">We use the information we collect for purposes such as:</Text>
          <UnorderedList spacing={2} pl={6} color="brand.textDark" styleType="disc">
            <ListItem>Creating and managing your account.</ListItem>
            <ListItem>Processing orders, payments, and delivering products.</ListItem>
            <ListItem>Operating and improving the AI image generation service.</ListItem>
            <ListItem>Communicating with you about your account, orders, or inquiries (including password reset emails via SendGrid).</ListItem>
            <ListItem>Administering contests and promotions.</ListItem>
            <ListItem>Improving our website, services, and user experience.</ListItem>
            <ListItem>Ensuring security, preventing fraud, and enforcing our Terms of Service.</ListItem>
            <ListItem>Complying with legal obligations.</ListItem>
            <ListItem><em>[List ALL specific uses of data. Be thorough.]</em></ListItem>
          </UnorderedList>

          <Heading as="h2" size="lg" color="brand.textDark" mt={6} mb={2}>3. Disclosure of Your Information</Heading>
           <Text color="brand.textDark">We may share your information in certain situations:</Text>
           <UnorderedList spacing={2} pl={6} color="brand.textDark" styleType="disc">
            <ListItem><strong>With Service Providers:</strong> We share information with third-party vendors and service providers who perform services for us or on our behalf, such as payment processing (Stripe), email delivery (SendGrid), AI model providers (e.g., Stability AI - specify what is shared), web hosting, data analysis, and customer service. These providers will only have access to the information necessary to perform their functions and are obligated to protect your information.</ListItem>
            <ListItem><strong>By Law or to Protect Rights:</strong> If required by law or if we believe in good faith that disclosure is necessary to protect our rights, your safety or the safety of others, investigate fraud, or respond to a government request.</ListItem>
            <ListItem><strong>Business Transfers:</strong> In connection with any merger, sale of company assets, financing, or acquisition of all or a portion of our business by another company.</ListItem>
            <ListItem><em>[Specify any other circumstances under which data might be shared.]</em></ListItem>
          </UnorderedList>

          {/* ----- SECTIONS TO BE DETAILED BY YOU (WITH LEGAL COUNSEL) ----- */}
          <Heading as="h2" size="lg" color="brand.textDark" mt={6} mb={2}>4. Tracking Technologies (Cookies)</Heading>
          <Text color="brand.textDark"><em>[Describe your use of cookies, web beacons, and other tracking technologies. What types of cookies? What for? How can users manage them?]</em></Text>

          <Heading as="h2" size="lg" color="brand.textDark" mt={6} mb={2}>5. Data Security</Heading>
          <Text color="brand.textDark"><em>[Describe the security measures you take to protect user data. Be realistic and don't overstate. Mention that no system is 100% secure.]</em></Text>

          <Heading as="h2" size="lg" color="brand.textDark" mt={6} mb={2}>6. Data Retention</Heading>
          <Text color="brand.textDark"><em>[How long do you keep different types of personal data? Explain your policy.]</em></Text>

          <Heading as="h2" size="lg" color="brand.textDark" mt={6} mb={2}>7. Your Privacy Rights</Heading>
          <Text color="brand.textDark"><em>[Depending on your users' locations, detail their rights, e.g., access, correction, deletion, opt-out of sales (if applicable under CCPA), GDPR rights. How can they exercise these rights?]</em></Text>

          <Heading as="h2" size="lg" color="brand.textDark" mt={6} mb={2}>8. Policy for Children</Heading>
          <Text color="brand.textDark"><em>[State whether your service is directed to children under 13 (or 16 in some regions). If so, you have specific COPPA/GDPR obligations. If not, state that you do not knowingly collect information from children.]</em></Text>
          
          <Heading as="h2" size="lg" color="brand.textDark" mt={6} mb={2}>9. Changes to This Privacy Policy</Heading>
          <Text color="brand.textDark"><em>[Explain that you may update this policy and how users will be notified.]</em></Text>
          {/* ----- END OF SECTIONS TO BE DETAILED ----- */}


          <Heading as="h2" size="lg" color="brand.textDark" mt={6} mb={2}>10. Contact Us</Heading>
          <Text color="brand.textDark">
            If you have questions or comments about this Privacy Policy, please contact us at:
            <br />TeesFromThePast.com
            <br />[Your Business Name, if different]
            <br />[Your Physical Address, if applicable for legal notices]
            <br />Email: <ChakraLink href="mailto:privacy@teesfromthepast.com" color="brand.primaryDark" isExternal>privacy@teesfromthepast.com</ChakraLink> <em>(Ensure this email is monitored)</em>
          </Text>

          <Divider my={6} />
          <ChakraLink as={RouterLink} to="/" color="brand.primaryDark" fontWeight="semibold" _hover={{ color: 'brand.primary' }} display="flex" alignItems="center" justifyContent="center">
            <Icon as={FaHome} mr={2} />
            Back to Home
          </ChakraLink>
        </VStack>
      </Box>
    </Box>
  );
};

export default PrivacyPolicyPage;
