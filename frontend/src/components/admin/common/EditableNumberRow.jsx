// frontend/src/components/admin/common/EditableNumberRow.jsx
// Editable number input row for admin configurations
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
  useToast
} from '@chakra-ui/react';
import { FaCheck, FaTimes, FaEdit } from 'react-icons/fa';

/**
 * EditableNumberRow - Inline editable number input with validation
 */
export default function EditableNumberRow({
  label,
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  placeholder = "Enter value",
  disabled = false,
  unit = "",
  tooltip = null,
  width = "120px"
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const toast = useToast();

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    const numValue = Number(editValue);
    
    if (isNaN(numValue)) {
      toast({
        title: "Invalid number",
        description: "Please enter a valid number",
        status: "error",
        duration: 2000,
      });
      return;
    }

    if (numValue < min || numValue > max) {
      toast({
        title: "Value out of range",
        description: `Value must be between ${min} and ${max}`,
        status: "error",
        duration: 2000,
      });
      return;
    }

    onChange(numValue);
    setIsEditing(false);
    
    toast({
      title: "Value updated",
      status: "success",
      duration: 1500,
    });
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const displayValue = value !== null && value !== undefined ? `${value}${unit}` : 'Not set';

  if (isEditing) {
    return (
      <HStack spacing={3} align="center" py={2}>
        <Text fontWeight="medium" minW="120px">
          {label}:
        </Text>
        <NumberInput
          value={editValue}
          onChange={(val) => setEditValue(val)}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          step={step}
          size="sm"
          width={width}
        >
          <NumberInputField placeholder={placeholder} />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
        <HStack spacing={1}>
          <Tooltip label="Save changes">
            <IconButton
              size="sm"
              icon={<FaCheck />}
              colorScheme="green"
              variant="ghost"
              onClick={handleSave}
              aria-label="Save"
            />
          </Tooltip>
          <Tooltip label="Cancel changes">
            <IconButton
              size="sm"
              icon={<FaTimes />}
              colorScheme="red"
              variant="ghost"
              onClick={handleCancel}
              aria-label="Cancel"
            />
          </Tooltip>
        </HStack>
      </HStack>
    );
  }

  return (
    <HStack spacing={3} align="center" py={2}>
      <Text fontWeight="medium" minW="120px">
        {label}:
      </Text>
      <Text flex={1} color={value !== null && value !== undefined ? "inherit" : "gray.500"}>
        {displayValue}
      </Text>
      {!disabled && (
        <Tooltip label={tooltip || `Edit ${label}`}>
          <IconButton
            size="sm"
            icon={<FaEdit />}
            variant="ghost"
            onClick={() => setIsEditing(true)}
            aria-label={`Edit ${label}`}
          />
        </Tooltip>
      )}
    </HStack>
  );
}