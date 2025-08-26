// frontend/src/components/admin/common/SectionCard.jsx
// Reusable section card component for admin console
import React from 'react';
import { Box, Heading, VStack } from '@chakra-ui/react';

const SectionCard = ({ 
  title, 
  children, 
  spacing = 4, 
  headerContent = null,
  ...props 
}) => {
  return (
    <Box
      bg="white"
      borderRadius="lg"
      shadow="md"
      border="1px"
      borderColor="gray.200"
      p={6}
      {...props}
    >
      {(title || headerContent) && (
        <Box mb={spacing} display="flex" justifyContent="space-between" alignItems="center">
          {title && (
            <Heading size="md" color="gray.700">
              {title}
            </Heading>
          )}
          {headerContent}
        </Box>
      )}
      <VStack spacing={spacing} align="stretch">
        {children}
      </VStack>
    </Box>
  );
};

export default SectionCard;