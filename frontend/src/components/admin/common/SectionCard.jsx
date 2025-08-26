// frontend/src/components/admin/common/SectionCard.jsx
// Reusable section card component for admin console
import React from 'react';
import { Box, Heading, VStack, Divider } from '@chakra-ui/react';

/**
 * SectionCard - Consistent layout for admin sections
 */
export default function SectionCard({ 
  title, 
  children, 
  headerActions = null,
  ...boxProps 
}) {
  return (
    <Box 
      p={{ base: 4, md: 6 }} 
      layerStyle="cardBlue" 
      w="100%" 
      borderRadius="lg"
      shadow="sm"
      {...boxProps}
    >
      <VStack spacing={4} align="stretch">
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Heading size="md" color="brand.text">
              {title}
            </Heading>
            {headerActions && (
              <Box>
                {headerActions}
              </Box>
            )}
          </Box>
          <Divider borderColor="brand.accent" opacity={0.3} />
        </Box>
        
        <Box>
          {children}
        </Box>
      </VStack>
    </Box>
  );
}