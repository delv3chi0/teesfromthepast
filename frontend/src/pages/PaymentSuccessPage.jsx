// frontend/src/pages/PaymentSuccessPage.jsx
import { Box, Heading, Text, VStack, Button, Icon } from '@chakra-ui/react';
import { CheckCircleIcon } from '@chakra-ui/icons';
import { Link as RouterLink } from 'react-router-dom';

export default function PaymentSuccessPage() {
    return (
        <Box textAlign="center" py={10} px={6} mt={10}>
            <Icon as={CheckCircleIcon} boxSize={'50px'} color={'green.500'} />
            <Heading as="h2" size="xl" mt={6} mb={2} color="brand.textLight">
                Payment Successful!
            </Heading>
            <Text color={'brand.textTeal'} fontSize="lg">
                Thank you for your order. Your retro tee is on its way (metaphorically)!
            </Text>
            <Button
                mt={8}
                as={RouterLink}
                to="/my-designs" // Or to an order history page later
                bg="brand.accentYellow"
                color="brand.textDark"
                _hover={{ bg: 'brand.accentYellowHover' }}
                borderRadius="full"
                px={8}
                py={6}
            >
                View My Designs
            </Button>
        </Box>
    );
}
