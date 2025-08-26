// frontend/src/pages/admin/AdminHealth.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  Badge,
  SimpleGrid,
  Select,
  useToast
} from '@chakra-ui/react';
import { FaHeartbeat, FaSync, FaServer, FaClock } from 'react-icons/fa';
import { getRuntimeConfig } from '../../api/adminRuntime.js';
import { client } from '../../api/client.js';
import SectionCard from '../../components/admin/common/SectionCard.jsx';
import KeyValueGrid from '../../components/admin/common/KeyValueGrid.jsx';

export default function AdminHealth() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [readinessData, setReadinessData] = useState(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);
  const toast = useToast();

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Load runtime config
      const configResult = await getRuntimeConfig();
      setConfig(configResult.config);

      // Load health status
      try {
        const healthResponse = await client.get('/health');
        setHealthData(healthResponse.data);
      } catch (err) {
        setHealthData({ status: 'error', error: err.message });
      }

      // Load readiness status
      try {
        const readinessResponse = await client.get('/readiness');
        setReadinessData(readinessResponse.data);
      } catch (err) {
        setReadinessData({ status: 'error', error: err.message });
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(`Failed to load data: ${err.message}`);
      toast({
        title: "Failed to load health data",
        description: err.message,
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (autoRefreshInterval > 0) {
      intervalRef.current = setInterval(loadAllData, autoRefreshInterval * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefreshInterval]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'ready':
      case 'ok':
        return 'green';
      case 'unhealthy':
      case 'not_ready':
      case 'error':
        return 'red';
      case 'degraded':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const formatMemory = (bytes) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <Box layerStyle="cardBlue" w="100%" p={{ base: 2, md: 4 }}>
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={2}>
        <VStack align="start" spacing={1}>
          <HStack>
            <FaHeartbeat />
            <Heading size="md">Health & Readiness</Heading>
          </HStack>
          {lastUpdated && (
            <Text fontSize="xs" color="gray.500">
              Last updated: {lastUpdated}
            </Text>
          )}
        </VStack>
        <HStack spacing={2}>
          <Select
            size="sm"
            value={autoRefreshInterval}
            onChange={(e) => setAutoRefreshInterval(parseInt(e.target.value))}
            w="150px"
          >
            <option value={0}>No auto-refresh</option>
            <option value={5}>Every 5 seconds</option>
            <option value={10}>Every 10 seconds</option>
            <option value={30}>Every 30 seconds</option>
            <option value={60}>Every 60 seconds</option>
          </Select>
          <Button
            size="sm"
            leftIcon={<FaSync />}
            onClick={loadAllData}
            isLoading={loading}
            variant="outline"
            color="black"
            borderColor="black"
          >
            Refresh
          </Button>
        </HStack>
      </HStack>

      {loading && (
        <VStack p={10}>
          <Spinner />
          <Text>Loading health status...</Text>
        </VStack>
      )}

      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      <VStack spacing={6} align="stretch">
        {/* Health & Readiness Status Cards */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <SectionCard title="Health Status">
            <VStack align="stretch" spacing={3}>
              {healthData ? (
                <>
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="medium">Status</Text>
                    <Badge colorScheme={getStatusColor(healthData.status)} size="lg">
                      {healthData.status || 'Unknown'}
                    </Badge>
                  </HStack>
                  {healthData.timestamp && (
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="medium">Timestamp</Text>
                      <Text fontSize="sm" fontFamily="mono">
                        {new Date(healthData.timestamp).toLocaleString()}
                      </Text>
                    </HStack>
                  )}
                  {healthData.error && (
                    <Alert status="error" size="sm">
                      <AlertIcon />
                      <Text fontSize="sm">{healthData.error}</Text>
                    </Alert>
                  )}
                </>
              ) : (
                <Text fontSize="sm" color="gray.500">No health data available</Text>
              )}
            </VStack>
          </SectionCard>

          <SectionCard title="Readiness Status">
            <VStack align="stretch" spacing={3}>
              {readinessData ? (
                <>
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="medium">Status</Text>
                    <Badge colorScheme={getStatusColor(readinessData.status)} size="lg">
                      {readinessData.status || 'Unknown'}
                    </Badge>
                  </HStack>
                  {readinessData.checks && (
                    <KeyValueGrid
                      data={readinessData.checks}
                      columns={1}
                    />
                  )}
                  {readinessData.error && (
                    <Alert status="error" size="sm">
                      <AlertIcon />
                      <Text fontSize="sm">{readinessData.error}</Text>
                    </Alert>
                  )}
                </>
              ) : (
                <Text fontSize="sm" color="gray.500">No readiness data available</Text>
              )}
            </VStack>
          </SectionCard>
        </SimpleGrid>

        {/* System Information */}
        {config && (
          <SectionCard title="System Information">
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
              <Box>
                <HStack spacing={2} mb={2}>
                  <FaServer color="gray" />
                  <Text fontSize="sm" fontWeight="semibold" color="gray.600">Platform</Text>
                </HStack>
                <Text fontSize="lg" fontFamily="mono">{config.versions.platform}</Text>
              </Box>
              
              <Box>
                <HStack spacing={2} mb={2}>
                  <FaClock color="gray" />
                  <Text fontSize="sm" fontWeight="semibold" color="gray.600">Uptime</Text>
                </HStack>
                <Text fontSize="lg" fontFamily="mono">{formatUptime(config.versions.uptime)}</Text>
              </Box>
              
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={2}>Node Version</Text>
                <Text fontSize="lg" fontFamily="mono">{config.versions.nodeVersion}</Text>
              </Box>
              
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={2}>Process ID</Text>
                <Text fontSize="lg" fontFamily="mono">{config.versions.pid}</Text>
              </Box>
            </SimpleGrid>
          </SectionCard>
        )}

        {/* Configuration Status */}
        {config && (
          <SectionCard title="Configuration Status">
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <KeyValueGrid
                data={{
                  "Environment": config.versions.env,
                  "Rate Limit Algorithm": config.rateLimit.algorithm,
                  "Metrics Enabled": config.metrics.ENABLE_METRICS ? "Yes" : "No",
                  "Request ID Header": config.tracing.REQUEST_ID_HEADER
                }}
                columns={1}
              />
              
              <KeyValueGrid
                data={{
                  "CSP Report Only": config.security.CSP_REPORT_ONLY ? "Yes" : "No",
                  "COEP Enabled": config.security.ENABLE_COEP ? "Yes" : "No",
                  "Rate Limit Max": config.rateLimit.globalMax.toLocaleString(),
                  "Rate Limit Window": `${config.rateLimit.windowMs / 1000}s`
                }}
                columns={1}
              />
            </SimpleGrid>
          </SectionCard>
        )}

        {/* Auto-refresh Info */}
        {autoRefreshInterval > 0 && (
          <Alert status="info">
            <AlertIcon />
            <Text fontSize="sm">
              Auto-refreshing every {autoRefreshInterval} seconds. 
              Set to "No auto-refresh" to disable.
            </Text>
          </Alert>
        )}
      </VStack>
    </Box>
  );
}