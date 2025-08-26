// frontend/src/pages/admin/AdminRateLimiting.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Button,
  Select,
  Badge,
  useToast
} from '@chakra-ui/react';
import { FaShieldAlt, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import { getRuntimeConfig, updateRateLimitConfig } from '../../api/adminRuntime.js';
import SectionCard from '../../components/admin/common/SectionCard.jsx';
import EditableNumberRow from '../../components/admin/common/EditableNumberRow.jsx';
import KeyValueGrid from '../../components/admin/common/KeyValueGrid.jsx';

export default function AdminRateLimiting() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const toast = useToast();

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await getRuntimeConfig();
      setConfig(result.config);
    } catch (err) {
      setError(`Failed to load configuration: ${err.message}`);
      toast({
        title: "Failed to load config",
        description: err.message,
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleAlgorithmChange = async (newAlgorithm) => {
    try {
      const result = await updateRateLimitConfig({ algorithm: newAlgorithm });
      setConfig(prev => ({ ...prev, rateLimit: result.config.rateLimit }));
      toast({
        title: "Algorithm updated",
        description: `Changed to ${newAlgorithm}`,
        status: "success"
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error.message,
        status: "error"
      });
    }
  };

  const handleGlobalMaxChange = async (newValue) => {
    const result = await updateRateLimitConfig({ globalMax: newValue });
    setConfig(prev => ({ ...prev, rateLimit: result.config.rateLimit }));
  };

  const handleWindowMsChange = async (newValue) => {
    const result = await updateRateLimitConfig({ windowMs: newValue });
    setConfig(prev => ({ ...prev, rateLimit: result.config.rateLimit }));
  };

  const getAlgorithmColor = (algorithm) => {
    switch (algorithm) {
      case 'fixed': return 'blue';
      case 'sliding': return 'green';
      case 'token_bucket': return 'purple';
      default: return 'gray';
    }
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${ms / 1000}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  return (
    <Box layerStyle="cardBlue" w="100%" p={{ base: 2, md: 4 }}>
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={2}>
        <HStack>
          <FaShieldAlt />
          <Heading size="md">Rate Limiting</Heading>
        </HStack>
        <Button
          size="sm"
          leftIcon={<FaSync />}
          onClick={loadConfig}
          isLoading={loading}
          variant="outline"
          color="black"
          borderColor="black"
        >
          Refresh
        </Button>
      </HStack>

      {loading && (
        <VStack p={10}>
          <Spinner />
          <Text>Loading rate limit configuration...</Text>
        </VStack>
      )}

      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {config && (
        <VStack spacing={6} align="stretch">
          {/* Memory-only warning */}
          <Alert status="warning">
            <FaExclamationTriangle />
            <VStack align="start" spacing={1} ml={2}>
              <Text fontWeight="bold">Memory-Only Overrides</Text>
              <Text fontSize="sm">
                Changes made here are temporary and will be lost when the server restarts.
                These overrides take precedence over environment variables.
              </Text>
            </VStack>
          </Alert>

          {/* Current Global Settings */}
          <SectionCard title="Global Rate Limiting">
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Text fontSize="sm" fontWeight="medium" color="gray.700">
                  Algorithm
                </Text>
                <HStack spacing={3}>
                  <Badge colorScheme={getAlgorithmColor(config.rateLimit.algorithm)}>
                    {config.rateLimit.algorithm}
                  </Badge>
                  <Select
                    size="sm"
                    value={config.rateLimit.algorithm}
                    onChange={(e) => handleAlgorithmChange(e.target.value)}
                    w="150px"
                  >
                    <option value="fixed">Fixed Window</option>
                    <option value="sliding">Sliding Window</option>
                    <option value="token_bucket">Token Bucket</option>
                  </Select>
                </HStack>
              </HStack>

              <EditableNumberRow
                label="Global Max Requests"
                value={config.rateLimit.globalMax}
                min={1}
                max={1000000}
                onSave={handleGlobalMaxChange}
              />

              <EditableNumberRow
                label="Window Duration (ms)"
                value={config.rateLimit.windowMs}
                min={1000}
                max={3600000}
                step={1000}
                onSave={handleWindowMsChange}
              />

              <HStack justify="space-between">
                <Text fontSize="sm" fontWeight="medium" color="gray.700">
                  Effective Window
                </Text>
                <Text fontSize="sm" fontFamily="mono" color="gray.800">
                  {formatDuration(config.rateLimit.windowMs)}
                </Text>
              </HStack>
            </VStack>
          </SectionCard>

          {/* Algorithm Information */}
          <SectionCard title="Algorithm Details">
            <VStack align="stretch" spacing={3}>
              <Text fontSize="sm" color="gray.600">
                {config.rateLimit.algorithm === 'fixed' && 
                  "Fixed Window: Requests are counted in fixed time windows. Simple but can allow bursts at window boundaries."}
                {config.rateLimit.algorithm === 'sliding' && 
                  "Sliding Window: Requests are counted in a sliding time window. More accurate but higher memory usage."}
                {config.rateLimit.algorithm === 'token_bucket' && 
                  "Token Bucket: Tokens are added to a bucket at a fixed rate. Allows controlled bursts."}
              </Text>
              
              <KeyValueGrid
                data={{
                  "Current Rate": `${config.rateLimit.globalMax} requests / ${formatDuration(config.rateLimit.windowMs)}`,
                  "Requests Per Second": `~${Math.round((config.rateLimit.globalMax * 1000) / config.rateLimit.windowMs)}`,
                  "Algorithm": config.rateLimit.algorithm
                }}
                columns={1}
              />
            </VStack>
          </SectionCard>

          {/* Path Overrides */}
          {config.rateLimit.overrides && (
            <SectionCard title="Path Overrides">
              {config.rateLimit.overrides ? (
                <Text fontSize="sm" fontFamily="mono" bg="gray.50" p={3} borderRadius="md">
                  {config.rateLimit.overrides}
                </Text>
              ) : (
                <Text fontSize="sm" color="gray.500">No path overrides configured</Text>
              )}
              <Text fontSize="xs" color="gray.500">
                Format: pathPrefix:max[:algorithm];... (e.g., "/api/auth:30:sliding;/api/upload:5")
              </Text>
            </SectionCard>
          )}

          {/* Role Overrides */}
          {config.rateLimit.roleOverrides && (
            <SectionCard title="Role-based Overrides">
              {config.rateLimit.roleOverrides ? (
                <Text fontSize="sm" fontFamily="mono" bg="gray.50" p={3} borderRadius="md">
                  {config.rateLimit.roleOverrides}
                </Text>
              ) : (
                <Text fontSize="sm" color="gray.500">No role overrides configured</Text>
              )}
              <Text fontSize="xs" color="gray.500">
                Format: role|pathPrefix:max[:algorithm];... (e.g., "admin|/api:1000;user|/api:100")
              </Text>
            </SectionCard>
          )}

          {/* Status Information */}
          <SectionCard title="Rate Limiting Status">
            <KeyValueGrid
              data={{
                "Redis Available": "Check server logs",
                "Failsafe Mode": "Disabled on Redis errors",
                "Exempt Paths": "/health, /readiness",
                "Headers Set": "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset"
              }}
              columns={1}
            />
          </SectionCard>
        </VStack>
      )}
    </Box>
  );
}