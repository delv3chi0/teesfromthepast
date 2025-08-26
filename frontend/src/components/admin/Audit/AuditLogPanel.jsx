// frontend/src/components/admin/Audit/AuditLogPanel.jsx
// Enhanced audit log panel with filtering and real-time updates
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  Select,
  Button,
  Switch,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  IconButton,
  Collapse,
  useDisclosure,
  FormControl,
  FormLabel,
  useToast
} from '@chakra-ui/react';
import { 
  FaSearch, 
  FaSync, 
  FaFilter, 
  FaPlay, 
  FaPause,
  FaChevronDown,
  FaChevronRight
} from 'react-icons/fa';
import { fetchAuditLogs, fetchAuditCategories } from '../../../api/adminRuntime.js';
import SectionCard from '../common/SectionCard.jsx';
import JSONPreview from '../common/JSONPreview.jsx';

const AuditLogPanel = () => {
  const [logs, setLogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  // Filter state
  const [category, setCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(50);
  
  // Tail mode state
  const [tailMode, setTailMode] = useState(false);
  const [tailInterval, setTailInterval] = useState(null);
  
  // UI state
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [backendAvailable, setBackendAvailable] = useState(true);
  
  const { isOpen: isFilterOpen, onToggle: onToggleFilter } = useDisclosure();

  // Fetch categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      const result = await fetchAuditCategories();
      if (result.success) {
        setCategories(result.data);
      } else {
        setBackendAvailable(result.backendAvailable);
      }
    };
    
    loadCategories();
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');

    const params = {
      limit,
      ...(category && { category }),
      ...(searchQuery && { q: searchQuery })
    };

    try {
      const result = await fetchAuditLogs(params);
      
      if (result.success) {
        setLogs(result.data.logs || []);
        setBackendAvailable(true);
      } else {
        setError(result.error);
        setBackendAvailable(result.backendAvailable);
        
        if (!result.backendAvailable) {
          setLogs([]);
        }
      }
    } catch (err) {
      setError('Failed to fetch audit logs');
      setBackendAvailable(false);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [category, searchQuery, limit]);

  // Initial load
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Tail mode management
  useEffect(() => {
    if (tailMode) {
      const interval = setInterval(() => {
        fetchLogs(false); // Don't show loading spinner for background updates
      }, 5000);
      
      setTailInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (tailInterval) {
        clearInterval(tailInterval);
        setTailInterval(null);
      }
    }
  }, [tailMode, fetchLogs]);

  // Toggle row expansion
  const toggleRowExpansion = (index) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    
    return date.toLocaleString();
  };

  // Handle search
  const handleSearch = () => {
    fetchLogs();
  };

  // Handle tail mode toggle
  const handleTailModeToggle = (checked) => {
    setTailMode(checked);
    
    if (checked) {
      toast({
        title: 'Tail mode enabled',
        description: 'Logs will refresh every 5 seconds',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (!backendAvailable) {
    return (
      <SectionCard title="Audit Logs">
        <Alert status="warning">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text>Backend audit endpoints are not available.</Text>
            <Text fontSize="sm" color="gray.600">
              Please ensure the backend PR with dynamic admin console features is merged and deployed.
            </Text>
          </VStack>
        </Alert>
      </SectionCard>
    );
  }

  return (
    <SectionCard 
      title="Audit Logs" 
      headerContent={
        <HStack>
          <Button
            size="sm"
            leftIcon={<FaFilter />}
            onClick={onToggleFilter}
            variant={isFilterOpen ? 'solid' : 'outline'}
          >
            Filters
          </Button>
          <Button
            size="sm"
            leftIcon={<FaSync />}
            onClick={() => fetchLogs()}
            isLoading={loading}
            variant="outline"
          >
            Refresh
          </Button>
        </HStack>
      }
    >
      {/* Filter Controls */}
      <Collapse in={isFilterOpen}>
        <Box p={4} bg="gray.50" borderRadius="md" border="1px" borderColor="gray.200">
          <VStack spacing={4}>
            <HStack width="100%" spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm">Category</FormLabel>
                <Select
                  size="sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="All categories"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel fontSize="sm">Limit</FormLabel>
                <Select
                  size="sm"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value))}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </Select>
              </FormControl>
            </HStack>
            
            <HStack width="100%">
              <Input
                size="sm"
                placeholder="Search messages and metadata..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <IconButton
                size="sm"
                icon={<FaSearch />}
                onClick={handleSearch}
                colorScheme="brand"
                aria-label="Search"
              />
            </HStack>
            
            <HStack justify="space-between" width="100%">
              <HStack>
                <Switch
                  isChecked={tailMode}
                  onChange={(e) => handleTailModeToggle(e.target.checked)}
                  colorScheme="brand"
                  size="sm"
                />
                <Text fontSize="sm">
                  Tail mode (auto-refresh every 5s)
                </Text>
                {tailMode && <Badge colorScheme="green" fontSize="xs">ACTIVE</Badge>}
              </HStack>
            </HStack>
          </VStack>
        </Box>
      </Collapse>

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
          <Text>Loading audit logs...</Text>
        </HStack>
      )}

      {/* Logs Table */}
      {!loading && logs.length > 0 && (
        <TableContainer>
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th width="40px"></Th>
                <Th>Time</Th>
                <Th>Category</Th>
                <Th>Message</Th>
                <Th>User</Th>
                <Th>IP</Th>
              </Tr>
            </Thead>
            <Tbody>
              {logs.map((log, index) => (
                <React.Fragment key={index}>
                  <Tr>
                    <Td>
                      <IconButton
                        size="xs"
                        icon={expandedRows.has(index) ? <FaChevronDown /> : <FaChevronRight />}
                        onClick={() => toggleRowExpansion(index)}
                        variant="ghost"
                        aria-label="Expand details"
                      />
                    </Td>
                    <Td>
                      <Text fontSize="xs" color="gray.600">
                        {formatTimestamp(log.timestamp)}
                      </Text>
                    </Td>
                    <Td>
                      <Badge colorScheme="blue" size="sm">
                        {log.category}
                      </Badge>
                    </Td>
                    <Td>
                      <Text fontSize="sm" noOfLines={1}>
                        {log.message}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontSize="xs" color="gray.600">
                        {log.user || '—'}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontSize="xs" color="gray.600">
                        {log.ip || '—'}
                      </Text>
                    </Td>
                  </Tr>
                  
                  {/* Expanded Row Details */}
                  {expandedRows.has(index) && (
                    <Tr>
                      <Td colSpan={6}>
                        <Box bg="gray.50" p={4} borderRadius="md">
                          <VStack align="start" spacing={3}>
                            <HStack>
                              <Text fontWeight="bold" fontSize="sm">Full Message:</Text>
                              <Text fontSize="sm">{log.message}</Text>
                            </HStack>
                            
                            {log.userAgent && (
                              <HStack>
                                <Text fontWeight="bold" fontSize="sm">User Agent:</Text>
                                <Text fontSize="xs" color="gray.600" noOfLines={1}>
                                  {log.userAgent}
                                </Text>
                              </HStack>
                            )}
                            
                            {log.meta && Object.keys(log.meta).length > 0 && (
                              <Box width="100%">
                                <Text fontWeight="bold" fontSize="sm" mb={2}>Metadata:</Text>
                                <JSONPreview 
                                  data={log.meta} 
                                  showControls={false}
                                  maxHeight="200px"
                                />
                              </Box>
                            )}
                          </VStack>
                        </Box>
                      </Td>
                    </Tr>
                  )}
                </React.Fragment>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      {/* Empty State */}
      {!loading && logs.length === 0 && !error && (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">No audit logs found</Text>
          <Text fontSize="sm" color="gray.400" mt={1}>
            Try adjusting your filters or check back later
          </Text>
        </Box>
      )}
    </SectionCard>
  );
};

export default AuditLogPanel;