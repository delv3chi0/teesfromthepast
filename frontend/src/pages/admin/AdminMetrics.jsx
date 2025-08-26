// frontend/src/pages/admin/AdminMetrics.jsx
// Admin Metrics tab for monitoring system metrics
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Switch,
  Alert,
  AlertIcon,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  useToast,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText
} from '@chakra-ui/react';
import { FaSync, FaPause, FaPlay } from 'react-icons/fa';
import { client } from '../../api/client';
import SectionCard from '../../components/admin/common/SectionCard';

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const toast = useToast();

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.get('/metrics');
      
      // If response is plain text (Prometheus format), try to parse it
      if (typeof response.data === 'string') {
        const parsed = parsePrometheusMetrics(response.data);
        setMetrics({
          raw: response.data,
          parsed,
          timestamp: new Date().toISOString()
        });
      } else {
        setMetrics({
          data: response.data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      const errorMsg = err.response?.status === 404 
        ? 'Metrics endpoint not found. Please check if metrics are enabled.'
        : err.response?.status === 403
        ? 'Access denied. Admin privileges required.'
        : `Failed to fetch metrics: ${err.message}`;
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Simple Prometheus metrics parser
  const parsePrometheusMetrics = (text) => {
    const lines = text.split('\n');
    const metrics = {
      counters: {},
      gauges: {},
      histograms: {},
      summaries: {}
    };

    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;

      const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*(?:\{[^}]*\})?) (.+)$/);
      if (match) {
        const [, metricName, value] = match;
        const baseMetricName = metricName.split('{')[0];
        
        // Categorize by common suffixes
        if (metricName.includes('_total')) {
          metrics.counters[metricName] = parseFloat(value);
        } else if (metricName.includes('_bucket') || metricName.includes('_count') || metricName.includes('_sum')) {
          if (!metrics.histograms[baseMetricName]) metrics.histograms[baseMetricName] = {};
          metrics.histograms[baseMetricName][metricName] = parseFloat(value);
        } else {
          metrics.gauges[metricName] = parseFloat(value);
        }
      }
    }

    return metrics;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 10000); // 10 seconds
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
  }, [autoRefresh, fetchMetrics]);

  // Initial load
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const renderParsedMetrics = (parsed) => {
    const { counters, gauges, histograms } = parsed;

    return (
      <VStack spacing={6} align="stretch">
        {Object.keys(counters).length > 0 && (
          <Box>
            <Text fontSize="lg" fontWeight="bold" mb={3}>Counters</Text>
            <TableContainer>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Metric</Th>
                    <Th isNumeric>Value</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {Object.entries(counters).map(([name, value]) => (
                    <Tr key={name}>
                      <Td fontFamily="mono" fontSize="sm">{name}</Td>
                      <Td isNumeric>{value.toLocaleString()}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {Object.keys(gauges).length > 0 && (
          <Box>
            <Text fontSize="lg" fontWeight="bold" mb={3}>Gauges</Text>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {Object.entries(gauges).map(([name, value]) => (
                <Stat key={name} p={4} borderWidth="1px" borderRadius="md">
                  <StatLabel fontSize="xs" fontFamily="mono">{name}</StatLabel>
                  <StatNumber fontSize="lg">
                    {name.includes('memory') || name.includes('bytes') ? 
                      formatBytes(value) : 
                      name.includes('duration') || name.includes('time') ?
                      formatDuration(value) :
                      value.toLocaleString()
                    }
                  </StatNumber>
                </Stat>
              ))}
            </SimpleGrid>
          </Box>
        )}

        {Object.keys(histograms).length > 0 && (
          <Box>
            <Text fontSize="lg" fontWeight="bold" mb={3}>Histograms</Text>
            <TableContainer>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Metric</Th>
                    <Th>Buckets/Stats</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {Object.entries(histograms).map(([name, buckets]) => (
                    <Tr key={name}>
                      <Td fontFamily="mono" fontSize="sm">{name}</Td>
                      <Td fontSize="sm">
                        {Object.keys(buckets).length} buckets
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </VStack>
    );
  };

  const headerActions = (
    <HStack spacing={3}>
      <HStack>
        <Text fontSize="sm">Auto-refresh (10s)</Text>
        <Switch
          isChecked={autoRefresh}
          onChange={(e) => setAutoRefresh(e.target.checked)}
          colorScheme="green"
          size="sm"
        />
        {autoRefresh ? <FaPause size={12} /> : <FaPlay size={12} />}
      </HStack>
      <Button
        size="sm"
        leftIcon={<FaSync />}
        onClick={fetchMetrics}
        isLoading={loading}
        variant="outline"
        colorScheme="blue"
      >
        Refresh
      </Button>
    </HStack>
  );

  return (
    <SectionCard title="System Metrics" headerActions={headerActions}>
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {loading && !metrics && (
        <Box textAlign="center" py={8}>
          <Spinner size="lg" />
          <Text mt={2}>Loading metrics...</Text>
        </Box>
      )}

      {metrics && !loading && (
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.600">
              Last updated: {new Date(metrics.timestamp).toLocaleString()}
            </Text>
            <Badge colorScheme="green">Live</Badge>
          </HStack>

          {metrics.parsed ? (
            renderParsedMetrics(metrics.parsed)
          ) : metrics.raw ? (
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={3}>Raw Metrics</Text>
              <Box
                bg="gray.50"
                p={4}
                borderRadius="md"
                overflowX="auto"
                maxHeight="400px"
                overflowY="auto"
              >
                <Text as="pre" fontSize="sm" fontFamily="mono">
                  {metrics.raw}
                </Text>
              </Box>
            </Box>
          ) : metrics.data ? (
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={3}>Metrics Data</Text>
              <Box
                bg="gray.50"
                p={4}
                borderRadius="md"
                overflowX="auto"
                maxHeight="400px"
                overflowY="auto"
              >
                <Text as="pre" fontSize="sm" fontFamily="mono">
                  {JSON.stringify(metrics.data, null, 2)}
                </Text>
              </Box>
            </Box>
          ) : (
            <Text color="gray.500">No metrics data available</Text>
          )}
        </VStack>
      )}
    </SectionCard>
  );
}