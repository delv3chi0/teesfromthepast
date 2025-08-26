// frontend/src/pages/admin/AdminRateLimiting.jsx
// Rate limiting configuration page with dynamic overrides
import React, { useState, useEffect, useCallback } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  Alert,
  AlertIcon,
  Spinner,
  Select,
  Input,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useToast,
  FormControl,
  FormLabel,
  Box,
  Badge
} from '@chakra-ui/react';
import { FaSync, FaSave, FaPlus, FaTrash } from 'react-icons/fa';
import { fetchRuntimeConfig, updateRateLimitConfig } from '../../api/adminRuntime.js';
import SectionCard from '../../components/admin/common/SectionCard.jsx';
import EditableNumberRow from '../../components/admin/common/EditableNumberRow.jsx';

const AdminRateLimiting = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [backendAvailable, setBackendAvailable] = useState(true);
  const toast = useToast();

  // Local state for overrides editing
  const [localOverrides, setLocalOverrides] = useState([]);
  const [localRoleOverrides, setLocalRoleOverrides] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current configuration
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await fetchRuntimeConfig();
      
      if (result.success) {
        setConfig(result.data.rateLimit);
        setLocalOverrides([...result.data.rateLimit.overrides]);
        setLocalRoleOverrides([...result.data.rateLimit.roleOverrides]);
        setBackendAvailable(true);
        setHasChanges(false);
      } else {
        setError(result.error);
        setBackendAvailable(result.backendAvailable);
      }
    } catch (err) {
      setError('Failed to fetch rate limit configuration');
      setBackendAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Save configuration
  const saveConfiguration = async () => {
    setSaving(true);
    
    try {
      const updates = {
        overrides: localOverrides,
        roleOverrides: localRoleOverrides
      };

      const result = await updateRateLimitConfig(updates);
      
      if (result.success) {
        setConfig(result.data.config);
        setHasChanges(false);
        
        toast({
          title: 'Configuration saved',
          description: 'Rate limiting overrides have been updated',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Save failed',
          description: result.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      toast({
        title: 'Save failed',
        description: 'Failed to save configuration',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  // Update global settings
  const updateGlobalSetting = async (key, value) => {
    try {
      const updates = { [key]: value };
      const result = await updateRateLimitConfig(updates);
      
      if (result.success) {
        setConfig(prev => ({ ...prev, [key]: value }));
        
        toast({
          title: 'Setting updated',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Update failed',
          description: result.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      toast({
        title: 'Update failed',
        description: 'Failed to update setting',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Add new path override
  const addPathOverride = () => {
    const newOverride = {
      pathPrefix: '/api/',
      max: 100,
      algorithm: 'fixed'
    };
    
    setLocalOverrides([...localOverrides, newOverride]);
    setHasChanges(true);
  };

  // Remove path override
  const removePathOverride = (index) => {
    const newOverrides = localOverrides.filter((_, i) => i !== index);
    setLocalOverrides(newOverrides);
    setHasChanges(true);
  };

  // Update path override
  const updatePathOverride = (index, field, value) => {
    const newOverrides = [...localOverrides];
    newOverrides[index] = { ...newOverrides[index], [field]: value };
    setLocalOverrides(newOverrides);
    setHasChanges(true);
  };

  // Add new role override
  const addRoleOverride = () => {
    const newOverride = {
      role: 'admin',
      pathPrefix: '/api/',
      max: 1000,
      algorithm: 'fixed'
    };
    
    setLocalRoleOverrides([...localRoleOverrides, newOverride]);
    setHasChanges(true);
  };

  // Remove role override
  const removeRoleOverride = (index) => {
    const newOverrides = localRoleOverrides.filter((_, i) => i !== index);
    setLocalRoleOverrides(newOverrides);
    setHasChanges(true);
  };

  // Update role override
  const updateRoleOverride = (index, field, value) => {
    const newOverrides = [...localRoleOverrides];
    newOverrides[index] = { ...newOverrides[index], [field]: value };
    setLocalRoleOverrides(newOverrides);
    setHasChanges(true);
  };

  if (!backendAvailable) {
    return (
      <SectionCard title="Rate Limiting">
        <Alert status="warning">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text>Backend runtime configuration endpoints are not available.</Text>
            <Text fontSize="sm" color="gray.600">
              Please ensure the backend PR with dynamic admin console features is merged and deployed.
            </Text>
          </VStack>
        </Alert>
      </SectionCard>
    );
  }

  if (loading || !config) {
    return (
      <SectionCard title="Rate Limiting">
        <HStack justify="center" py={8}>
          <Spinner size="md" />
          <Text>Loading rate limiting configuration...</Text>
        </HStack>
      </SectionCard>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <SectionCard 
        title="Rate Limiting Configuration"
        headerContent={
          <HStack>
            <Button
              size="sm"
              leftIcon={<FaSync />}
              onClick={fetchConfig}
              isLoading={loading}
              variant="outline"
            >
              Refresh
            </Button>
          </HStack>
        }
      >
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text>Rate limiting changes are applied immediately but are ephemeral (lost on restart).</Text>
            <Text fontSize="xs" color="gray.600">
              Override precedence: Role overrides &gt; Path overrides &gt; Global settings
            </Text>
          </VStack>
        </Alert>
      </SectionCard>

      {/* Error Display */}
      {error && (
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* Global Settings */}
      <SectionCard title="Global Settings">
        <VStack spacing={4}>
          <HStack justify="space-between" width="100%">
            <Text fontWeight="medium">Algorithm</Text>
            <Select
              value={config.algorithm}
              onChange={(e) => updateGlobalSetting('algorithm', e.target.value)}
              size="sm"
              width="150px"
            >
              <option value="fixed">Fixed Window</option>
              <option value="sliding">Sliding Window</option>
              <option value="token-bucket">Token Bucket</option>
            </Select>
          </HStack>

          <EditableNumberRow
            label="Global Max Requests"
            value={config.globalMax}
            onChange={(value) => updateGlobalSetting('globalMax', value)}
            min={1}
            nullLabel="Use env default"
          />

          <EditableNumberRow
            label="Window Size (ms)"
            value={config.windowMs}
            onChange={(value) => updateGlobalSetting('windowMs', value)}
            min={1000}
            nullLabel="Use env default"
          />
        </VStack>
      </SectionCard>

      {/* Path Overrides */}
      <SectionCard 
        title="Path Overrides"
        headerContent={
          <Button
            size="sm"
            leftIcon={<FaPlus />}
            onClick={addPathOverride}
            colorScheme="brand"
            variant="outline"
          >
            Add Override
          </Button>
        }
      >
        {localOverrides.length === 0 ? (
          <Text color="gray.500" textAlign="center" py={4}>
            No path overrides configured
          </Text>
        ) : (
          <TableContainer>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Path Prefix</Th>
                  <Th>Max Requests</Th>
                  <Th>Algorithm</Th>
                  <Th width="50px"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {localOverrides.map((override, index) => (
                  <Tr key={index}>
                    <Td>
                      <Input
                        size="sm"
                        value={override.pathPrefix}
                        onChange={(e) => updatePathOverride(index, 'pathPrefix', e.target.value)}
                      />
                    </Td>
                    <Td>
                      <Input
                        size="sm"
                        type="number"
                        value={override.max}
                        onChange={(e) => updatePathOverride(index, 'max', parseInt(e.target.value))}
                        min={1}
                      />
                    </Td>
                    <Td>
                      <Select
                        size="sm"
                        value={override.algorithm || 'fixed'}
                        onChange={(e) => updatePathOverride(index, 'algorithm', e.target.value)}
                      >
                        <option value="fixed">Fixed</option>
                        <option value="sliding">Sliding</option>
                        <option value="token-bucket">Token Bucket</option>
                      </Select>
                    </Td>
                    <Td>
                      <IconButton
                        size="sm"
                        icon={<FaTrash />}
                        onClick={() => removePathOverride(index)}
                        colorScheme="red"
                        variant="ghost"
                        aria-label="Remove override"
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      {/* Role Overrides */}
      <SectionCard 
        title="Role Overrides"
        headerContent={
          <Button
            size="sm"
            leftIcon={<FaPlus />}
            onClick={addRoleOverride}
            colorScheme="brand"
            variant="outline"
          >
            Add Role Override
          </Button>
        }
      >
        {localRoleOverrides.length === 0 ? (
          <Text color="gray.500" textAlign="center" py={4}>
            No role overrides configured
          </Text>
        ) : (
          <TableContainer>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Role</Th>
                  <Th>Path Prefix</Th>
                  <Th>Max Requests</Th>
                  <Th>Algorithm</Th>
                  <Th width="50px"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {localRoleOverrides.map((override, index) => (
                  <Tr key={index}>
                    <Td>
                      <Input
                        size="sm"
                        value={override.role}
                        onChange={(e) => updateRoleOverride(index, 'role', e.target.value)}
                      />
                    </Td>
                    <Td>
                      <Input
                        size="sm"
                        value={override.pathPrefix}
                        onChange={(e) => updateRoleOverride(index, 'pathPrefix', e.target.value)}
                      />
                    </Td>
                    <Td>
                      <Input
                        size="sm"
                        type="number"
                        value={override.max}
                        onChange={(e) => updateRoleOverride(index, 'max', parseInt(e.target.value))}
                        min={1}
                      />
                    </Td>
                    <Td>
                      <Select
                        size="sm"
                        value={override.algorithm || 'fixed'}
                        onChange={(e) => updateRoleOverride(index, 'algorithm', e.target.value)}
                      >
                        <option value="fixed">Fixed</option>
                        <option value="sliding">Sliding</option>
                        <option value="token-bucket">Token Bucket</option>
                      </Select>
                    </Td>
                    <Td>
                      <IconButton
                        size="sm"
                        icon={<FaTrash />}
                        onClick={() => removeRoleOverride(index)}
                        colorScheme="red"
                        variant="ghost"
                        aria-label="Remove role override"
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      {/* Save Changes */}
      {hasChanges && (
        <Box position="sticky" bottom={4} zIndex={10}>
          <SectionCard>
            <HStack justify="space-between" align="center">
              <HStack>
                <Badge colorScheme="orange">Unsaved Changes</Badge>
                <Text fontSize="sm" color="gray.600">
                  You have unsaved changes to overrides
                </Text>
              </HStack>
              <Button
                leftIcon={<FaSave />}
                onClick={saveConfiguration}
                isLoading={saving}
                colorScheme="brand"
              >
                Save Changes
              </Button>
            </HStack>
          </SectionCard>
        </Box>
      )}
    </VStack>
  );
};

export default AdminRateLimiting;