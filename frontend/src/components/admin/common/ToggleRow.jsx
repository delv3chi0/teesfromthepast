// frontend/src/components/admin/common/ToggleRow.jsx
import { 
  HStack, 
  Text, 
  Switch, 
  Button,
  useToast,
  Tooltip,
  Icon
} from '@chakra-ui/react';
import { useState } from 'react';
import { FaInfoCircle } from 'react-icons/fa';

/**
 * Toggle switch with save functionality and optional tooltip
 */
export default function ToggleRow({ 
  label, 
  value, 
  onSave,
  disabled = false,
  tooltip,
  description,
  colorScheme = "blue",
  ...props 
}) {
  const [tempValue, setTempValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const hasChanges = tempValue !== value;

  const handleToggle = (checked) => {
    setTempValue(checked);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(tempValue);
      toast({
        title: `${label} updated`,
        description: `Set to ${tempValue ? 'enabled' : 'disabled'}`,
        status: "success",
        duration: 2000
      });
    } catch (error) {
      setTempValue(value); // Revert on error
      toast({
        title: "Update failed",
        description: error.message,
        status: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTempValue(value);
  };

  return (
    <HStack justify="space-between" {...props}>
      <HStack spacing={2}>
        <Text fontSize="sm" fontWeight="medium" color="gray.700">
          {label}
        </Text>
        {tooltip && (
          <Tooltip label={tooltip} fontSize="sm">
            <Icon as={FaInfoCircle} boxSize={3} color="gray.400" />
          </Tooltip>
        )}
      </HStack>
      
      <HStack spacing={3}>
        <HStack spacing={2}>
          <Switch
            size="sm"
            isChecked={tempValue}
            onChange={(e) => handleToggle(e.target.checked)}
            colorScheme={colorScheme}
            isDisabled={disabled || saving}
          />
          <Text fontSize="xs" color="gray.500">
            {tempValue ? 'Enabled' : 'Disabled'}
          </Text>
        </HStack>
        
        {hasChanges && (
          <HStack spacing={1}>
            <Button 
              size="xs" 
              colorScheme={colorScheme} 
              onClick={handleSave} 
              isLoading={saving}
            >
              Apply
            </Button>
            <Button 
              size="xs" 
              variant="ghost" 
              onClick={handleCancel}
              disabled={saving}
            >
              Reset
            </Button>
          </HStack>
        )}
      </HStack>
      
      {description && (
        <Text fontSize="xs" color="gray.500" mt={1}>
          {description}
        </Text>
      )}
    </HStack>
  );
}