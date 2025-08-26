// frontend/src/pages/admin/AdminRateLimiting.jsx
// Admin page for managing rate limiting configuration

import React, { useState, useEffect } from 'react';
import { 
  VStack, 
  HStack,
  Text, 
  Button,
  Select,
  Alert,
  AlertIcon,
  useToast,
  Divider,
  Box,
  IconButton,
  Tooltip,
  Input,
  FormControl,
  FormLabel,
  Badge
} from '@chakra-ui/react';
import { FaSync, FaSave, FaPlus, FaTrash, FaInfoCircle } from 'react-icons/fa';

import SectionCard from '../../components/admin/common/SectionCard.jsx';
import EditableNumberRow from '../../components/admin/common/EditableNumberRow.jsx';
import KeyValueGrid from '../../components/admin/common/KeyValueGrid.jsx';
import { fetchRuntimeConfig, updateRateLimitConfig } from '../../api/adminRuntime.js';

const AdminRateLimiting = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [algorithm, setAlgorithm] = useState('fixed');
  const [globalMax, setGlobalMax] = useState(120);
  const [windowMs, setWindowMs] = useState(60000);
  const [overrides, setOverrides] = useState([]);
  const [roleOverrides, setRoleOverrides] = useState([]);
  
  const toast = useToast();

  const fetchConfig = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await fetchRuntimeConfig();
      setConfig(data);
      
      // Update form state
      const rateConfig = data.rateLimit;
      setAlgorithm(rateConfig.algorithm);
      setGlobalMax(rateConfig.globalMax);
      setWindowMs(rateConfig.windowMs);
      setOverrides(rateConfig.overrides || []);
      setRoleOverrides(rateConfig.roleOverrides || []);
    } catch (err) {
      setError(err.fallback ? 
        'Runtime configuration not available. Using static configuration.' : 
        err.error || 'Failed to fetch configuration'
      );
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    
    try {
      const update = {
        algorithm,
        globalMax,
        windowMs,
        overrides,
        roleOverrides
      };
      
      const updated = await updateRateLimitConfig(update);
      
      toast({
        title: "Rate limiting configuration updated",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh config to show updated values
      await fetchConfig();
    } catch (err) {
      toast({
        title: "Failed to update configuration",
        description: err.error || 'Unknown error occurred',
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const addOverride = () => {
    setOverrides([...overrides, { pathPrefix: '', max: 60 }]);
  };

  const updateOverride = (index, field, value) => {
    const updated = [...overrides];
    updated[index] = { ...updated[index], [field]: value };
    setOverrides(updated);
  };

  const removeOverride = (index) => {
    setOverrides(overrides.filter((_, i) => i !== index));
  };

  const addRoleOverride = () => {
    setRoleOverrides([...roleOverrides, { role: '', pathPrefix: '', max: 200 }]);
  };

  const updateRoleOverride = (index, field, value) => {
    const updated = [...roleOverrides];
    updated[index] = { ...updated[index], [field]: value };
    setRoleOverrides(updated);
  };

  const removeRoleOverride = (index) => {
    setRoleOverrides(roleOverrides.filter((_, i) => i !== index));
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const currentConfigData = config ? [
    { 
      label: 'Current Algorithm', 
      value: config.rateLimit.algorithm,
      badge: { colorScheme: 'blue' }
    },
    { 
      label: 'Global Max Requests', 
      value: config.rateLimit.globalMax 
    },
    { 
      label: 'Window (ms)', 
      value: `${config.rateLimit.windowMs}ms (${config.rateLimit.windowMs / 1000}s)` 
    },
    { 
      label: 'Path Overrides', 
      value: config.rateLimit.overrides?.length || 0 
    },
    { 
      label: 'Role Overrides', 
      value: config.rateLimit.roleOverrides?.length || 0 
    }
  ] : [];

  return (
    <VStack spacing={6} align="stretch">
      <SectionCard title="Rate Limiting Configuration">
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" fontWeight="medium">
              Dynamic Configuration (Ephemeral)
            </Text>
            <Text fontSize="xs">
              Changes apply immediately but are lost on server restart. 
              Priority: Role Override &gt; Path Override &gt; Global Settings.
            </Text>
          </VStack>
        </Alert>

        <HStack justify="space-between">
          <Button
            leftIcon={<FaSync />}
            onClick={fetchConfig}
            isLoading={loading}
            size="sm"
            variant="outline"
          >
            Refresh
          </Button>
          
          <Button
            leftIcon={<FaSave />}
            onClick={saveConfig}
            isLoading={saving}
            size="sm"
            colorScheme="blue"
          >
            Save Changes
          </Button>
        </HStack>

        {error && (
          <Alert status="warning">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {config && (
          <>
            <Divider />
            
            <Text fontSize="md" fontWeight="semibold">Current Configuration</Text>
            <KeyValueGrid data={currentConfigData} columns={2} />
            
            <Divider />
            
            <Text fontSize="md" fontWeight="semibold">Edit Configuration</Text>
            
            {/* Global Settings */}
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium">
                Rate Limiting Algorithm
                <Tooltip label="Fixed: Traditional time window. Sliding: Smoothed across time. Token Bucket: Burst allowance." fontSize="sm">
                  <IconButton
                    aria-label="Help"
                    icon={<FaInfoCircle />}
                    size="xs"
                    variant="ghost"
                    color="gray.400"
                    ml={2}
                  />
                </Tooltip>
              </FormLabel>
              <Select 
                value={algorithm} 
                onChange={(e) => setAlgorithm(e.target.value)}
                maxW="300px"
              >
                <option value="fixed">Fixed Window</option>
                <option value="sliding">Sliding Window</option>
                <option value="token_bucket">Token Bucket</option>
              </Select>
            </FormControl>

            <EditableNumberRow
              label="Global Max Requests"
              value={globalMax}
              onChange={setGlobalMax}
              min={1}
              max={10000}
              helpText="Maximum requests allowed per time window globally"
            />

            <EditableNumberRow
              label="Time Window (ms)"
              value={windowMs}
              onChange={setWindowMs}
              min={1000}
              max={3600000}
              step={1000}
              helpText="Time window in milliseconds (e.g., 60000 = 1 minute)"
            />

            <Divider />

            {/* Path Overrides */}
            <HStack justify="space-between">
              <Text fontSize="md" fontWeight="semibold">Path Overrides</Text>
              <Button
                leftIcon={<FaPlus />}
                onClick={addOverride}
                size="sm"
                variant="outline"
              >
                Add Override
              </Button>
            </HStack>

            {overrides.length === 0 ? (
              <Text fontSize="sm" color="gray.500" fontStyle="italic">
                No path overrides configured
              </Text>
            ) : (
              <VStack spacing={3} align="stretch">
                {overrides.map((override, index) => (
                  <Box 
                    key={index} 
                    p={3} 
                    borderWidth={1} 
                    borderColor="gray.200" 
                    borderRadius="md"
                    bg="gray.50"
                  >
                    <HStack spacing={3}>
                      <FormControl flex={1}>
                        <FormLabel fontSize="xs">Path Prefix</FormLabel>
                        <Input
                          value={override.pathPrefix}
                          onChange={(e) => updateOverride(index, 'pathPrefix', e.target.value)}
                          placeholder="/api/upload"
                          size="sm"
                        />
                      </FormControl>
                      
                      <FormControl w="120px">
                        <FormLabel fontSize="xs">Max Requests</FormLabel>
                        <Input
                          type="number"
                          value={override.max}
                          onChange={(e) => updateOverride(index, 'max', parseInt(e.target.value) || 0)}
                          size="sm"
                        />
                      </FormControl>
                      
                      <FormControl w="140px">
                        <FormLabel fontSize="xs">Algorithm (Optional)</FormLabel>
                        <Select
                          value={override.algorithm || ''}
                          onChange={(e) => updateOverride(index, 'algorithm', e.target.value || undefined)}
                          size="sm"
                        >
                          <option value="">Use Global</option>
                          <option value="fixed">Fixed</option>
                          <option value="sliding">Sliding</option>
                          <option value="token_bucket">Token Bucket</option>
                        </Select>
                      </FormControl>
                      
                      <IconButton
                        aria-label="Remove override"
                        icon={<FaTrash />}
                        onClick={() => removeOverride(index)}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        mt={6}
                      />
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}

            <Divider />

            {/* Role Overrides */}
            <HStack justify="space-between">
              <Text fontSize="md" fontWeight="semibold">Role Overrides</Text>
              <Button
                leftIcon={<FaPlus />}
                onClick={addRoleOverride}
                size="sm"
                variant="outline"
              >
                Add Role Override
              </Button>
            </HStack>

            {roleOverrides.length === 0 ? (
              <Text fontSize="sm" color="gray.500" fontStyle="italic">
                No role overrides configured
              </Text>
            ) : (
              <VStack spacing={3} align="stretch">
                {roleOverrides.map((override, index) => (
                  <Box 
                    key={index} 
                    p={3} 
                    borderWidth={1} 
                    borderColor="gray.200" 
                    borderRadius="md"
                    bg="gray.50"
                  >
                    <HStack spacing={3}>
                      <FormControl w="120px">
                        <FormLabel fontSize="xs">User Role</FormLabel>
                        <Input
                          value={override.role}
                          onChange={(e) => updateRoleOverride(index, 'role', e.target.value)}
                          placeholder="premium"
                          size="sm"
                        />
                      </FormControl>
                      
                      <FormControl flex={1}>
                        <FormLabel fontSize="xs">Path Prefix</FormLabel>
                        <Input
                          value={override.pathPrefix}
                          onChange={(e) => updateRoleOverride(index, 'pathPrefix', e.target.value)}
                          placeholder="/api"
                          size="sm"
                        />
                      </FormControl>
                      
                      <FormControl w="120px">
                        <FormLabel fontSize="xs">Max Requests</FormLabel>
                        <Input
                          type="number"
                          value={override.max}
                          onChange={(e) => updateRoleOverride(index, 'max', parseInt(e.target.value) || 0)}
                          size="sm"
                        />
                      </FormControl>
                      
                      <FormControl w="140px">
                        <FormLabel fontSize="xs">Algorithm (Optional)</FormLabel>
                        <Select
                          value={override.algorithm || ''}
                          onChange={(e) => updateRoleOverride(index, 'algorithm', e.target.value || undefined)}
                          size="sm"
                        >
                          <option value="">Use Global</option>
                          <option value="fixed">Fixed</option>
                          <option value="sliding">Sliding</option>
                          <option value="token_bucket">Token Bucket</option>
                        </Select>
                      </FormControl>
                      
                      <IconButton
                        aria-label="Remove role override"
                        icon={<FaTrash />}
                        onClick={() => removeRoleOverride(index)}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        mt={6}
                      />
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </>
        )}
      </SectionCard>
    </VStack>
  );
};

export default AdminRateLimiting;