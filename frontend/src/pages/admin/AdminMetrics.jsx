// frontend/src/pages/admin/AdminMetrics.jsx
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
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  useToast
} from '@chakra-ui/react';
import { FaSync, FaChartBar } from 'react-icons/fa';
import { getPrometheusMetrics, getAdminMetrics } from '../../api/adminRuntime.js';
import SectionCard from '../../components/admin/common/SectionCard.jsx';

/**
 * Parse Prometheus metrics text format into structured data
 */
function parsePrometheusMetrics(text) {
  const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  const metrics = {
    counters: [],
    gauges: [],
    histograms: [],
    summaries: []
  };

  lines.forEach(line => {
    const [nameAndLabels, value] = line.split(' ');
    if (!nameAndLabels || value === undefined) return;

    const metric = {
      name: nameAndLabels,
      value: parseFloat(value) || 0,
      labels: {}
    };

    // Extract labels if present
    const labelMatch = nameAndLabels.match(/^([^{]+)(\{.*\})?$/);
    if (labelMatch) {
      metric.name = labelMatch[1];
      if (labelMatch[2]) {
        // Simple label parsing
        const labelText = labelMatch[2].slice(1, -1); // Remove { }
        labelText.split(',').forEach(pair => {
          const [key, val] = pair.split('=');
          if (key && val) {
            metric.labels[key.trim()] = val.replace(/"/g, '').trim();
          }
        });
      }
    }

    // Categorize by metric type
    if (metric.name.includes('_total') || metric.name.includes('_count')) {
      metrics.counters.push(metric);
    } else if (metric.name.includes('_bucket') || metric.name.includes('_sum')) {
      metrics.histograms.push(metric);
    } else {
      metrics.gauges.push(metric);
    }
  });

  return metrics;
}

export default function AdminMetrics() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prometheusData, setPrometheusData] = useState(null);
  const [adminMetrics, setAdminMetrics] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const toast = useToast();

  const loadMetrics = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Try to load Prometheus metrics
      const prometheusResult = await getPrometheusMetrics();
      if (prometheusResult.success) {
        const parsed = parsePrometheusMetrics(prometheusResult.data);
        setPrometheusData(parsed);
      } else {
        setError(prometheusResult.error);
      }

      // Load admin metrics (always available)
      const adminResult = await getAdminMetrics();
      setAdminMetrics(adminResult);
      
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(`Failed to load metrics: ${err.message}`);
      toast({
        title: "Failed to load metrics",
        description: err.message,
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const MetricsTable = ({ title, metrics, valueFormatter = (v) => v.toLocaleString() }) => (
    <SectionCard title={title}>
      {metrics.length === 0 ? (
        <Text fontSize="sm" color="gray.500">No metrics available</Text>
      ) : (
        <TableContainer maxH="300px" overflowY="auto">
          <Table size="sm" variant="simple">
            <Thead position="sticky" top={0} bg="white">
              <Tr>
                <Th>Metric</Th>
                <Th>Labels</Th>
                <Th isNumeric>Value</Th>
              </Tr>
            </Thead>
            <Tbody>
              {metrics.map((metric, index) => (
                <Tr key={index}>
                  <Td fontSize="xs" fontFamily="mono">{metric.name}</Td>
                  <Td fontSize="xs">
                    {Object.keys(metric.labels).length > 0 ? (
                      <VStack align="start" spacing={1}>
                        {Object.entries(metric.labels).map(([key, value]) => (
                          <Badge key={key} size="sm" variant="outline">
                            {key}={value}
                          </Badge>
                        ))}
                      </VStack>
                    ) : (
                      <Text color="gray.400">—</Text>
                    )}
                  </Td>
                  <Td isNumeric fontFamily="mono" fontSize="sm">
                    {valueFormatter(metric.value)}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </SectionCard>
  );

  return (
    <Box layerStyle="cardBlue" w="100%" p={{ base: 2, md: 4 }}>
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={2}>
        <VStack align="start" spacing={1}>
          <HStack>
            <FaChartBar />
            <Heading size="md">Metrics</Heading>
          </HStack>
          {lastUpdated && (
            <Text fontSize="xs" color="gray.500">
              Last updated: {lastUpdated}
            </Text>
          )}
        </VStack>
        <Button
          size="sm"
          leftIcon={<FaSync />}
          onClick={loadMetrics}
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
          <Text>Loading metrics...</Text>
        </VStack>
      )}

      {error && (
        <Alert status="warning" mb={4}>
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">Metrics Collection Issue</Text>
            <Text fontSize="sm">{error}</Text>
            <Text fontSize="xs" color="gray.600">
              This is normal if metrics collection is disabled or if the /metrics endpoint is not configured.
            </Text>
          </VStack>
        </Alert>
      )}

      {adminMetrics && (
        <SectionCard title="System Metrics" mb={4}>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.600">Uptime</Text>
              <Text fontSize="lg" fontFamily="mono">
                {Math.floor(adminMetrics.metrics?.system?.uptime || 0)}s
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.600">Memory Usage</Text>
              <Text fontSize="lg" fontFamily="mono">
                {Math.round((adminMetrics.metrics?.system?.memory?.used || 0) / 1024 / 1024)}MB
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.600">Platform</Text>
              <Text fontSize="lg" fontFamily="mono">
                {adminMetrics.metrics?.system?.platform || 'Unknown'}
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.600">Node Version</Text>
              <Text fontSize="lg" fontFamily="mono">
                {adminMetrics.metrics?.system?.nodeVersion || 'Unknown'}
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.600">Process ID</Text>
              <Text fontSize="lg" fontFamily="mono">
                {adminMetrics.metrics?.system?.pid || 'Unknown'}
              </Text>
            </Box>
          </SimpleGrid>
        </SectionCard>
      )}

      {prometheusData && (
        <VStack spacing={4} align="stretch">
          <MetricsTable title="Counters" metrics={prometheusData.counters} />
          <MetricsTable title="Gauges" metrics={prometheusData.gauges} />
          <MetricsTable title="Histograms" metrics={prometheusData.histograms} />
        </VStack>
      )}

      {!loading && !prometheusData && !error && (
        <SectionCard title="Raw Metrics Fallback">
          <Alert status="info">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <Text>Prometheus metrics are not available.</Text>
              <Text fontSize="sm">
                This could be because metrics collection is disabled or the endpoint is not accessible.
                Enable metrics by setting ENABLE_METRICS=true in your environment.
              </Text>
            </VStack>
          </Alert>
        </SectionCard>
      )}
    </Box>
  );
}