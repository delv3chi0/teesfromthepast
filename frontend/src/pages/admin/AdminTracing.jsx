// frontend/src/pages/admin/AdminTracing.jsx
// Admin page for viewing request tracing information

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
  Box,
  Code,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer
} from '@chakra-ui/react';
import { FaSync, FaRoute, FaClock } from 'react-icons/fa';

import SectionCard from '../../components/admin/common/SectionCard.jsx';
import KeyValueGrid from '../../components/admin/common/KeyValueGrid.jsx';
import { fetchRuntimeConfig } from '../../api/adminRuntime.js';

const AdminTracing = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const autoRefreshTimer = useRef(null);
  const REFRESH_INTERVAL = 5000; // 5 seconds for tracing data

  const fetchConfig = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await fetchRuntimeConfig();
      setConfig(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.fallback ? 
        'Runtime configuration not available.' : 
        err.error || 'Failed to fetch configuration'
      );
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
      autoRefreshTimer.current = setInterval(fetchConfig, REFRESH_INTERVAL);
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
    fetchConfig();
  }, []);

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffSecs < 60) {
      return `${diffSecs}s ago`;
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return time.toLocaleDateString();
    }
  };

  const tracingConfigData = config ? [
    { 
      label: 'Request ID Header', 
      value: config.tracing.requestIdHeader,
      mono: true
    },
    { 
      label: 'Recent Requests Tracked', 
      value: config.tracing.recentRequestIds?.length || 0 
    },
    { 
      label: 'Ring Buffer Capacity', 
      value: '200 (default)',
      valueColor: 'gray.500'
    }
  ] : [];

  return (
    <VStack spacing={6} align="stretch">
      <SectionCard title="Request Tracing">
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" fontWeight="medium">
              Request ID Tracking (In-Memory)
            </Text>
            <Text fontSize="xs">
              Shows recent request IDs in reverse chronological order. 
              IDs are generated for each request and tracked in a ring buffer for debugging.
            </Text>
          </VStack>
        </Alert>

        <HStack justify="space-between" align="center">
          <HStack spacing={4}>
            <Button
              leftIcon={<FaSync />}
              onClick={fetchConfig}
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
                Auto-refresh (5s)
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

        {config && (
          <>
            <Divider />
            
            <Text fontSize="md" fontWeight="semibold">Tracing Configuration</Text>
            <KeyValueGrid data={tracingConfigData} columns={1} />
            
            <Divider />
            
            <HStack justify="space-between" align="center">
              <Text fontSize="md" fontWeight="semibold">Recent Request IDs</Text>
              <Badge variant="outline" colorScheme="blue">
                {config.tracing.recentRequestIds?.length || 0} tracked
              </Badge>
            </HStack>

            {!config.tracing.recentRequestIds || config.tracing.recentRequestIds.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                No recent request IDs found. Request IDs are captured when requests are made to the API.
              </Alert>
            ) : (
              <Box borderWidth={1} borderColor="gray.200" borderRadius="md" overflow="hidden">
                <TableContainer>
                  <Table size="sm" variant="striped">
                    <Thead bg="gray.100">
                      <Tr>
                        <Th width="150px">Request ID</Th>
                        <Th width="120px">Relative Time</Th>
                        <Th>Absolute Timestamp</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {config.tracing.recentRequestIds.slice(0, 50).map((requestEntry, index) => {
                        const requestId = requestEntry.id || requestEntry;
                        const timestamp = requestEntry.timestamp;
                        
                        return (
                          <Tr key={`${requestId}-${index}`}>
                            <Td>
                              <Code fontSize="xs" colorScheme="blue">
                                {requestId}
                              </Code>
                            </Td>
                            <Td>
                              <HStack spacing={1}>
                                <FaClock size={10} color="gray" />
                                <Text fontSize="xs" color="gray.600">
                                  {getRelativeTime(timestamp)}
                                </Text>
                              </HStack>
                            </Td>
                            <Td>
                              <Text fontSize="xs" color="gray.500">
                                {timestamp ? new Date(timestamp).toLocaleString() : 'Unknown'}
                              </Text>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </TableContainer>
                
                {config.tracing.recentRequestIds.length > 50 && (
                  <Box p={2} bg="gray.50" borderTop="1px" borderColor="gray.200">
                    <Text fontSize="xs" color="gray.600" textAlign="center">
                      Showing most recent 50 of {config.tracing.recentRequestIds.length} total request IDs
                    </Text>
                  </Box>
                )}
              </Box>
            )}

            <Alert status="info" size="sm">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontSize="xs" fontWeight="medium">
                  Request ID Usage
                </Text>
                <Text fontSize="xs">
                  Request IDs help trace individual requests through the system for debugging and monitoring. 
                  They are included in response headers and can be used to correlate logs and errors.
                  The ring buffer keeps the most recent 200 request IDs in memory.
                </Text>
              </VStack>
            </Alert>
          </>
        )}
      </SectionCard>
    </VStack>
  );
};

export default AdminTracing;