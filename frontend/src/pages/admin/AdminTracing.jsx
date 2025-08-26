// frontend/src/pages/admin/AdminTracing.jsx
// Request tracing and request ID management
import React, { useState, useEffect, useCallback } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
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
  Switch,
  Code,
  useToast
} from '@chakra-ui/react';
import { FaSync, FaRoute, FaInfoCircle } from 'react-icons/fa';
import { fetchRuntimeConfig } from '../../api/adminRuntime.js';
import SectionCard from '../../components/admin/common/SectionCard.jsx';

const AdminTracing = () => {
  const [tracingData, setTracingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const toast = useToast();

  // Fetch tracing data
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');

    try {
      const result = await fetchRuntimeConfig();
      
      if (result.success) {
        setTracingData(result.data.tracing);
        setBackendAvailable(true);
        setLastUpdated(new Date());
      } else {
        setError(result.error);
        setBackendAvailable(result.backendAvailable);
      }
    } catch (err) {
      setError('Failed to fetch tracing data');
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
      }, 5000); // 5 seconds
      
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

  // Format timestamp relative to now
  const formatRelativeTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    
    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!backendAvailable) {
    return (
      <SectionCard title="Request Tracing">
        <Alert status="warning">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text>Backend runtime configuration endpoints are not available.</Text>
            <Text fontSize="sm" color="gray.600">
              Please ensure the backend PR with dynamic admin console features is merged and deployed.
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
        title="Request Tracing"
        headerContent={
          <HStack>
            <HStack>
              <Switch
                isChecked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                colorScheme="brand"
                size="sm"
              />
              <Text fontSize="sm">Auto-refresh (5s)</Text>
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
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text>Request tracing shows recent request IDs captured by the request ID middleware.</Text>
            <Text fontSize="xs" color="gray.600">
              This helps with debugging and correlating logs across distributed systems.
            </Text>
          </VStack>
        </Alert>

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
          <Text>Loading tracing data...</Text>
        </HStack>
      )}

      {/* Configuration */}
      {!loading && tracingData && (
        <SectionCard title="Configuration">
          <HStack justify="space-between" align="center">
            <Text fontWeight="medium">Request ID Header</Text>
            <Code fontSize="sm" colorScheme="blue">
              {tracingData.requestIdHeader}
            </Code>
          </HStack>
          
          <Alert status="info" size="sm">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontSize="sm">
                The request ID header <Code fontSize="xs">{tracingData.requestIdHeader}</Code> is added to all requests
              </Text>
              <Text fontSize="xs" color="gray.600">
                This header can be used to trace requests across microservices and correlate logs
              </Text>
            </VStack>
          </Alert>
        </SectionCard>
      )}

      {/* Recent Request IDs */}
      {!loading && tracingData && (
        <SectionCard 
          title="Recent Request IDs"
          headerContent={
            <Badge colorScheme="blue" variant="outline">
              {tracingData.recentRequestIds?.length || 0} requests tracked
            </Badge>
          }
        >
          {tracingData.recentRequestIds && tracingData.recentRequestIds.length > 0 ? (
            <TableContainer>
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>Request ID</Th>
                    <Th>Timestamp</Th>
                    <Th>Relative Time</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {tracingData.recentRequestIds.map((request, index) => (
                    <Tr key={index}>
                      <Td>
                        <Code fontSize="sm" colorScheme="gray">
                          {request.id}
                        </Code>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color="gray.600">
                          {new Date(request.timestamp).toLocaleString()}
                        </Text>
                      </Td>
                      <Td>
                        <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                          {formatRelativeTime(request.timestamp)}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          ) : (
            <VStack py={6} spacing={3}>
              <FaRoute size={24} color="gray" />
              <Text color="gray.500">No recent requests tracked</Text>
              <Text fontSize="sm" color="gray.400" textAlign="center">
                Request IDs will appear here as requests are made to the backend
              </Text>
            </VStack>
          )}
        </SectionCard>
      )}

      {/* Help Information */}
      <SectionCard title="How Request Tracing Works">
        <VStack spacing={4} align="stretch">
          <Alert status="info" size="sm">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <Text fontSize="sm" fontWeight="medium">Request ID Generation</Text>
              <Text fontSize="xs">
                Each incoming request gets a unique request ID (either from the header or generated using nanoid).
                This ID is added to response headers and logged with all related operations.
              </Text>
            </VStack>
          </Alert>
          
          <Alert status="success" size="sm">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <Text fontSize="sm" fontWeight="medium">Usage for Debugging</Text>
              <Text fontSize="xs">
                Use request IDs to correlate logs across different services and trace the complete flow of a request.
                The request ID is available in application logs and can be searched to find all related operations.
              </Text>
            </VStack>
          </Alert>
          
          <Alert status="warning" size="sm">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <Text fontSize="sm" fontWeight="medium">Data Retention</Text>
              <Text fontSize="xs">
                Recent request IDs are stored in memory only and limited to the most recent 100 requests.
                This data is ephemeral and will be lost on server restart.
              </Text>
            </VStack>
          </Alert>
        </VStack>
      </SectionCard>

      {/* Empty State */}
      {!loading && !tracingData && !error && (
        <SectionCard>
          <VStack py={8} spacing={4}>
            <Text color="gray.500" fontSize="lg">No tracing data available</Text>
            <Text color="gray.400" fontSize="sm" textAlign="center">
              Unable to fetch tracing information from the backend.
            </Text>
          </VStack>
        </SectionCard>
      )}
    </VStack>
  );
};

export default AdminTracing;