// frontend/src/components/admin/common/ToggleRow.jsx
// Toggle switch row component
import React from 'react';
import { 
  HStack, 
  VStack,
  Text, 
  Switch, 
  useToast 
} from '@chakra-ui/react';

const ToggleRow = ({ 
  label, 
  description,
  value, 
  onChange, 
  isDisabled = false,
  ...props 
}) => {
  const toast = useToast();

  const handleToggle = (checked) => {
    try {
      onChange(checked);
      
      toast({
        title: `${label} ${checked ? 'enabled' : 'disabled'}`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Failed to update setting',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <HStack justify="space-between" align="start" {...props}>
      <VStack align="start" spacing={1} flex={1}>
        <Text fontWeight="medium" color="gray.700">
          {label}
        </Text>
        {description && (
          <Text fontSize="sm" color="gray.500">
            {description}
          </Text>
        )}
      </VStack>
      
      <Switch
        isChecked={value}
        onChange={(e) => handleToggle(e.target.checked)}
        isDisabled={isDisabled}
        colorScheme="brand"
        size="md"
      />
    </HStack>
  );
};

export default ToggleRow;