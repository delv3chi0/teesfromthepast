// frontend/src/pages/admin/AdminMetrics.jsx
// Admin page for viewing system metrics

import React, { useState, useEffect, useRef } from 'react';
import { 
  VStack, 
  HStack,
  Text, 
  Button,
  Switch,
  Alert,
  AlertIcon,
  Code,
  Box,
  Spinner,
  Badge,
  Divider,
  SimpleGrid
} from '@chakra-ui/react';
import { FaSync, FaPlay, FaPause } from 'react-icons/fa';

import SectionCard from '../../components/admin/common/SectionCard.jsx';
import { fetchMetricsData } from '../../api/adminRuntime.js';

const AdminMetrics = () => {
  const [metricsData, setMetricsData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const autoRefreshTimer = useRef(null);
  const REFRESH_INTERVAL = 10000; // 10 seconds

  // Parse Prometheus metrics for basic grouping
  const parseMetrics = (metricsText) => {
    if (!metricsText) return { groups: {}, total: 0 };
    
    const lines = metricsText.split('\n');
    const groups = {};
    let total = 0;
    
    lines.forEach(line => {
      if (line.startsWith('#') || !line.trim()) return;
      
      const metricName = line.split(' ')[0] || line.split('{')[0];
      if (!metricName) return;
      
      total++;
      
      // Group by metric prefix (e.g., 'http_', 'nodejs_', etc.)
      const prefix = metricName.split('_')[0] || 'other';
      if (!groups[prefix]) {
        groups[prefix] = { count: 0, metrics: [] };
      }
      groups[prefix].count++;
      groups[prefix].metrics.push(line);
    });
    
    return { groups, total };
  };

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await fetchMetricsData();
      setMetricsData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.fallback ? 
        'Metrics endpoint not available or metrics disabled' : 
        err.error || 'Failed to fetch metrics'
      );
      setMetricsData('');
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
      autoRefreshTimer.current = setInterval(fetchMetrics, REFRESH_INTERVAL);
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
    fetchMetrics();
  }, []);

  const { groups, total } = parseMetrics(metricsData);
  const groupEntries = Object.entries(groups).sort((a, b) => b[1].count - a[1].count);

  return (
    <VStack spacing={6} align="stretch">
      <SectionCard title="System Metrics">
        <HStack justify="space-between" align="center">
          <HStack spacing={4}>
            <Button
              leftIcon={loading ? <Spinner size="sm" /> : <FaSync />}
              onClick={fetchMetrics}
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
          <Alert status="warning">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {metricsData && !error && (
          <>
            <HStack spacing={4} justify="space-between">
              <Badge colorScheme="blue" variant="subtle">
                Total Metrics: {total}
              </Badge>
              <Badge colorScheme="green" variant="subtle">
                Metric Groups: {groupEntries.length}
              </Badge>
            </HStack>

            <Divider />

            {/* Metrics Groups Summary */}
            <Text fontSize="md" fontWeight="semibold" color="gray.700">
              Metrics by Category
            </Text>
            
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
              {groupEntries.map(([groupName, groupData]) => (
                <Box
                  key={groupName}
                  p={3}
                  borderWidth={1}
                  borderColor="gray.200"
                  borderRadius="md"
                  bg="gray.50"
                >
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                      {groupName}_*
                    </Text>
                    <Badge size="sm" colorScheme="blue">
                      {groupData.count}
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color="gray.500" noOfLines={2}>
                    {groupData.metrics.slice(0, 2).map(m => m.split(' ')[0]).join(', ')}
                    {groupData.count > 2 && '...'}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>

            <Divider />

            {/* Raw Metrics Data */}
            <Text fontSize="md" fontWeight="semibold" color="gray.700">
              Raw Metrics Data (Prometheus Format)
            </Text>
            
            <Box
              borderWidth={1}
              borderColor="gray.200"
              borderRadius="md"
              overflow="hidden"
            >
              <Box
                as="pre"
                p={4}
                fontSize="xs"
                lineHeight="1.4"
                overflowX="auto"
                maxHeight="400px"
                overflowY="auto"
                bg="gray.50"
                fontFamily="mono"
                whiteSpace="pre-wrap"
                wordBreak="break-all"
              >
                <Code 
                  variant="unstyled"
                  fontSize="inherit"
                  fontFamily="inherit"
                  whiteSpace="inherit"
                  wordBreak="inherit"
                >
                  {metricsData}
                </Code>
              </Box>
            </Box>
          </>
        )}

        {!metricsData && !loading && !error && (
          <Alert status="info">
            <AlertIcon />
            No metrics data available. Click refresh to fetch metrics.
          </Alert>
        )}
      </SectionCard>
    </VStack>
  );
};

export default AdminMetrics;