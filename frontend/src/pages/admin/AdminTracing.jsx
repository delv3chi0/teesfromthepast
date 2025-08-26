// frontend/src/pages/admin/AdminTracing.jsx
// Admin Tracing and Request ID monitoring tab
import React, { useState, useEffect, useCallback } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Box,
  Switch,
  Code,
  Tooltip
} from '@chakra-ui/react';
import { FaSync, FaRoute, FaCopy } from 'react-icons/fa';
import { fetchRuntimeConfig } from '../../api/adminRuntime';
import SectionCard from '../../components/admin/common/SectionCard';
import KeyValueGrid from '../../components/admin/common/KeyValueGrid';

export default function AdminTracing() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const toast = useToast();

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchRuntimeConfig();
      setConfig(response.config);
    } catch (error) {
      toast({
        title: "Failed to fetch tracing config",
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
      const interval = setInterval(fetchConfig, 5000); // 5 seconds
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
  }, [autoRefresh, fetchConfig]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const copyRequestId = async (requestId) => {
    try {
      await navigator.clipboard.writeText(requestId);
      toast({
        title: "Request ID copied",
        status: "success",
        duration: 1500,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: error.message,
        status: "error",
        duration: 2000,
      });
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = (now - date) / 1000; // seconds ago

    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const headerActions = (
    <HStack spacing={3}>
      <HStack>
        <Text fontSize="sm">Auto-refresh (5s)</Text>
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
        onClick={fetchConfig}
        isLoading={loading}
        variant="outline"
        colorScheme="blue"
      >
        Refresh
      </Button>
    </HStack>
  );

  const tracingConfig = config?.tracing;
  const recentRequestIds = tracingConfig?.recentRequestIds || [];

  return (
    <VStack spacing={6} align="stretch">
      <SectionCard title="Request Tracing Configuration" headerActions={headerActions}>
        {tracingConfig && (
          <VStack spacing={4} align="stretch">
            <KeyValueGrid
              data={{
                requestIdHeader: tracingConfig.requestIdHeader || 'X-Request-Id (default)',
                recentRequestCount: tracingConfig.recentRequestCount || 0,
                maxRecentRequests: tracingConfig.maxRecentRequests || 100,
                bufferUtilization: `${Math.round((tracingConfig.recentRequestCount / tracingConfig.maxRecentRequests) * 100)}%`
              }}
              columns={{ base: 1, md: 2 }}
            />

            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={3}>How Request Tracing Works</Text>
              <VStack align="start" spacing={2} fontSize="sm" color="gray.700">
                <Text>
                  • Each request gets a unique ID via the <Code>{tracingConfig.requestIdHeader || 'X-Request-Id'}</Code> header
                </Text>
                <Text>
                  • Request IDs are generated using nanoid (10 characters) for compactness
                </Text>
                <Text>
                  • Recent request IDs are kept in memory for monitoring and debugging
                </Text>
                <Text>
                  • The ring buffer maintains the {tracingConfig.maxRecentRequests} most recent requests
                </Text>
              </VStack>
            </Box>
          </VStack>
        )}
      </SectionCard>

      <SectionCard title="Recent Request IDs">
        {recentRequestIds.length === 0 ? (
          <Text color="gray.500" fontStyle="italic" textAlign="center" py={8}>
            No recent requests tracked
          </Text>
        ) : (
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600">
                Showing {recentRequestIds.length} recent requests (newest first)
              </Text>
              <Badge colorScheme="blue">
                {tracingConfig?.recentRequestCount} / {tracingConfig?.maxRecentRequests}
              </Badge>
            </HStack>

            <TableContainer>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Request ID</Th>
                    <Th>Timestamp</Th>
                    <Th>Relative Time</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {recentRequestIds.slice().reverse().slice(0, 50).map((request, index) => (
                    <Tr key={request.id || index}>
                      <Td>
                        <Code fontSize="xs" p={1}>
                          {request.id}
                        </Code>
                      </Td>
                      <Td fontSize="sm">
                        {new Date(request.timestamp).toLocaleString()}
                      </Td>
                      <Td fontSize="sm" color="gray.600">
                        {formatTimestamp(request.timestamp)}
                      </Td>
                      <Td>
                        <Tooltip label="Copy Request ID">
                          <Button
                            size="xs"
                            variant="ghost"
                            leftIcon={<FaCopy />}
                            onClick={() => copyRequestId(request.id)}
                            aria-label="Copy"
                          >
                            Copy
                          </Button>
                        </Tooltip>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>

            {recentRequestIds.length > 50 && (
              <Text fontSize="sm" color="gray.500" textAlign="center">
                Showing 50 of {recentRequestIds.length} recent requests
              </Text>
            )}
          </VStack>
        )}
      </SectionCard>

      <SectionCard title="Request Tracing Usage">
        <VStack align="start" spacing={4}>
          <Box>
            <Text fontWeight="bold" mb={2}>Making Requests with Custom Request ID</Text>
            <Box bg="gray.50" p={3} borderRadius="md" fontSize="sm" fontFamily="mono">
              curl -H "{tracingConfig?.requestIdHeader || 'X-Request-Id'}: my-custom-id-123" \\<br />
              &nbsp;&nbsp;&nbsp;&nbsp; {window.location.origin}/api/admin/runtime/config
            </Box>
          </Box>

          <Box>
            <Text fontWeight="bold" mb={2}>Tracing Requests in Browser</Text>
            <VStack align="start" spacing={1} fontSize="sm" color="gray.700">
              <Text>1. Open browser developer tools (F12)</Text>
              <Text>2. Navigate to Network tab</Text>
              <Text>3. Make any request to the API</Text>
              <Text>4. Check response headers for the <Code>{tracingConfig?.requestIdHeader || 'X-Request-Id'}</Code> header</Text>
              <Text>5. Use this ID for correlating logs and debugging</Text>
            </VStack>
          </Box>

          <Box>
            <Text fontWeight="bold" mb={2}>Request ID Propagation</Text>
            <Text fontSize="sm" color="gray.700">
              Request IDs are automatically added to:
            </Text>
            <VStack align="start" spacing={1} fontSize="sm" color="gray.700" pl={4}>
              <Text>• Response headers (for client-side tracking)</Text>
              <Text>• Server logs (via logger context)</Text>
              <Text>• Audit log entries (for traceability)</Text>
              <Text>• Error reports and debugging output</Text>
            </VStack>
          </Box>
        </VStack>
      </SectionCard>
    </VStack>
  );
}