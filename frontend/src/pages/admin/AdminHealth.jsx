// frontend/src/pages/admin/AdminHealth.jsx
// Health and readiness dashboard
import React, { useState, useEffect, useCallback } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  Alert,
  AlertIcon,
  Spinner,
  SimpleGrid,
  Badge,
  Switch,
  useToast
} from '@chakra-ui/react';
import { FaSync, FaHeartbeat, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { fetchHealth, fetchReadiness } from '../../api/adminRuntime.js';
import SectionCard from '../../components/admin/common/SectionCard.jsx';
import KeyValueGrid from '../../components/admin/common/KeyValueGrid.jsx';

const AdminHealth = () => {
  const [healthData, setHealthData] = useState(null);
  const [readinessData, setReadinessData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const toast = useToast();

  // Fetch health and readiness data
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');

    try {
      const [healthResult, readinessResult] = await Promise.all([
        fetchHealth(),
        fetchReadiness()
      ]);
      
      if (healthResult.success) {
        setHealthData(healthResult.data);
        setBackendAvailable(true);
      } else {
        setError(healthResult.error);
        setBackendAvailable(healthResult.backendAvailable);
      }
      
      if (readinessResult.success) {
        setReadinessData(readinessResult.data);
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch health data');
      setBackendAvailable(false);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh management
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchData(false); // Don't show loading for background updates
      }, 30000); // 30 seconds
      
      setRefreshInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [autoRefresh, fetchData]);

  // Format uptime
  const formatUptime = (seconds) => {
    if (!seconds) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Get status badge
  const getStatusBadge = (status, ready = null) => {
    if (status === 'healthy' && (ready === null || ready === true)) {
      return <Badge colorScheme="green" leftIcon={<FaCheckCircle />}>Healthy</Badge>;
    } else if (ready === false) {
      return <Badge colorScheme="yellow" leftIcon={<FaTimesCircle />}>Not Ready</Badge>;
    } else {
      return <Badge colorScheme="red" leftIcon={<FaTimesCircle />}>Unhealthy</Badge>;
    }
  };

  if (!backendAvailable) {
    return (
      <SectionCard title="Health Status">
        <Alert status="warning">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text>Backend health endpoints are not available.</Text>
            <Text fontSize="sm" color="gray.600">
              Please ensure the backend is running and accessible.
            </Text>
          </VStack>
        </Alert>
      </SectionCard>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <SectionCard 
        title="Health & Readiness Status"
        headerContent={
          <HStack>
            <HStack>
              <Switch
                isChecked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                colorScheme="brand"
                size="sm"
              />
              <Text fontSize="sm">Auto-refresh (30s)</Text>
              {autoRefresh && <Badge colorScheme="green" fontSize="xs">ON</Badge>}
            </HStack>
            <Button
              size="sm"
              leftIcon={<FaSync />}
              onClick={() => fetchData()}
              isLoading={loading}
              variant="outline"
            >
              Refresh
            </Button>
          </HStack>
        }
      >
        {lastUpdated && (
          <Text fontSize="xs" color="gray.500" textAlign="center">
            Last updated: {lastUpdated.toLocaleString()}
          </Text>
        )}
      </SectionCard>

      {/* Error Display */}
      {error && (
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <HStack justify="center" py={4}>
          <Spinner size="sm" />
          <Text>Loading health status...</Text>
        </HStack>
      )}

      {/* Status Overview */}
      {!loading && (healthData || readinessData) && (
        <SectionCard title="Status Overview">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {/* Health Status */}
            {healthData && (
              <VStack spacing={3}>
                <HStack>
                  <FaHeartbeat />
                  <Text fontWeight="medium">Health</Text>
                  {getStatusBadge(healthData.status)}
                </HStack>
                <KeyValueGrid 
                  data={{
                    uptime: formatUptime(healthData.uptime),
                    environment: healthData.environment || 'Unknown',
                    version: healthData.version || 'Unknown',
                    commit: healthData.commit ? healthData.commit.substring(0, 8) : 'Unknown'
                  }}
                  columns={1}
                />
              </VStack>
            )}

            {/* Readiness Status */}
            {readinessData && (
              <VStack spacing={3}>
                <HStack>
                  <FaCheckCircle />
                  <Text fontWeight="medium">Readiness</Text>
                  {getStatusBadge('healthy', readinessData.ready)}
                </HStack>
                <KeyValueGrid 
                  data={{
                    ready: readinessData.ready ? 'Yes' : 'No',
                    redisRequired: readinessData.requirements?.redisRequired ? 'Yes' : 'No'
                  }}
                  columns={1}
                />
              </VStack>
            )}
          </SimpleGrid>
        </SectionCard>
      )}

      {/* Detailed Information */}
      {!loading && healthData && (
        <SectionCard title="System Information">
          <KeyValueGrid 
            data={{
              timestamp: new Date(healthData.timestamp).toLocaleString(),
              buildTime: healthData.buildTime || 'Unknown',
              nodeVersion: process?.version || 'Unknown',
              environment: healthData.environment || 'Unknown'
            }}
          />
        </SectionCard>
      )}

      {/* Dependencies Status */}
      {!loading && (healthData?.redis || readinessData?.checks) && (
        <SectionCard title="Dependencies">
          <VStack spacing={4} align="stretch">
            {/* Redis Status */}
            {healthData?.redis && (
              <HStack justify="space-between">
                <Text fontWeight="medium">Redis</Text>
                <HStack>
                  {healthData.redis.connected ? (
                    <Badge colorScheme="green">Connected</Badge>
                  ) : (
                    <Badge colorScheme="red">Disconnected</Badge>
                  )}
                  {healthData.redis.error && (
                    <Text fontSize="xs" color="red.500">
                      {healthData.redis.error}
                    </Text>
                  )}
                </HStack>
              </HStack>
            )}

            {/* Other Checks from Readiness */}
            {readinessData?.checks && Object.entries(readinessData.checks).map(([key, check]) => (
              <HStack key={key} justify="space-between">
                <Text fontWeight="medium">{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                <HStack>
                  {check.connected ? (
                    <Badge colorScheme="green">OK</Badge>
                  ) : (
                    <Badge colorScheme="red">Failed</Badge>
                  )}
                  {check.error && (
                    <Text fontSize="xs" color="red.500">
                      {check.error}
                    </Text>
                  )}
                </HStack>
              </HStack>
            ))}
          </VStack>
        </SectionCard>
      )}

      {/* Runtime Configuration Info */}
      {!loading && healthData?.runtime && (
        <SectionCard title="Runtime Configuration">
          <KeyValueGrid 
            data={{
              rateLimitAlgorithm: healthData.runtime.rateLimitAlgorithm || 'Unknown',
              metricsEnabled: healthData.runtime.metricsEnabled ? 'Yes' : 'No'
            }}
          />
        </SectionCard>
      )}

      {/* Rate Limiter Status */}
      {!loading && healthData?.rateLimiter && (
        <SectionCard title="Rate Limiter">
          <KeyValueGrid 
            data={{
              algorithm: healthData.rateLimiter.algorithm || 'Unknown',
              enabled: healthData.rateLimiter.enabled ? 'Yes' : 'No'
            }}
          />
        </SectionCard>
      )}

      {/* Empty State */}
      {!loading && !healthData && !readinessData && !error && (
        <SectionCard>
          <VStack py={8} spacing={4}>
            <Text color="gray.500" fontSize="lg">No health data available</Text>
            <Text color="gray.400" fontSize="sm" textAlign="center">
              Unable to fetch health information from the backend.
            </Text>
          </VStack>
        </SectionCard>
      )}
    </VStack>
  );
};

export default AdminHealth;