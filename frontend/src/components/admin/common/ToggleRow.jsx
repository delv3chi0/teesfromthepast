// frontend/src/components/admin/common/ToggleRow.jsx
// Toggle switch row for admin configuration toggles
import React from 'react';
import {
  HStack,
  Text,
  Switch,
  Badge,
  Tooltip,
  VStack,
  Box
} from '@chakra-ui/react';

/**
 * ToggleRow - Toggle switch with label and description
 */
export default function ToggleRow({
  label,
  value,
  onChange,
  disabled = false,
  description = null,
  tooltip = null,
  colorScheme = "green",
  size = "md",
  showBadge = true
}) {
  const isEnabled = value === true;
  const isDisabled = disabled || value === null;

  return (
    <Box py={2}>
      <HStack spacing={4} align="start">
        <VStack align="start" spacing={1} flex={1}>
          <HStack spacing={3}>
            <Text fontWeight="medium" fontSize="md">
              {label}
            </Text>
            {showBadge && (
              <Badge 
                colorScheme={value === null ? 'gray' : isEnabled ? 'green' : 'red'}
                size="sm"
              >
                {value === null ? 'Default' : isEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            )}
          </HStack>
          
          {description && (
            <Text fontSize="sm" color="gray.600" maxW="400px">
              {description}
            </Text>
          )}
        </VStack>

        <Tooltip label={tooltip || (isDisabled ? 'Using default value' : `Toggle ${label}`)}>
          <Box>
            <Switch
              isChecked={isEnabled}
              onChange={(e) => onChange(e.target.checked)}
              isDisabled={isDisabled}
              colorScheme={colorScheme}
              size={size}
            />
          </Box>
        </Tooltip>
      </HStack>
    </Box>
  );
}