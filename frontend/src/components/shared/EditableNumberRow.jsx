// frontend/src/components/shared/EditableNumberRow.jsx
/**
 * Editable number input row component for admin forms
 */

import React, { useState, useEffect } from 'react';
import {
  HStack,
  Text,
  Input,
  Button,
  IconButton,
  Tooltip,
  FormControl,
  FormErrorMessage,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper
} from '@chakra-ui/react';
import { FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

/**
 * EditableNumberRow component for inline number editing
 * @param {Object} props
 * @param {string} props.label - Field label
 * @param {number} props.value - Current value
 * @param {Function} props.onSave - Callback when value is saved: (newValue) => void
 * @param {number} [props.min] - Minimum value (default: 1)
 * @param {number} [props.max] - Maximum value
 * @param {number} [props.step] - Step size (default: 1)
 * @param {string} [props.unit] - Unit suffix (e.g., 'ms', 'requests')
 * @param {boolean} [props.disabled] - Whether editing is disabled
 * @param {Function} [props.validator] - Custom validator: (value) => string|null
 * @param {string} [props.helpText] - Help text shown as tooltip
 */
export default function EditableNumberRow({
  label,
  value,
  onSave,
  min = 1,
  max,
  step = 1,
  unit = '',
  disabled = false,
  validator,
  helpText
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState('');

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const validateValue = (val) => {
    if (val === undefined || val === null || val === '') {
      return 'Value is required';
    }
    
    const num = Number(val);
    if (isNaN(num)) {
      return 'Must be a valid number';
    }
    
    if (num < min) {
      return `Must be at least ${min}`;
    }
    
    if (max !== undefined && num > max) {
      return `Must be at most ${max}`;
    }
    
    if (validator) {
      return validator(num);
    }
    
    return null;
  };

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value);
    setError('');
  };

  const handleSave = () => {
    const validationError = validateValue(editValue);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    const numValue = Number(editValue);
    onSave(numValue);
    setIsEditing(false);
    setError('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setError('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const displayValue = `${value.toLocaleString()}${unit ? ` ${unit}` : ''}`;

  if (isEditing) {
    return (
      <FormControl isInvalid={!!error}>
        <HStack justify="space-between" align="start" spacing={3}>
          <Text fontSize="sm" fontWeight="medium" color="gray.700" minW="120px">
            {label}
          </Text>
          
          <HStack spacing={2} flex={1}>
            <NumberInput
              value={editValue}
              onChange={(valueString, valueNumber) => {
                setEditValue(valueNumber);
                setError('');
              }}
              onKeyDown={handleKeyPress}
              min={min}
              max={max}
              step={step}
              size="sm"
              flex={1}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            
            {unit && (
              <Text fontSize="sm" color="gray.600" minW="fit-content">
                {unit}
              </Text>
            )}
            
            <Tooltip label="Save" hasArrow>
              <IconButton
                size="sm"
                colorScheme="green"
                icon={<FaCheck />}
                onClick={handleSave}
                aria-label="Save"
              />
            </Tooltip>
            
            <Tooltip label="Cancel" hasArrow>
              <IconButton
                size="sm"
                variant="ghost"
                icon={<FaTimes />}
                onClick={handleCancel}
                aria-label="Cancel"
              />
            </Tooltip>
          </HStack>
        </HStack>
        
        {error && (
          <FormErrorMessage mt={1} ml="120px">
            {error}
          </FormErrorMessage>
        )}
      </FormControl>
    );
  }

  return (
    <HStack justify="space-between" align="center" spacing={3}>
      <Text fontSize="sm" fontWeight="medium" color="gray.700" minW="120px">
        {label}
      </Text>
      
      <HStack spacing={2} flex={1} justify="flex-end">
        <Tooltip label={helpText} hasArrow isDisabled={!helpText}>
          <Text fontSize="sm" fontFamily="mono" fontWeight="medium">
            {displayValue}
          </Text>
        </Tooltip>
        
        {!disabled && (
          <Tooltip label="Edit" hasArrow>
            <IconButton
              size="sm"
              variant="ghost"
              icon={<FaEdit />}
              onClick={handleStartEdit}
              aria-label="Edit"
            />
          </Tooltip>
        )}
      </HStack>
    </HStack>
  );
}