// frontend/src/pages/admin/runtime/AdminRateLimiting.jsx
/**
 * Admin Rate Limiting tab for managing dynamic rate limit configuration
 */

import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Button,
  Text,
  Alert,
  AlertIcon,
  Badge,
  Select,
  useToast,
  Box,
  IconButton,
  Tooltip,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Divider
} from '@chakra-ui/react';
import { FaSync, FaSave, FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import SectionCard from '../../../components/shared/SectionCard.jsx';
import KeyValueGrid from '../../../components/shared/KeyValueGrid.jsx';
import EditableNumberRow from '../../../components/shared/EditableNumberRow.jsx';
import { 
  fetchRuntimeConfig, 
  updateRateLimitConfig, 
  handleRuntimeApiError,
  validateRateLimitConfig 
} from '../../../api/adminRuntime.js';

/**
 * AdminRateLimiting component for managing rate limit configuration
 */
export default function AdminRateLimiting() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [localConfig, setLocalConfig] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingOverride, setEditingOverride] = useState(null);
  const [newOverride, setNewOverride] = useState({
    pathPrefix: '',
    max: 100,
    algorithm: 'fixed',
    type: 'path' // 'path' or 'role'
  });
  
  const toast = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config && localConfig) {
      const hasConfigChanges = JSON.stringify(config.rateLimit) !== JSON.stringify(localConfig);
      setHasChanges(hasConfigChanges);
    }
  }, [config, localConfig]);

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetchRuntimeConfig();
      setConfig(response.data);
      setLocalConfig(response.data.rateLimit);
    } catch (err) {
      const errorInfo = handleRuntimeApiError(err);
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!localConfig) return;
    
    const validation = validateRateLimitConfig(localConfig);
    if (!validation.valid) {
      toast({
        title: 'Validation Error',
        description: validation.errors.join(', '),
        status: 'error',
        duration: 5000
      });
      return;
    }
    
    setSaving(true);
    
    try {
      await updateRateLimitConfig(localConfig);
      
      toast({
        title: 'Rate limit configuration updated',
        description: 'Changes applied successfully and are effective immediately',
        status: 'success',
        duration: 3000
      });
      
      // Reload to get the updated config
      await loadConfig();
      setHasChanges(false);
    } catch (err) {
      const errorInfo = handleRuntimeApiError(err);
      toast({
        title: 'Update Failed',
        description: errorInfo.message,
        status: 'error',
        duration: 5000
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setLocalConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddOverride = () => {
    setEditingOverride(null);
    setNewOverride({
      pathPrefix: '',
      max: 100,
      algorithm: 'fixed',
      type: 'path'
    });
    onOpen();
  };

  const handleEditOverride = (override, type, index) => {
    setEditingOverride({ ...override, type, index });
    setNewOverride({ ...override, type });
    onOpen();
  };

  const handleSaveOverride = () => {
    const { type, ...overrideData } = newOverride;
    
    if (!overrideData.pathPrefix || !overrideData.max) {
      toast({
        title: 'Validation Error',
        description: 'Path prefix and max are required',
        status: 'error',
        duration: 3000
      });
      return;
    }

    if (type === 'role' && !overrideData.role) {
      toast({
        title: 'Validation Error',
        description: 'Role is required for role overrides',
        status: 'error',
        duration: 3000
      });
      return;
    }
    
    if (editingOverride) {
      // Update existing override
      const field = type === 'path' ? 'overrides' : 'roleOverrides';
      const updated = [...localConfig[field]];
      updated[editingOverride.index] = overrideData;
      handleFieldChange(field, updated);
    } else {
      // Add new override
      const field = type === 'path' ? 'overrides' : 'roleOverrides';
      const updated = [...localConfig[field], overrideData];
      handleFieldChange(field, updated);
    }
    
    onClose();
  };

  const handleDeleteOverride = (type, index) => {
    const field = type === 'path' ? 'overrides' : 'roleOverrides';
    const updated = localConfig[field].filter((_, i) => i !== index);
    handleFieldChange(field, updated);
  };

  if (loading) {
    return (
      <SectionCard title="Rate Limiting" subtitle="Loading configuration...">
        <Text>Loading...</Text>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="Rate Limiting" subtitle="Dynamic rate limit configuration">
        <Alert status="error">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text>{error}</Text>
            <Button size="sm" onClick={loadConfig}>
              Retry
            </Button>
          </VStack>
        </Alert>
      </SectionCard>
    );
  }

  if (!config || !localConfig) {
    return null;
  }

  const globalConfigItems = [
    {
      key: 'Algorithm',
      value: localConfig.algorithm,
      type: 'code',
      tooltip: 'Rate limiting algorithm used globally'
    },
    {
      key: 'Global Max',
      value: localConfig.globalMax?.toLocaleString(),
      type: 'number',
      tooltip: 'Maximum requests per window globally'
    },
    {
      key: 'Window Size',
      value: `${localConfig.windowMs?.toLocaleString()} ms`,
      type: 'code',
      tooltip: 'Time window for rate limiting in milliseconds'
    }
  ];

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <SectionCard
        title="Rate Limiting"
        subtitle="Dynamic rate limit configuration"
        badge={
          <Badge colorScheme="orange" variant="subtle">
            EPHEMERAL
          </Badge>
        }
        helpText="Changes are applied immediately but not persisted. Server restart resets to environment defaults."
        headerActions={
          <HStack spacing={2}>
            <Button
              size="sm"
              leftIcon={<FaSync />}
              onClick={loadConfig}
              isLoading={loading}
              variant="outline"
            >
              Refresh
            </Button>
            
            <Button
              size="sm"
              leftIcon={<FaSave />}
              onClick={handleSave}
              isLoading={saving}
              isDisabled={!hasChanges}
              colorScheme="blue"
            >
              Save Changes
            </Button>
          </HStack>
        }
      >
        {hasChanges && (
          <Alert status="info" mb={4}>
            <AlertIcon />
            You have unsaved changes. Click "Save Changes" to apply them.
          </Alert>
        )}
      </SectionCard>

      {/* Global Configuration */}
      <SectionCard title="Global Configuration" subtitle="Base rate limiting settings">
        <VStack spacing={4} align="stretch">
          <KeyValueGrid items={globalConfigItems} columns={1} />
          
          <Divider />
          
          <VStack spacing={3} align="stretch">
            <HStack>
              <Text fontSize="sm" fontWeight="medium" color="gray.700" minW="120px">
                Algorithm
              </Text>
              <Select
                value={localConfig.algorithm}
                onChange={(e) => handleFieldChange('algorithm', e.target.value)}
                size="sm"
                maxW="200px"
              >
                <option value="fixed">Fixed Window</option>
                <option value="sliding">Sliding Window</option>
                <option value="token_bucket">Token Bucket</option>
              </Select>
            </HStack>
            
            <EditableNumberRow
              label="Global Max"
              value={localConfig.globalMax}
              onSave={(value) => handleFieldChange('globalMax', value)}
              min={1}
              max={10000}
              unit="requests"
              helpText="Maximum requests per window globally"
            />
            
            <EditableNumberRow
              label="Window Size"
              value={localConfig.windowMs}
              onSave={(value) => handleFieldChange('windowMs', value)}
              min={1000}
              max={3600000}
              step={1000}
              unit="ms"
              helpText="Time window for rate limiting (1s = 1000ms)"
            />
          </VStack>
        </VStack>
      </SectionCard>

      {/* Path Overrides */}
      <SectionCard 
        title="Path Overrides" 
        subtitle="Per-path rate limit overrides"
        headerActions={
          <Button
            size="sm"
            leftIcon={<FaPlus />}
            onClick={handleAddOverride}
            variant="outline"
          >
            Add Override
          </Button>
        }
      >
        {localConfig.overrides?.length > 0 ? (
          <TableContainer>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Path Prefix</Th>
                  <Th>Max Requests</Th>
                  <Th>Algorithm</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {localConfig.overrides.map((override, index) => (
                  <Tr key={index}>
                    <Td>
                      <Badge variant="outline">{override.pathPrefix}</Badge>
                    </Td>
                    <Td>{override.max?.toLocaleString()}</Td>
                    <Td>
                      <Badge colorScheme="blue">{override.algorithm}</Badge>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <Tooltip label="Edit">
                          <IconButton
                            size="sm"
                            variant="ghost"
                            icon={<FaEdit />}
                            onClick={() => handleEditOverride(override, 'path', index)}
                          />
                        </Tooltip>
                        <Tooltip label="Delete">
                          <IconButton
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            icon={<FaTrash />}
                            onClick={() => handleDeleteOverride('path', index)}
                          />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        ) : (
          <Text color="gray.500" textAlign="center" py={4}>
            No path overrides configured. Global settings apply to all paths.
          </Text>
        )}
      </SectionCard>

      {/* Role Overrides */}
      <SectionCard 
        title="Role Overrides" 
        subtitle="Per-role rate limit overrides"
        headerActions={
          <Button
            size="sm"
            leftIcon={<FaPlus />}
            onClick={() => {
              setNewOverride(prev => ({ ...prev, type: 'role' }));
              handleAddOverride();
            }}
            variant="outline"
          >
            Add Role Override
          </Button>
        }
      >
        {localConfig.roleOverrides?.length > 0 ? (
          <TableContainer>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Role</Th>
                  <Th>Path Prefix</Th>
                  <Th>Max Requests</Th>
                  <Th>Algorithm</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {localConfig.roleOverrides.map((override, index) => (
                  <Tr key={index}>
                    <Td>
                      <Badge colorScheme="purple">{override.role}</Badge>
                    </Td>
                    <Td>
                      <Badge variant="outline">{override.pathPrefix || 'All paths'}</Badge>
                    </Td>
                    <Td>{override.max?.toLocaleString()}</Td>
                    <Td>
                      <Badge colorScheme="blue">{override.algorithm}</Badge>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <Tooltip label="Edit">
                          <IconButton
                            size="sm"
                            variant="ghost"
                            icon={<FaEdit />}
                            onClick={() => handleEditOverride(override, 'role', index)}
                          />
                        </Tooltip>
                        <Tooltip label="Delete">
                          <IconButton
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            icon={<FaTrash />}
                            onClick={() => handleDeleteOverride('role', index)}
                          />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        ) : (
          <Text color="gray.500" textAlign="center" py={4}>
            No role overrides configured. Global or path settings apply to all users.
          </Text>
        )}
      </SectionCard>

      {/* Override Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingOverride ? 'Edit Override' : 'Add Override'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {newOverride.type === 'role' && (
                <FormControl>
                  <FormLabel>Role</FormLabel>
                  <Input
                    value={newOverride.role || ''}
                    onChange={(e) => setNewOverride(prev => ({ ...prev, role: e.target.value }))}
                    placeholder="admin, premium, etc."
                  />
                </FormControl>
              )}
              
              <FormControl>
                <FormLabel>Path Prefix</FormLabel>
                <Input
                  value={newOverride.pathPrefix}
                  onChange={(e) => setNewOverride(prev => ({ ...prev, pathPrefix: e.target.value }))}
                  placeholder="/api/upload, /api/admin, etc."
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Max Requests</FormLabel>
                <Input
                  type="number"
                  value={newOverride.max}
                  onChange={(e) => setNewOverride(prev => ({ ...prev, max: parseInt(e.target.value) || 0 }))}
                  min="1"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Algorithm</FormLabel>
                <Select
                  value={newOverride.algorithm}
                  onChange={(e) => setNewOverride(prev => ({ ...prev, algorithm: e.target.value }))}
                >
                  <option value="fixed">Fixed Window</option>
                  <option value="sliding">Sliding Window</option>
                  <option value="token_bucket">Token Bucket</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSaveOverride}>
              {editingOverride ? 'Update' : 'Add'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}