// frontend/src/components/admin/common/EditableNumberRow.jsx
// Component for editable number inputs with labels and validation

import React, { useState, useEffect } from 'react';
import { 
  HStack, 
  Text, 
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  IconButton,
  Tooltip,
  FormControl,
  FormErrorMessage
} from '@chakra-ui/react';
import { FaInfoCircle } from 'react-icons/fa';

const EditableNumberRow = ({ 
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  helpText,
  placeholder,
  isInvalid,
  errorMessage,
  isRequired = false,
  isDisabled = false,
  precision = 0,
  ...props 
}) => {
  const [localValue, setLocalValue] = useState(value || 0);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (value !== undefined && value !== localValue && !isDirty) {
      setLocalValue(value);
    }
  }, [value, localValue, isDirty]);

  const handleChange = (valueString, valueNumber) => {
    setLocalValue(valueNumber);
    setIsDirty(true);
    if (onChange) {
      onChange(valueNumber);
    }
  };

  const handleBlur = () => {
    setIsDirty(false);
  };

  return (
    <FormControl isInvalid={isInvalid} isRequired={isRequired} {...props}>
      <HStack spacing={4} align="start">
        <HStack spacing={2} minW="200px" flexShrink={0}>
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
        
        <NumberInput
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          min={min}
          max={max}
          step={step}
          precision={precision}
          isDisabled={isDisabled}
          flex={1}
          maxW="200px"
        >
          <NumberInputField placeholder={placeholder} />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </HStack>
      
      {isInvalid && errorMessage && (
        <FormErrorMessage>{errorMessage}</FormErrorMessage>
      )}
    </FormControl>
  );
};

export default EditableNumberRow;