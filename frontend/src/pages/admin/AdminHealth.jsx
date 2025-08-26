// frontend/src/pages/admin/AdminHealth.jsx
// Admin Health monitoring tab
import React, { useState, useEffect, useCallback } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  useToast,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Box,
  Switch,
  Spinner,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { FaSync, FaHeartbeat, FaCheckCircle } from 'react-icons/fa';
import { client } from '../../api/client';
import SectionCard from '../../components/admin/common/SectionCard';
import KeyValueGrid from '../../components/admin/common/KeyValueGrid';

export default function AdminHealth() {
  const [healthData, setHealthData] = useState(null);
  const [readinessData, setReadinessData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const toast = useToast();

  const fetchHealthData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthResponse, readinessResponse] = await Promise.all([
        client.get('/health'),
        client.get('/readiness')
      ]);
      
      setHealthData(healthResponse.data);
      setReadinessData(readinessResponse.data);
    } catch (error) {
      toast({
        title: "Failed to fetch health data",
        description: error.message,
        status: "error",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, 15000); // 15 seconds
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [autoRefresh, fetchHealthData]);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getStatusColor = (status) => {
    return status === 'healthy' || status === true ? 'green' : 'red';
  };

  const headerActions = (
    <HStack spacing={3}>
      <HStack>
        <Text fontSize="sm">Auto-refresh (15s)</Text>
        <Switch
          isChecked={autoRefresh}
          onChange={(e) => setAutoRefresh(e.target.checked)}
          colorScheme="green"
          size="sm"
        />
      </HStack>
      <Button
        size="sm"
        leftIcon={<FaSync />}
        onClick={fetchHealthData}
        isLoading={loading}
        variant="outline"
        colorScheme="blue"
      >
        Refresh
      </Button>
    </HStack>
  );

  return (
    <VStack spacing={6} align="stretch">
      <SectionCard title="System Health & Status" headerActions={headerActions}>
        {!healthData && !readinessData && loading && (
          <Box textAlign="center" py={8}>
            <Spinner size="lg" />
            <Text mt={2}>Loading health data...</Text>
          </Box>
        )}

        {(healthData || readinessData) && (
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            {/* Health Status */}
            {healthData && (
              <Box>
                <HStack mb={4} align="center">
                  <FaHeartbeat />
                  <Text fontSize="lg" fontWeight="bold">Health Status</Text>
                  <Badge colorScheme={getStatusColor(healthData.status)} size="lg">
                    {healthData.status?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </HStack>
                
                <VStack spacing={4}>
                  <Stat>
                    <StatLabel>System Uptime</StatLabel>
                    <StatNumber fontSize="lg">
                      {formatUptime(healthData.uptime || 0)}
                    </StatNumber>
                    <StatHelpText>
                      Since: {healthData.timestamp ? new Date(healthData.timestamp).toLocaleString() : 'Unknown'}
                    </StatHelpText>
                  </Stat>

                  <SimpleGrid columns={2} spacing={4} w="full">
                    <Stat>
                      <StatLabel>Commit</StatLabel>
                      <StatNumber fontSize="md" fontFamily="mono">
                        {healthData.commit || 'Unknown'}
                      </StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel>Environment</StatLabel>
                      <StatNumber fontSize="md">
                        {healthData.environment || 'Unknown'}
                      </StatNumber>
                    </Stat>
                  </SimpleGrid>

                  {healthData.redis && (
                    <Box w="full">
                      <Text fontWeight="bold" mb={2}>Redis Status</Text>
                      <HStack>
                        <Text>Connected:</Text>
                        <Badge colorScheme={getStatusColor(healthData.redis.connected)}>
                          {healthData.redis.connected ? 'Yes' : 'No'}
                        </Badge>
                        {healthData.redis.error && (
                          <Text fontSize="sm" color="red.500">
                            ({healthData.redis.error})
                          </Text>
                        )}
                      </HStack>
                    </Box>
                  )}

                  {healthData.rateLimiter && (
                    <Box w="full">
                      <Text fontWeight="bold" mb={2}>Rate Limiter</Text>
                      <HStack>
                        <Text>Algorithm:</Text>
                        <Badge colorScheme="blue">
                          {healthData.rateLimiter.algorithm || 'Unknown'}
                        </Badge>
                        <Text>Enabled:</Text>
                        <Badge colorScheme={getStatusColor(healthData.rateLimiter.enabled)}>
                          {healthData.rateLimiter.enabled ? 'Yes' : 'No'}
                        </Badge>
                      </HStack>
                    </Box>
                  )}
                </VStack>
              </Box>
            )}

            {/* Readiness Status */}
            {readinessData && (
              <Box>
                <HStack mb={4} align="center">
                  <FaCheckCircle />
                  <Text fontSize="lg" fontWeight="bold">Readiness Status</Text>
                  <Badge colorScheme={getStatusColor(readinessData.ready)} size="lg">
                    {readinessData.ready ? 'READY' : 'NOT READY'}
                  </Badge>
                </HStack>

                {!readinessData.ready && (
                  <Alert status="warning" mb={4}>
                    <AlertIcon />
                    Service is not ready to accept traffic
                  </Alert>
                )}

                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontWeight="bold" mb={2}>Dependency Checks</Text>
                    {readinessData.checks && Object.entries(readinessData.checks).map(([name, check]) => (
                      <HStack key={name} justify="space-between">
                        <Text>{name}:</Text>
                        <Badge colorScheme={getStatusColor(check.connected || check.status)}>
                          {check.connected ? 'Connected' : check.status || 'Failed'}
                        </Badge>
                        {check.error && (
                          <Text fontSize="xs" color="red.500">
                            {check.error}
                          </Text>
                        )}
                      </HStack>
                    ))}
                  </Box>

                  <Box>
                    <Text fontWeight="bold" mb={2}>Requirements</Text>
                    {readinessData.requirements && Object.entries(readinessData.requirements).map(([key, value]) => (
                      <HStack key={key} justify="space-between">
                        <Text>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</Text>
                        <Badge colorScheme={value ? 'red' : 'gray'}>
                          {value ? 'Required' : 'Optional'}
                        </Badge>
                      </HStack>
                    ))}
                  </Box>
                </VStack>
              </Box>
            )}
          </SimpleGrid>
        )}
      </SectionCard>

      {/* Version and Build Information */}
      {healthData && (
        <SectionCard title="Version Information">
          <KeyValueGrid
            data={{
              version: healthData.version || 'Unknown',
              commit: healthData.commit || 'Unknown',
              buildTime: healthData.buildTime ? new Date(healthData.buildTime).toLocaleString() : 'Unknown',
              environment: healthData.environment || 'Unknown',
              nodeVersion: process.version || 'Unknown'
            }}
          />
        </SectionCard>
      )}
    </VStack>
  );
}