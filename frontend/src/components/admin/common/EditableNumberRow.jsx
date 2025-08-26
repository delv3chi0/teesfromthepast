// frontend/src/components/admin/common/EditableNumberRow.jsx
import { 
  HStack, 
  Text, 
  NumberInput, 
  NumberInputField, 
  NumberInputStepper, 
  NumberIncrementStepper, 
  NumberDecrementStepper,
  Button,
  useToast
} from '@chakra-ui/react';
import { useState } from 'react';

/**
 * Editable number input with save/cancel functionality
 */
export default function EditableNumberRow({ 
  label, 
  value, 
  min = 1, 
  max = 1000000, 
  step = 1, 
  onSave,
  disabled = false,
  ...props 
}) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleEdit = () => {
    setTempValue(value);
    setEditing(true);
  };

  const handleCancel = () => {
    setTempValue(value);
    setEditing(false);
  };

  const handleSave = async () => {
    if (tempValue === value) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(tempValue);
      setEditing(false);
      toast({
        title: `${label} updated`,
        status: "success",
        duration: 2000
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error.message,
        status: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <HStack justify="space-between" {...props}>
      <Text fontSize="sm" fontWeight="medium" color="gray.700">
        {label}
      </Text>
      {editing ? (
        <HStack spacing={2}>
          <NumberInput
            size="sm"
            value={tempValue}
            onChange={(valueString, valueNumber) => setTempValue(valueNumber)}
            min={min}
            max={max}
            step={step}
            w="100px"
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <Button size="xs" colorScheme="blue" onClick={handleSave} isLoading={saving}>
            Save
          </Button>
          <Button size="xs" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
        </HStack>
      ) : (
        <HStack spacing={2}>
          <Text fontSize="sm" fontFamily="mono" color="gray.800">
            {value?.toLocaleString() || 'N/A'}
          </Text>
          <Button 
            size="xs" 
            variant="outline" 
            onClick={handleEdit}
            disabled={disabled}
          >
            Edit
          </Button>
        </HStack>
      )}
    </HStack>
  );
}