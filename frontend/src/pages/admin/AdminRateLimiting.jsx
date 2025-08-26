// frontend/src/pages/admin/AdminRateLimiting.jsx
// Admin Rate Limiting configuration tab
import React, { useState, useEffect, useCallback } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
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
  Badge,
  Box,
  Divider,
  Alert,
  AlertIcon,
  Tooltip,
  SimpleGrid
} from '@chakra-ui/react';
import { FaPlus, FaTrash, FaSave, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import { fetchRuntimeConfig, updateRateLimitConfig } from '../../api/adminRuntime';
import SectionCard from '../../components/admin/common/SectionCard';
import EditableNumberRow from '../../components/admin/common/EditableNumberRow';

export default function AdminRateLimiting() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pathOverrides, setPathOverrides] = useState([]);
  const [roleOverrides, setRoleOverrides] = useState([]);
  const [globalConfig, setGlobalConfig] = useState({
    globalMax: null,
    windowMs: null,
    algorithm: null
  });
  const toast = useToast();

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchRuntimeConfig();
      const rateLimitConfig = response.config.rateLimit;
      
      setConfig(rateLimitConfig);
      setGlobalConfig({
        globalMax: rateLimitConfig.globalMax,
        windowMs: rateLimitConfig.windowMs,
        algorithm: rateLimitConfig.algorithm
      });
      
      // Convert objects to arrays for editing
      setPathOverrides(
        Object.entries(rateLimitConfig.pathOverrides || {}).map(([path, override]) => ({
          id: Math.random().toString(36),
          path,
          ...override
        }))
      );
      
      setRoleOverrides(
        Object.entries(rateLimitConfig.roleOverrides || {}).map(([role, override]) => ({
          id: Math.random().toString(36),
          role,
          ...override
        }))
      );
    } catch (error) {
      toast({
        title: "Failed to fetch rate limiting config",
        description: error.message,
        status: "error",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        ...globalConfig,
        pathOverrides: pathOverrides.map(({ id, ...override }) => override),
        roleOverrides: roleOverrides.map(({ id, ...override }) => override)
      };

      await updateRateLimitConfig(updateData);
      
      toast({
        title: "Rate limiting configuration updated",
        description: "Changes are now active",
        status: "success",
        duration: 3000,
      });

      // Refresh to show updated config
      await fetchConfig();
    } catch (error) {
      toast({
        title: "Failed to update configuration",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const addPathOverride = () => {
    setPathOverrides([
      ...pathOverrides,
      {
        id: Math.random().toString(36),
        path: '',
        max: 100,
        algorithm: undefined,
        windowMs: undefined
      }
    ]);
  };

  const removePathOverride = (id) => {
    setPathOverrides(pathOverrides.filter(override => override.id !== id));
  };

  const updatePathOverride = (id, field, value) => {
    setPathOverrides(pathOverrides.map(override => 
      override.id === id ? { ...override, [field]: value } : override
    ));
  };

  const addRoleOverride = () => {
    setRoleOverrides([
      ...roleOverrides,
      {
        id: Math.random().toString(36),
        role: '',
        max: 1000,
        algorithm: undefined,
        windowMs: undefined
      }
    ]);
  };

  const removeRoleOverride = (id) => {
    setRoleOverrides(roleOverrides.filter(override => override.id !== id));
  };

  const updateRoleOverride = (id, field, value) => {
    setRoleOverrides(roleOverrides.map(override => 
      override.id === id ? { ...override, [field]: value } : override
    ));
  };

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const algorithmOptions = [
    { value: '', label: 'Default' },
    { value: 'fixed', label: 'Fixed Window' },
    { value: 'sliding', label: 'Sliding Window' },
    { value: 'token_bucket', label: 'Token Bucket' }
  ];

  const headerActions = (
    <HStack spacing={3}>
      <Button
        size="sm"
        leftIcon={<FaSync />}
        onClick={fetchConfig}
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
        colorScheme="green"
      >
        Save Changes
      </Button>
    </HStack>
  );

  if (loading && !config) {
    return (
      <SectionCard title="Rate Limiting Configuration">
        <Text>Loading configuration...</Text>
      </SectionCard>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <SectionCard title="Rate Limiting Configuration" headerActions={headerActions}>
        <Alert status="warning" mb={4}>
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">Dynamic Configuration</Text>
            <Text fontSize="sm">
              These settings override environment variables temporarily and are reset on server restart.
              Values are applied immediately without requiring a restart.
            </Text>
          </VStack>
        </Alert>

        <VStack spacing={4} align="stretch">
          <Box>
            <Text fontSize="lg" fontWeight="bold" mb={3}>Global Settings</Text>
            <VStack spacing={2} align="stretch">
              <EditableNumberRow
                label="Global Max Requests"
                value={globalConfig.globalMax}
                onChange={(value) => setGlobalConfig({ ...globalConfig, globalMax: value })}
                min={1}
                max={10000}
                tooltip="Maximum requests per window (overrides env RATE_LIMIT_MAX)"
              />
              <EditableNumberRow
                label="Window Duration (ms)"
                value={globalConfig.windowMs}
                onChange={(value) => setGlobalConfig({ ...globalConfig, windowMs: value })}
                min={1000}
                max={3600000}
                unit="ms"
                tooltip="Time window in milliseconds (overrides env RATE_LIMIT_WINDOW)"
              />
              <HStack spacing={3} align="center" py={2}>
                <Text fontWeight="medium" minW="120px">Algorithm:</Text>
                <Select
                  value={globalConfig.algorithm || ''}
                  onChange={(e) => setGlobalConfig({ 
                    ...globalConfig, 
                    algorithm: e.target.value || null 
                  })}
                  width="200px"
                  size="sm"
                >
                  {algorithmOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Text fontSize="sm" color="gray.600">
                  (overrides env RATE_LIMIT_ALGORITHM)
                </Text>
              </HStack>
            </VStack>
          </Box>

          <Divider />

          <Box>
            <HStack justify="space-between" align="center" mb={3}>
              <Text fontSize="lg" fontWeight="bold">Path Overrides</Text>
              <Button
                size="sm"
                leftIcon={<FaPlus />}
                onClick={addPathOverride}
                colorScheme="blue"
                variant="outline"
              >
                Add Path Override
              </Button>
            </HStack>
            
            {pathOverrides.length === 0 ? (
              <Text color="gray.500" fontStyle="italic">
                No path overrides configured
              </Text>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Path Prefix</Th>
                      <Th>Max Requests</Th>
                      <Th>Algorithm</Th>
                      <Th>Window (ms)</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {pathOverrides.map((override) => (
                      <Tr key={override.id}>
                        <Td>
                          <Input
                            value={override.path}
                            onChange={(e) => updatePathOverride(override.id, 'path', e.target.value)}
                            placeholder="/api/example"
                            size="sm"
                          />
                        </Td>
                        <Td>
                          <Input
                            type="number"
                            value={override.max}
                            onChange={(e) => updatePathOverride(override.id, 'max', parseInt(e.target.value))}
                            min={1}
                            size="sm"
                            width="100px"
                          />
                        </Td>
                        <Td>
                          <Select
                            value={override.algorithm || ''}
                            onChange={(e) => updatePathOverride(override.id, 'algorithm', e.target.value || undefined)}
                            size="sm"
                            width="140px"
                          >
                            {algorithmOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                        </Td>
                        <Td>
                          <Input
                            type="number"
                            value={override.windowMs || ''}
                            onChange={(e) => updatePathOverride(override.id, 'windowMs', e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder="Default"
                            size="sm"
                            width="100px"
                          />
                        </Td>
                        <Td>
                          <Tooltip label="Remove override">
                            <IconButton
                              size="sm"
                              icon={<FaTrash />}
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => removePathOverride(override.id)}
                              aria-label="Remove"
                            />
                          </Tooltip>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </Box>

          <Divider />

          <Box>
            <HStack justify="space-between" align="center" mb={3}>
              <Text fontSize="lg" fontWeight="bold">Role Overrides</Text>
              <Button
                size="sm"
                leftIcon={<FaPlus />}
                onClick={addRoleOverride}
                colorScheme="blue"
                variant="outline"
              >
                Add Role Override
              </Button>
            </HStack>
            
            {roleOverrides.length === 0 ? (
              <Text color="gray.500" fontStyle="italic">
                No role overrides configured
              </Text>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Role</Th>
                      <Th>Max Requests</Th>
                      <Th>Algorithm</Th>
                      <Th>Window (ms)</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {roleOverrides.map((override) => (
                      <Tr key={override.id}>
                        <Td>
                          <Select
                            value={override.role}
                            onChange={(e) => updateRoleOverride(override.id, 'role', e.target.value)}
                            size="sm"
                            width="120px"
                          >
                            <option value="">Select role</option>
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
                          </Select>
                        </Td>
                        <Td>
                          <Input
                            type="number"
                            value={override.max}
                            onChange={(e) => updateRoleOverride(override.id, 'max', parseInt(e.target.value))}
                            min={1}
                            size="sm"
                            width="100px"
                          />
                        </Td>
                        <Td>
                          <Select
                            value={override.algorithm || ''}
                            onChange={(e) => updateRoleOverride(override.id, 'algorithm', e.target.value || undefined)}
                            size="sm"
                            width="140px"
                          >
                            {algorithmOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                        </Td>
                        <Td>
                          <Input
                            type="number"
                            value={override.windowMs || ''}
                            onChange={(e) => updateRoleOverride(override.id, 'windowMs', e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder="Default"
                            size="sm"
                            width="100px"
                          />
                        </Td>
                        <Td>
                          <Tooltip label="Remove override">
                            <IconButton
                              size="sm"
                              icon={<FaTrash />}
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => removeRoleOverride(override.id)}
                              aria-label="Remove"
                            />
                          </Tooltip>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </VStack>
      </SectionCard>

      {config && (
        <SectionCard title="Current Active Configuration">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box>
              <Text fontWeight="bold" mb={2}>Global Settings</Text>
              <VStack align="start" spacing={1}>
                <Text fontSize="sm">
                  Max: <Badge>{config.globalMax || 'Default'}</Badge>
                </Text>
                <Text fontSize="sm">
                  Window: <Badge>{config.windowMs ? `${config.windowMs}ms` : 'Default'}</Badge>
                </Text>
                <Text fontSize="sm">
                  Algorithm: <Badge>{config.algorithm || 'Default'}</Badge>
                </Text>
              </VStack>
            </Box>
            <Box>
              <Text fontWeight="bold" mb={2}>Override Counts</Text>
              <VStack align="start" spacing={1}>
                <Text fontSize="sm">
                  Path Overrides: <Badge colorScheme="blue">{Object.keys(config.pathOverrides || {}).length}</Badge>
                </Text>
                <Text fontSize="sm">
                  Role Overrides: <Badge colorScheme="green">{Object.keys(config.roleOverrides || {}).length}</Badge>
                </Text>
              </VStack>
            </Box>
          </SimpleGrid>
        </SectionCard>
      )}
    </VStack>
  );
}