// frontend/src/components/shared/SectionCard.jsx
/**
 * Reusable section card component for admin panels
 */

import React from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Badge,
  Tooltip,
  Icon
} from '@chakra-ui/react';
import { FaInfoCircle } from 'react-icons/fa';

/**
 * SectionCard component for organizing admin interface sections
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} [props.subtitle] - Optional subtitle
 * @param {React.ReactNode} [props.badge] - Optional badge element (e.g., EPHEMERAL warning)
 * @param {string} [props.helpText] - Optional help text shown on info icon hover
 * @param {React.ReactNode} [props.headerActions] - Optional action buttons in header
 * @param {React.ReactNode} props.children - Section content
 * @param {Object} [props.containerProps] - Additional props for container Box
 */
export default function SectionCard({
  title,
  subtitle,
  badge,
  helpText,
  headerActions,
  children,
  containerProps = {}
}) {
  return (
    <Box
      p={{ base: 4, md: 6 }}
      layerStyle="cardBlue"
      borderRadius="xl"
      shadow="lg"
      w="100%"
      {...containerProps}
    >
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="start" flexWrap="wrap" gap={2}>
          <VStack align="start" spacing={1} flex={1} minW={0}>
            <HStack spacing={3} align="center" flexWrap="wrap">
              <Heading size="md" color="brand.textDark" noOfLines={1}>
                {title}
              </Heading>
              
              {badge && (
                <Box>{badge}</Box>
              )}
              
              {helpText && (
                <Tooltip 
                  label={helpText} 
                  hasArrow 
                  placement="top" 
                  maxW="300px"
                  textAlign="center"
                >
                  <Box cursor="help">
                    <Icon as={FaInfoCircle} color="gray.500" boxSize={4} />
                  </Box>
                </Tooltip>
              )}
            </HStack>
            
            {subtitle && (
              <Heading size="sm" color="gray.600" fontWeight="normal">
                {subtitle}
              </Heading>
            )}
          </VStack>
          
          {headerActions && (
            <Box flexShrink={0}>
              {headerActions}
            </Box>
          )}
        </HStack>
        
        {/* Content */}
        <Box>{children}</Box>
      </VStack>
    </Box>
  );
}