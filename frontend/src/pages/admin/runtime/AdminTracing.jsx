// frontend/src/pages/admin/runtime/AdminTracing.jsx
/**
 * Admin Tracing tab for displaying request ID tracking and tracing configuration
 */

import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Button,
  Text,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Code,
  useToast
} from '@chakra-ui/react';
import { FaSync, FaRoute } from 'react-icons/fa';
import SectionCard from '../../../components/shared/SectionCard.jsx';
import KeyValueGrid from '../../../components/shared/KeyValueGrid.jsx';
import { fetchRuntimeConfig, formatRelativeTime } from '../../../api/adminRuntime.js';

export default function AdminTracing() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    
    try {
      const response = await fetchRuntimeConfig();
      setConfig(response.data);
    } catch (err) {
      toast({
        title: 'Failed to load configuration',
        description: err.message,
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <SectionCard title="Tracing" subtitle="Loading...">
        <Text>Loading tracing configuration...</Text>
      </SectionCard>
    );
  }

  const tracingItems = [
    {
      key: 'Request ID Header',
      value: config.tracing?.requestIdHeader || 'X-Request-Id',
      type: 'code',
      copyable: true
    },
    {
      key: 'Recent Requests',
      value: config.tracing?.recentRequestIds?.length || 0,
      type: 'number'
    }
  ];

  const recentRequests = config.tracing?.recentRequestIds || [];

  return (
    <VStack spacing={6} align="stretch">
      <SectionCard
        title="Tracing"
        subtitle="Request ID tracking and tracing configuration"
        headerActions={
          <Button
            size="sm"
            leftIcon={<FaSync />}
            onClick={loadConfig}
            isLoading={loading}
            variant="outline"
          >
            Refresh
          </Button>
        }
      >
        <VStack spacing={6} align="stretch">
          <SectionCard title="Configuration" subtitle="Tracing settings">
            <KeyValueGrid items={tracingItems} columns={1} />
          </SectionCard>
          
          <SectionCard 
            title="Recent Request IDs" 
            subtitle={`Last ${recentRequests.length} requests (newest first)`}
            helpText="Ring buffer of recent request IDs for debugging and tracing purposes"
          >
            {recentRequests.length > 0 ? (
              <TableContainer maxH="400px" overflowY="auto">
                <Table size="sm" variant="simple">
                  <Thead position="sticky" top={0} bg="white" zIndex={1}>
                    <Tr>
                      <Th>Request ID</Th>
                      <Th>Timestamp</Th>
                      <Th>Age</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {recentRequests.map((request, index) => (
                      <Tr key={index}>
                        <Td>
                          <Code fontSize="xs" p={1}>
                            {request.id}
                          </Code>
                        </Td>
                        <Td fontSize="sm">
                          {new Date(request.timestamp).toLocaleString()}
                        </Td>
                        <Td fontSize="sm" color="gray.600">
                          {formatRelativeTime(request.timestamp)}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            ) : (
              <Text color="gray.500" textAlign="center" py={4}>
                No recent request IDs tracked yet.
              </Text>
            )}
          </SectionCard>
        </VStack>
      </SectionCard>
    </VStack>
  );
}