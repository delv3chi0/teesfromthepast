// frontend/src/components/admin/Audit/AuditLogPanel.jsx
/**
 * Enhanced Audit Log panel with ring buffer support
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  VStack,
  HStack,
  Button,
  Input,
  Select,
  Text,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Switch,
  FormControl,
  FormLabel,
  useToast,
  Alert,
  AlertIcon,
  Box,
  Code
} from '@chakra-ui/react';
import { FaSync, FaSearch, FaPlay, FaPause } from 'react-icons/fa';
import SectionCard from '../../shared/SectionCard.jsx';
import { 
  fetchAuditCategories, 
  fetchAuditLogs, 
  handleRuntimeApiError,
  formatRelativeTime 
} from '../../../api/adminRuntime.js';

export default function AuditLogPanel() {
  const [logs, setLogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    q: '',
    limit: 50,
    since: null
  });
  const [tailMode, setTailMode] = useState(false);
  const [available, setAvailable] = useState(true);
  
  const tailIntervalRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    loadCategories();
    loadLogs();
  }, []);

  useEffect(() => {
    if (tailMode) {
      tailIntervalRef.current = setInterval(() => {
        loadLogs(true);
      }, 5000);
    } else {
      if (tailIntervalRef.current) {
        clearInterval(tailIntervalRef.current);
        tailIntervalRef.current = null;
      }
    }

    return () => {
      if (tailIntervalRef.current) {
        clearInterval(tailIntervalRef.current);
      }
    };
  }, [tailMode, filters]);

  const loadCategories = async () => {
    try {
      const cats = await fetchAuditCategories();
      setCategories(cats);
    } catch (err) {
      if (err.response?.status === 404) {
        setAvailable(false);
      } else {
        console.warn('Failed to load audit categories:', err);
      }
    }
  };

  const loadLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    
    try {
      const logsData = await fetchAuditLogs(filters);
      setLogs(logsData);
      setAvailable(true);
    } catch (err) {
      const errorInfo = handleRuntimeApiError(err);
      
      if (err.response?.status === 404) {
        setAvailable(false);
      } else {
        setError(errorInfo.message);
        if (!silent) {
          toast({
            title: 'Failed to load audit logs',
            description: errorInfo.message,
            status: 'error',
            duration: 3000
          });
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    
    // Debounce search queries
    if (field === 'q') {
      if (loadLogs.timeout) clearTimeout(loadLogs.timeout);
      loadLogs.timeout = setTimeout(() => loadLogs(), 500);
    } else {
      loadLogs();
    }
  };

  const getBadgeColor = (level) => {
    switch (level) {
      case 'error': return 'red';
      case 'warn': return 'orange';
      case 'info': return 'blue';
      default: return 'gray';
    }
  };

  if (!available) {
    return (
      <SectionCard
        title="Enhanced Audit Logs"
        subtitle="Ring buffer audit log viewer"
        badge={
          <Badge colorScheme="red" variant="subtle">
            UNAVAILABLE
          </Badge>
        }
      >
        <Alert status="warning">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text>Enhanced audit log features are not available.</Text>
            <Text fontSize="sm" color="gray.600">
              This may be because dynamic admin features are not enabled on the server.
            </Text>
          </VStack>
        </Alert>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Enhanced Audit Logs"
      subtitle="Ring buffer audit log viewer with real-time updates"
      badge={
        <Badge colorScheme="green" variant="subtle">
          LIVE
        </Badge>
      }
      headerActions={
        <HStack spacing={2}>
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="tail-mode" mb="0" fontSize="sm" mr={2}>
              Tail
            </FormLabel>
            <Switch
              id="tail-mode"
              isChecked={tailMode}
              onChange={(e) => setTailMode(e.target.checked)}
              size="sm"
            />
          </FormControl>
          
          <Button
            size="sm"
            leftIcon={<FaSync />}
            onClick={() => loadLogs()}
            isLoading={loading}
            variant="outline"
          >
            Refresh
          </Button>
        </HStack>
      }
    >
      <VStack spacing={4} align="stretch">
        {/* Filters */}
        <HStack spacing={4} wrap="wrap">
          <Select
            placeholder="All categories"
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            size="sm"
            maxW="200px"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
          
          <Input
            placeholder="Search messages..."
            value={filters.q}
            onChange={(e) => handleFilterChange('q', e.target.value)}
            size="sm"
            maxW="300px"
          />
          
          <Select
            value={filters.limit}
            onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
            size="sm"
            maxW="120px"
          >
            <option value={25}>25 logs</option>
            <option value={50}>50 logs</option>
            <option value={100}>100 logs</option>
            <option value={200}>200 logs</option>
          </Select>
        </HStack>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Logs Table */}
        <TableContainer maxH="600px" overflowY="auto" border="1px" borderColor="gray.200" borderRadius="md">
          <Table size="sm" variant="simple">
            <Thead position="sticky" top={0} bg="white" zIndex={1}>
              <Tr>
                <Th>Time</Th>
                <Th>Category</Th>
                <Th>Level</Th>
                <Th>Message</Th>
                <Th>Actor</Th>
              </Tr>
            </Thead>
            <Tbody>
              {logs.map((log, index) => (
                <Tr key={index}>
                  <Td fontSize="xs" color="gray.600" minW="120px">
                    <VStack align="start" spacing={0}>
                      <Text>{formatRelativeTime(log.timestamp)}</Text>
                      <Text fontSize="2xs" color="gray.500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </Text>
                    </VStack>
                  </Td>
                  <Td>
                    <Badge variant="outline" fontSize="xs">
                      {log.category}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge 
                      colorScheme={getBadgeColor(log.level)} 
                      variant="subtle"
                      fontSize="xs"
                    >
                      {log.level}
                    </Badge>
                  </Td>
                  <Td maxW="400px">
                    <Text fontSize="sm" noOfLines={2}>
                      {log.message}
                    </Text>
                    {Object.keys(log.meta || {}).length > 0 && (
                      <Code fontSize="xs" display="block" mt={1} p={1}>
                        {JSON.stringify(log.meta).slice(0, 100)}
                        {JSON.stringify(log.meta).length > 100 && '...'}
                      </Code>
                    )}
                  </Td>
                  <Td fontSize="sm">
                    {log.actor ? (
                      <Code fontSize="xs">{log.actor}</Code>
                    ) : (
                      <Text color="gray.500">—</Text>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>

        {logs.length === 0 && !loading && (
          <Text color="gray.500" textAlign="center" py={8}>
            No audit logs found matching the current filters.
          </Text>
        )}
      </VStack>
    </SectionCard>
  );
}