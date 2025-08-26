// frontend/src/components/admin/common/ToggleRow.jsx
// Component for switch toggles with labels and descriptions

import React from 'react';
import { 
  HStack, 
  VStack,
  Text, 
  Switch,
  IconButton,
  Tooltip,
  FormControl
} from '@chakra-ui/react';
import { FaInfoCircle } from 'react-icons/fa';

const ToggleRow = ({ 
  label,
  description,
  isChecked,
  onChange,
  helpText,
  isDisabled = false,
  colorScheme = "blue",
  size = "md",
  ...props 
}) => {
  return (
    <FormControl {...props}>
      <HStack spacing={4} align="start">
        <VStack spacing={1} align="start" flex={1}>
          <HStack spacing={2}>
            <Text 
              fontSize="sm" 
              fontWeight="medium" 
              color="gray.700"
            >
              {label}
            </Text>
            {helpText && (
              <Tooltip label={helpText} fontSize="sm">
                <IconButton
                  aria-label="Help"
                  icon={<FaInfoCircle />}
                  size="xs"
                  variant="ghost"
                  color="gray.400"
                  _hover={{ color: "gray.600" }}
                />
              </Tooltip>
            )}
          </HStack>
          
          {description && (
            <Text 
              fontSize="xs" 
              color="gray.500"
              lineHeight="1.3"
            >
              {description}
            </Text>
          )}
        </VStack>
        
        <Switch
          isChecked={isChecked}
          onChange={onChange}
          isDisabled={isDisabled}
          colorScheme={colorScheme}
          size={size}
        />
      </HStack>
    </FormControl>
  );
};

export default ToggleRow;