// frontend/src/components/shared/ToggleRow.jsx
/**
 * Toggle switch row component for boolean configuration values
 */

import React from 'react';
import {
  HStack,
  Text,
  Switch,
  Tooltip,
  FormControl,
  FormLabel,
  Badge
} from '@chakra-ui/react';

/**
 * ToggleRow component for boolean configuration options
 * @param {Object} props
 * @param {string} props.label - Field label
 * @param {boolean} props.value - Current boolean value
 * @param {Function} props.onChange - Callback when value changes: (newValue) => void
 * @param {boolean} [props.disabled] - Whether toggle is disabled
 * @param {string} [props.helpText] - Help text shown as tooltip
 * @param {string} [props.trueLabel] - Label when value is true (default: 'Enabled')
 * @param {string} [props.falseLabel] - Label when value is false (default: 'Disabled')
 * @param {string} [props.colorScheme] - Chakra color scheme for switch (default: 'blue')
 */
export default function ToggleRow({
  label,
  value,
  onChange,
  disabled = false,
  helpText,
  trueLabel = 'Enabled',
  falseLabel = 'Disabled',
  colorScheme = 'blue'
}) {
  const handleChange = (e) => {
    if (!disabled) {
      onChange(e.target.checked);
    }
  };

  return (
    <FormControl>
      <HStack justify="space-between" align="center" spacing={3}>
        <FormLabel 
          fontSize="sm" 
          fontWeight="medium" 
          color="gray.700" 
          mb={0}
          minW="120px"
          cursor={disabled ? 'not-allowed' : 'pointer'}
        >
          {label}
        </FormLabel>
        
        <HStack spacing={3} flex={1} justify="flex-end">
          <Badge 
            colorScheme={value ? 'green' : 'gray'}
            variant="subtle"
            fontSize="xs"
          >
            {value ? trueLabel : falseLabel}
          </Badge>
          
          <Tooltip 
            label={helpText} 
            hasArrow 
            isDisabled={!helpText}
            placement="top"
            maxW="300px"
          >
            <Switch
              isChecked={value}
              onChange={handleChange}
              isDisabled={disabled}
              colorScheme={colorScheme}
              size="md"
            />
          </Tooltip>
        </HStack>
      </HStack>
    </FormControl>
  );
}