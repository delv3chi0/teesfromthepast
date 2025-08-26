// frontend/src/pages/admin/runtime/AdminMetrics.jsx
/**
 * Admin Metrics tab for displaying Prometheus metrics and system status
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  VStack,
  HStack,
  Button,
  Text,
  Alert,
  AlertIcon,
  Box,
  Select,
  Switch,
  FormControl,
  FormLabel,
  useToast,
  Spinner,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  SimpleGrid
} from '@chakra-ui/react';
import { FaSync, FaPlay, FaPause, FaDownload } from 'react-icons/fa';
import SectionCard from '../../../components/shared/SectionCard.jsx';
import KeyValueGrid from '../../../components/shared/KeyValueGrid.jsx';
import { client } from '../../../api/client.js';

/**
 * AdminMetrics component for displaying system metrics and status
 */
export default function AdminMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [metricsText, setMetricsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [metricsEnabled, setMetricsEnabled] = useState(true);
  
  const intervalRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchMetrics();
      }, refreshInterval * 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await client.get('/metrics');
      
      // Check if response is Prometheus metrics text format
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('text/plain') || contentType.includes('text/plain; version=0.0.4')) {
        setMetricsText(response.data);
        setMetricsEnabled(true);
        parseMetricsForStats(response.data);
      } else {
        // Likely JSON error response
        throw new Error('Metrics endpoint returned unexpected format');
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || err.message || 'Failed to fetch metrics';
      setError(errorMsg);
      
      if (err.response?.status === 404 || errorMsg.includes('METRICS_DISABLED')) {
        setMetricsEnabled(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const parseMetricsForStats = (metricsText) => {
    const lines = metricsText.split('\n');
    const parsed = {};
    
    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;
      
      const spaceIndex = line.lastIndexOf(' ');
      if (spaceIndex === -1) continue;
      
      const metricPart = line.substring(0, spaceIndex);
      const value = line.substring(spaceIndex + 1);
      
      // Extract metric name (before {)
      const braceIndex = metricPart.indexOf('{');
      const metricName = braceIndex !== -1 ? metricPart.substring(0, braceIndex) : metricPart;
      
      if (!parsed[metricName]) {
        parsed[metricName] = [];
      }
      parsed[metricName].push({ line: metricPart, value: parseFloat(value) || 0 });
    }
    
    setMetrics(parsed);
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([metricsText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `metrics-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Metrics downloaded',
        status: 'success',
        duration: 2000
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        status: 'error',
        duration: 3000
      });
    }
  };

  const getMetricSummary = () => {
    if (!metrics) return [];
    
    const summary = [];
    
    // HTTP request metrics
    if (metrics.http_requests_total) {
      const totalRequests = metrics.http_requests_total.reduce((sum, m) => sum + m.value, 0);
      summary.push({
        label: 'Total HTTP Requests',
        value: totalRequests.toLocaleString(),
        type: 'number'
      });
    }
    
    // Rate limited requests
    if (metrics.rate_limited_total) {
      const rateLimited = metrics.rate_limited_total.reduce((sum, m) => sum + m.value, 0);
      summary.push({
        label: 'Rate Limited Requests',
        value: rateLimited.toLocaleString(),
        type: 'number'
      });
    }
    
    // Redis errors
    if (metrics.redis_errors_total) {
      const redisErrors = metrics.redis_errors_total.reduce((sum, m) => sum + m.value, 0);
      summary.push({
        label: 'Redis Errors',
        value: redisErrors.toLocaleString(),
        type: 'number'
      });
    }
    
    // Process metrics
    if (metrics.process_resident_memory_bytes) {
      const memoryBytes = metrics.process_resident_memory_bytes[0]?.value || 0;
      const memoryMB = Math.round(memoryBytes / 1024 / 1024);
      summary.push({
        label: 'Memory Usage',
        value: `${memoryMB} MB`,
        type: 'text'
      });
    }
    
    if (metrics.process_cpu_user_seconds_total) {
      const cpuSeconds = metrics.process_cpu_user_seconds_total[0]?.value || 0;
      summary.push({
        label: 'CPU Time',
        value: `${cpuSeconds.toFixed(2)}s`,
        type: 'text'
      });
    }
    
    return summary;
  };

  const metricSummary = getMetricSummary();

  if (!metricsEnabled) {
    return (
      <SectionCard
        title="Metrics"
        subtitle="System metrics and monitoring"
        badge={
          <Badge colorScheme="red" variant="subtle">
            DISABLED
          </Badge>
        }
      >
        <Alert status="warning">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text>Metrics collection is disabled on this server.</Text>
            <Text fontSize="sm" color="gray.600">
              To enable metrics, set ENABLE_METRICS=true in the environment configuration.
            </Text>
          </VStack>
        </Alert>
      </SectionCard>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Controls */}
      <SectionCard
        title="Metrics"
        subtitle="System metrics and monitoring"
        badge={
          <Badge colorScheme="green" variant="subtle">
            ENABLED
          </Badge>
        }
        headerActions={
          <HStack spacing={2}>
            <Button
              size="sm"
              leftIcon={<FaSync />}
              onClick={fetchMetrics}
              isLoading={loading}
              variant="outline"
            >
              Refresh
            </Button>
            
            <Button
              size="sm"
              leftIcon={<FaDownload />}
              onClick={handleDownload}
              isDisabled={!metricsText}
              variant="outline"
            >
              Download
            </Button>
          </HStack>
        }
      >
        <VStack spacing={4} align="stretch">
          {/* Auto-refresh controls */}
          <HStack justify="space-between" align="center" wrap="wrap" gap={4}>
            <HStack spacing={4}>
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="auto-refresh" mb="0" fontSize="sm">
                  Auto-refresh
                </FormLabel>
                <Switch
                  id="auto-refresh"
                  isChecked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              </FormControl>
              
              {autoRefresh && (
                <HStack spacing={2}>
                  <Text fontSize="sm">Every</Text>
                  <Select
                    size="sm"
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    w="auto"
                  >
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                    <option value={30}>30s</option>
                    <option value={60}>1m</option>
                    <option value={300}>5m</option>
                  </Select>
                </HStack>
              )}
            </HStack>
            
            {lastUpdated && (
              <Text fontSize="sm" color="gray.600">
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
        </VStack>
      </SectionCard>

      {/* Metrics Summary */}
      {metricSummary.length > 0 && (
        <SectionCard title="Key Metrics" subtitle="Summary of important system metrics">
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            {metricSummary.map((metric, index) => (
              <Stat key={index} p={4} bg="gray.50" borderRadius="md">
                <StatLabel fontSize="xs" color="gray.600">
                  {metric.label}
                </StatLabel>
                <StatNumber fontSize="lg">
                  {metric.value}
                </StatNumber>
              </Stat>
            ))}
          </SimpleGrid>
        </SectionCard>
      )}

      {/* Raw Metrics */}
      {metricsText && (
        <SectionCard 
          title="Raw Metrics" 
          subtitle="Prometheus format metrics data"
          helpText="Raw metrics in Prometheus exposition format. Use with monitoring tools like Grafana."
        >
          <Box
            bg="gray.50"
            border="1px"
            borderColor="gray.200"
            borderRadius="md"
            p={4}
            maxH="400px"
            overflowY="auto"
          >
            <Text
              as="pre"
              fontSize="xs"
              fontFamily="mono"
              whiteSpace="pre-wrap"
              wordBreak="break-all"
              lineHeight="1.4"
            >
              {metricsText}
            </Text>
          </Box>
        </SectionCard>
      )}

      {loading && !metricsText && (
        <SectionCard title="Loading">
          <VStack py={8}>
            <Spinner size="lg" />
            <Text>Fetching metrics...</Text>
          </VStack>
        </SectionCard>
      )}
    </VStack>
  );
}