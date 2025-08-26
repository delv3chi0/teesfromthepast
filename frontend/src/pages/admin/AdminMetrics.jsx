// frontend/src/pages/admin/AdminMetrics.jsx
// Metrics dashboard with Prometheus exposition format parsing
import React, { useState, useEffect, useCallback } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  Switch,
  Alert,
  AlertIcon,
  Spinner,
  SimpleGrid,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import { FaSync, FaPlay, FaPause } from 'react-icons/fa';
import { fetchMetrics } from '../../api/adminRuntime.js';
import { parsePrometheusMetrics } from '../../api/adminRuntime.js';
import SectionCard from '../../components/admin/common/SectionCard.jsx';

const AdminMetrics = () => {
  const [metrics, setMetrics] = useState({ counters: [], gauges: [], histograms: [], other: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [backendAvailable, setBackendAvailable] = useState(true);

  // Fetch metrics
  const fetchMetricsData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');

    try {
      const result = await fetchMetrics();
      
      if (result.success) {
        // Check if response is Prometheus format (text/plain) or JSON
        if (result.contentType?.includes('text/plain') || typeof result.data === 'string') {
          const parsed = parsePrometheusMetrics(result.data);
          setMetrics(parsed);
        } else {
          // Handle JSON metrics response
          setMetrics({
            counters: [],
            gauges: [],
            histograms: [],
            other: [{ name: 'response', labels: {}, value: JSON.stringify(result.data, null, 2) }]
          });
        }
        
        setBackendAvailable(true);
        setLastUpdated(new Date());
      } else {
        setError(result.error);
        setBackendAvailable(result.backendAvailable);
        
        // Special handling for metrics disabled
        if (result.status === 403) {
          setError('Metrics access is restricted to admin users');
        } else if (!result.backendAvailable) {
          setMetrics({ counters: [], gauges: [], histograms: [], other: [] });
        }
      }
    } catch (err) {
      setError('Failed to fetch metrics');
      setBackendAvailable(false);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMetricsData();
  }, [fetchMetricsData]);

  // Auto-refresh management
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchMetricsData(false); // Don't show loading for background updates
      }, 10000); // 10 seconds
      
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
  }, [autoRefresh, fetchMetricsData]);

  // Render metric table
  const renderMetricTable = (metricsList, type) => {
    if (!metricsList || metricsList.length === 0) {
      return (
        <Text color="gray.500" textAlign="center" py={4}>
          No {type} metrics available
        </Text>
      );
    }

    return (
      <TableContainer>
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>Metric</Th>
              <Th>Value</Th>
              <Th>Labels</Th>
            </Tr>
          </Thead>
          <Tbody>
            {metricsList.map((metric, index) => (
              <Tr key={index}>
                <Td>
                  <Text fontFamily="mono" fontSize="sm">
                    {metric.name}
                  </Text>
                </Td>
                <Td>
                  <Badge colorScheme="blue" variant="outline">
                    {typeof metric.value === 'string' ? metric.value : metric.value.toLocaleString()}
                  </Badge>
                </Td>
                <Td>
                  {metric.labels && Object.keys(metric.labels).length > 0 ? (
                    <VStack align="start" spacing={1}>
                      {Object.entries(metric.labels).map(([key, value]) => (
                        <Text key={key} fontSize="xs" color="gray.600">
                          {key}={value}
                        </Text>
                      ))}
                    </VStack>
                  ) : (
                    <Text fontSize="xs" color="gray.400">—</Text>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    );
  };

  // Summary stats
  const totalMetrics = metrics.counters.length + metrics.gauges.length + metrics.histograms.length + metrics.other.length;

  if (!backendAvailable) {
    return (
      <SectionCard title="Metrics">
        <Alert status="warning">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text>Backend metrics endpoint is not available.</Text>
            <Text fontSize="sm" color="gray.600">
              Please ensure the backend is running and the metrics endpoint is accessible.
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
        title="Metrics Dashboard"
        headerContent={
          <HStack>
            <HStack>
              <Switch
                isChecked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                colorScheme="brand"
                size="sm"
              />
              <Text fontSize="sm">Auto-refresh (10s)</Text>
              {autoRefresh && <Badge colorScheme="green" fontSize="xs">ON</Badge>}
            </HStack>
            <Button
              size="sm"
              leftIcon={<FaSync />}
              onClick={() => fetchMetricsData()}
              isLoading={loading}
              variant="outline"
            >
              Refresh
            </Button>
          </HStack>
        }
      >
        {/* Summary */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="blue.500">
              {totalMetrics}
            </Text>
            <Text fontSize="sm" color="gray.600">Total Metrics</Text>
          </VStack>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="green.500">
              {metrics.counters.length}
            </Text>
            <Text fontSize="sm" color="gray.600">Counters</Text>
          </VStack>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="orange.500">
              {metrics.gauges.length}
            </Text>
            <Text fontSize="sm" color="gray.600">Gauges</Text>
          </VStack>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color="purple.500">
              {metrics.histograms.length}
            </Text>
            <Text fontSize="sm" color="gray.600">Histograms</Text>
          </VStack>
        </SimpleGrid>

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
          <Text>Loading metrics...</Text>
        </HStack>
      )}

      {/* Metrics Display */}
      {!loading && totalMetrics > 0 && (
        <SectionCard title="Metrics Details">
          <Tabs variant="enclosed" colorScheme="brand">
            <TabList>
              <Tab>
                Counters 
                <Badge ml={2} colorScheme="green" variant="subtle">
                  {metrics.counters.length}
                </Badge>
              </Tab>
              <Tab>
                Gauges 
                <Badge ml={2} colorScheme="orange" variant="subtle">
                  {metrics.gauges.length}
                </Badge>
              </Tab>
              <Tab>
                Histograms 
                <Badge ml={2} colorScheme="purple" variant="subtle">
                  {metrics.histograms.length}
                </Badge>
              </Tab>
              {metrics.other.length > 0 && (
                <Tab>
                  Other 
                  <Badge ml={2} colorScheme="gray" variant="subtle">
                    {metrics.other.length}
                  </Badge>
                </Tab>
              )}
            </TabList>

            <TabPanels>
              <TabPanel px={0}>
                {renderMetricTable(metrics.counters, 'counter')}
              </TabPanel>
              <TabPanel px={0}>
                {renderMetricTable(metrics.gauges, 'gauge')}
              </TabPanel>
              <TabPanel px={0}>
                {renderMetricTable(metrics.histograms, 'histogram')}
              </TabPanel>
              {metrics.other.length > 0 && (
                <TabPanel px={0}>
                  {renderMetricTable(metrics.other, 'other')}
                </TabPanel>
              )}
            </TabPanels>
          </Tabs>
        </SectionCard>
      )}

      {/* Empty State */}
      {!loading && totalMetrics === 0 && !error && (
        <SectionCard>
          <VStack py={8} spacing={4}>
            <Text color="gray.500" fontSize="lg">No metrics available</Text>
            <Text color="gray.400" fontSize="sm" textAlign="center">
              Metrics may be disabled or not yet collected.
              <br />
              Try refreshing or check the backend configuration.
            </Text>
          </VStack>
        </SectionCard>
      )}
    </VStack>
  );
};

export default AdminMetrics;