// frontend/src/components/admin/common/SectionCard.jsx
// Reusable card component for admin sections

import React from 'react';
import { Box, Heading, VStack } from '@chakra-ui/react';

const SectionCard = ({ 
  title, 
  children, 
  padding = { base: 4, md: 6 },
  layerStyle = "cardBlue",
  ...props 
}) => {
  return (
    <Box
      layerStyle={layerStyle}
      w="100%"
      p={padding}
      borderRadius="md"
      shadow="sm"
      {...props}
    >
      {title && (
        <Heading size="md" mb={4} color="brand.primary">
          {title}
        </Heading>
      )}
      <VStack spacing={4} align="stretch">
        {children}
      </VStack>
    </Box>
  );
};

export default SectionCard;