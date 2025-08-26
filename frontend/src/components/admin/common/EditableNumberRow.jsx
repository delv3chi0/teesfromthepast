// frontend/src/components/admin/common/EditableNumberRow.jsx
// Editable number input row component
import React, { useState } from 'react';
import { 
  HStack, 
  Text, 
  Input, 
  Button, 
  IconButton,
  useToast 
} from '@chakra-ui/react';
import { FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

const EditableNumberRow = ({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = Infinity,
  allowNull = true,
  nullLabel = 'Default',
  ...props 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const toast = useToast();

  const handleEdit = () => {
    setInputValue(value?.toString() || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    try {
      let newValue;
      
      if (inputValue.trim() === '' && allowNull) {
        newValue = null;
      } else {
        newValue = parseInt(inputValue, 10);
        
        if (isNaN(newValue)) {
          throw new Error('Must be a valid number');
        }
        
        if (newValue < min) {
          throw new Error(`Must be at least ${min}`);
        }
        
        if (newValue > max) {
          throw new Error(`Must be at most ${max}`);
        }
      }
      
      onChange(newValue);
      setIsEditing(false);
      
      toast({
        title: 'Value updated',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Invalid value',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleCancel = () => {
    setInputValue(value?.toString() || '');
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <HStack justify="space-between" {...props}>
      <Text fontWeight="medium" color="gray.700">
        {label}
      </Text>
      
      {isEditing ? (
        <HStack>
          <Input
            size="sm"
            width="120px"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={allowNull ? nullLabel : '0'}
            type="number"
            min={min}
            max={max}
            autoFocus
          />
          <IconButton
            size="sm"
            icon={<FaCheck />}
            onClick={handleSave}
            colorScheme="green"
            variant="outline"
            aria-label="Save"
          />
          <IconButton
            size="sm"
            icon={<FaTimes />}
            onClick={handleCancel}
            colorScheme="red"
            variant="outline"
            aria-label="Cancel"
          />
        </HStack>
      ) : (
        <HStack>
          <Text 
            fontFamily="mono" 
            fontSize="sm" 
            color={value === null ? 'gray.500' : 'gray.800'}
            fontStyle={value === null ? 'italic' : 'normal'}
          >
            {value === null ? nullLabel : value.toLocaleString()}
          </Text>
          <IconButton
            size="sm"
            icon={<FaEdit />}
            onClick={handleEdit}
            variant="ghost"
            aria-label="Edit"
          />
        </HStack>
      )}
    </HStack>
  );
};

export default EditableNumberRow;