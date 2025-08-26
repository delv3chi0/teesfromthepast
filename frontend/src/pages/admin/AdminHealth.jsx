// frontend/src/pages/admin/AdminHealth.jsx
// Admin page for viewing system health and readiness

import React, { useState, useEffect, useRef } from 'react';
import { 
  VStack, 
  HStack,
  Text, 
  Button,
  Switch,
  Alert,
  AlertIcon,
  Badge,
  Divider,
  SimpleGrid,
  Box,
  Icon
} from '@chakra-ui/react';
import { FaSync, FaHeartbeat, FaCheckCircle, FaExclamationTriangle, FaClock } from 'react-icons/fa';

import SectionCard from '../../components/admin/common/SectionCard.jsx';
import KeyValueGrid from '../../components/admin/common/KeyValueGrid.jsx';
import { fetchHealthData, fetchReadinessData } from '../../api/adminRuntime.js';

const AdminHealth = () => {
  const [healthData, setHealthData] = useState(null);
  const [readinessData, setReadinessData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const autoRefreshTimer = useRef(null);
  const REFRESH_INTERVAL = 10000; // 10 seconds

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [health, readiness] = await Promise.all([
        fetchHealthData(),
        fetchReadinessData()
      ]);
      
      setHealthData(health);
      setReadinessData(readiness);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.error || 'Failed to fetch health data');
      setHealthData(null);
      setReadinessData(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Setup auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshTimer.current = setInterval(fetchData, REFRESH_INTERVAL);
    } else {
      if (autoRefreshTimer.current) {
        clearInterval(autoRefreshTimer.current);
        autoRefreshTimer.current = null;
      }
    }

    return () => {
      if (autoRefreshTimer.current) {
        clearInterval(autoRefreshTimer.current);
      }
    };
  }, [autoRefresh]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  const formatUptime = (seconds) => {
    if (!seconds) return 'Unknown';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${secs}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getStatusColor = (status, isHealthy) => {
    if (status === 'healthy' || isHealthy) return 'green';
    if (status === 'unhealthy' || status === false) return 'red';
    return 'yellow';
  };

  const healthStatusData = healthData ? [
    { 
      label: 'Overall Status', 
      value: healthData.status,
      badge: { colorScheme: getStatusColor(healthData.status) }
    },
    { 
      label: 'Uptime', 
      value: formatUptime(healthData.uptime) 
    },
    { 
      label: 'Version', 
      value: healthData.version || 'Unknown'
    },
    { 
      label: 'Commit', 
      value: healthData.commit || 'Unknown',
      mono: true
    },
    { 
      label: 'Build Time', 
      value: healthData.buildTime ? new Date(healthData.buildTime).toLocaleString() : 'Unknown'
    },
    { 
      label: 'Environment', 
      value: healthData.environment?.mode || 'Unknown',
      badge: { 
        colorScheme: healthData.environment?.mode === 'production' ? 'red' : 'blue' 
      }
    }
  ] : [];

  const runtimeStatusData = healthData?.runtime ? [
    { 
      label: 'Rate Limit Algorithm', 
      value: healthData.runtime.rateLimitAlgorithm,
      badge: { colorScheme: 'blue' }
    },
    { 
      label: 'Metrics Enabled', 
      value: healthData.runtime.metricsEnabled ? 'Yes' : 'No',
      badge: { 
        colorScheme: healthData.runtime.metricsEnabled ? 'green' : 'gray' 
      }
    }
  ] : [];

  const redisStatusData = healthData?.redis ? [
    { 
      label: 'Redis Connection', 
      value: healthData.redis.connected ? 'Connected' : 'Disconnected',
      badge: { 
        colorScheme: healthData.redis.connected ? 'green' : 'red' 
      }
    },
    ...(healthData.redis.error ? [{ 
      label: 'Redis Error', 
      value: healthData.redis.error,
      valueColor: 'red.500'
    }] : [])
  ] : [];

  return (
    <VStack spacing={6} align="stretch">
      <SectionCard title="System Health & Readiness">
        <HStack justify="space-between" align="center">
          <HStack spacing={4}>
            <Button
              leftIcon={<FaSync />}
              onClick={fetchData}
              isLoading={loading}
              size="sm"
              variant="outline"
            >
              Refresh
            </Button>
            
            <HStack spacing={2}>
              <Switch
                isChecked={autoRefresh}
                onChange={toggleAutoRefresh}
                colorScheme="blue"
                size="sm"
              />
              <Text fontSize="sm" color="gray.600">
                Auto-refresh (10s)
              </Text>
              {autoRefresh && <Badge colorScheme="green" size="sm">ON</Badge>}
            </HStack>
          </HStack>
          
          {lastUpdated && (
            <Text fontSize="xs" color="gray.500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          )}
        </HStack>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {healthData && readinessData && (
          <>
            {/* Status Overview */}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Box p={4} borderWidth={1} borderRadius="md" bg="green.50" borderColor="green.200">
                <HStack spacing={3}>
                  <Icon as={FaHeartbeat} color="green.500" boxSize={6} />
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="medium" color="green.700">
                      Health Status
                    </Text>
                    <Badge colorScheme={getStatusColor(healthData.status)} size="lg">
                      {healthData.status?.toUpperCase()}
                    </Badge>
                  </VStack>
                </HStack>
              </Box>

              <Box 
                p={4} 
                borderWidth={1} 
                borderRadius="md" 
                bg={readinessData.ready ? "green.50" : "red.50"}
                borderColor={readinessData.ready ? "green.200" : "red.200"}
              >
                <HStack spacing={3}>
                  <Icon 
                    as={readinessData.ready ? FaCheckCircle : FaExclamationTriangle} 
                    color={readinessData.ready ? "green.500" : "red.500"} 
                    boxSize={6} 
                  />
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="medium" color={readinessData.ready ? "green.700" : "red.700"}>
                      Readiness Status
                    </Text>
                    <Badge colorScheme={readinessData.ready ? "green" : "red"} size="lg">
                      {readinessData.ready ? "READY" : "NOT READY"}
                    </Badge>
                  </VStack>
                </HStack>
              </Box>
            </SimpleGrid>

            <Divider />

            {/* Health Details */}
            <Text fontSize="md" fontWeight="semibold">Health Information</Text>
            <KeyValueGrid data={healthStatusData} columns={2} />

            {runtimeStatusData.length > 0 && (
              <>
                <Divider />
                <Text fontSize="md" fontWeight="semibold">Runtime Configuration</Text>
                <KeyValueGrid data={runtimeStatusData} columns={2} />
              </>
            )}

            {redisStatusData.length > 0 && (
              <>
                <Divider />
                <Text fontSize="md" fontWeight="semibold">Dependencies</Text>
                <KeyValueGrid data={redisStatusData} columns={1} />
              </>
            )}

            {/* Readiness Details */}
            {readinessData.checks && (
              <>
                <Divider />
                <Text fontSize="md" fontWeight="semibold">Readiness Checks</Text>
                
                {Object.entries(readinessData.checks).map(([checkName, checkResult]) => (
                  <Box 
                    key={checkName}
                    p={3} 
                    borderWidth={1} 
                    borderRadius="md"
                    bg={checkResult.connected ? "green.50" : "red.50"}
                    borderColor={checkResult.connected ? "green.200" : "red.200"}
                  >
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="medium" textTransform="capitalize">
                        {checkName}
                      </Text>
                      <Badge colorScheme={checkResult.connected ? "green" : "red"}>
                        {checkResult.connected ? "PASS" : "FAIL"}
                      </Badge>
                    </HStack>
                    {checkResult.error && (
                      <Text fontSize="xs" color="red.600" mt={1}>
                        Error: {checkResult.error}
                      </Text>
                    )}
                  </Box>
                ))}

                {readinessData.requirements && (
                  <Alert status="info" size="sm">
                    <AlertIcon />
                    <Text fontSize="xs">
                      Redis required for readiness: {readinessData.requirements.redisRequired ? 'Yes' : 'No'}
                    </Text>
                  </Alert>
                )}
              </>
            )}
          </>
        )}

        {!healthData && !loading && !error && (
          <Alert status="info">
            <AlertIcon />
            Click refresh to fetch health and readiness data.
          </Alert>
        )}
      </SectionCard>
    </VStack>
  );
};

export default AdminHealth;