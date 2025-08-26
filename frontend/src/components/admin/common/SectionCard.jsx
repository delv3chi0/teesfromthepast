// frontend/src/components/admin/common/SectionCard.jsx
import { Box, Heading, VStack } from '@chakra-ui/react';

/**
 * Reusable card component for admin sections
 */
export default function SectionCard({ title, children, ...props }) {
  return (
    <Box
      bg="white"
      borderRadius="lg"
      border="1px"
      borderColor="gray.200"
      p={4}
      shadow="sm"
      {...props}
    >
      {title && (
        <Heading size="sm" mb={4} color="gray.700">
          {title}
        </Heading>
      )}
      <VStack align="stretch" spacing={3}>
        {children}
      </VStack>
    </Box>
  );
}