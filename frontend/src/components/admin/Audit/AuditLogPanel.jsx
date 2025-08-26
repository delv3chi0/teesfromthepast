// frontend/src/components/admin/Audit/AuditLogPanel.jsx
// Enhanced audit log panel with filtering and search

import React, { useState, useEffect, useRef } from 'react';
import { 
  VStack, 
  HStack,
  Text, 
  Button,
  Select,
  Input,
  Switch,
  Badge,
  Alert,
  AlertIcon,
  Divider,
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Collapse,
  IconButton,
  Tooltip,
  Code,
  useToast
} from '@chakra-ui/react';
import { 
  FaSync, 
  FaSearch, 
  FaChevronDown, 
  FaChevronUp, 
  FaFilter,
  FaClock,
  FaUser,
  FaExclamationTriangle,
  FaInfoCircle
} from 'react-icons/fa';

import JSONPreview from '../common/JSONPreview.jsx';
import { fetchAuditCategories, fetchAuditLogs } from '../../../api/adminRuntime.js';

const AuditLogPanel = () => {
  const [logs, setLogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filter state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(100);
  const [tailMode, setTailMode] = useState(false);
  
  // UI state
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const tailTimer = useRef(null);
  const TAIL_INTERVAL = 5000; // 5 seconds
  const toast = useToast();

  const fetchCategories = async () => {
    try {
      const data = await fetchAuditCategories();
      setCategories(data);
    } catch (err) {
      console.warn('Failed to fetch audit categories:', err);
    }
  };

  const fetchLogs = async (showToast = false) => {
    setLoading(true);
    setError('');
    
    try {
      const params = {
        ...(selectedCategory && { category: selectedCategory }),
        ...(searchQuery && { q: searchQuery }),
        limit
      };
      
      const data = await fetchAuditLogs(params);
      setLogs(data);
      setLastUpdated(new Date());
      
      if (showToast) {
        toast({
          title: "Audit logs refreshed",
          description: `Found ${data.length} log entries`,
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (err) {
      setError(err.fallback ? 
        'Enhanced audit logs not available. Using basic audit functionality.' : 
        err.error || 'Failed to fetch audit logs'
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleTailMode = () => {
    setTailMode(!tailMode);
  };

  const toggleRowExpansion = (index) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return 'red';
      case 'warn': return 'yellow';
      case 'info': return 'blue';
      default: return 'gray';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'config_change': return 'orange';
      case 'admin_access': return 'purple';
      case 'config_error': return 'red';
      case 'audit_access': return 'blue';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

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

  // Setup tail mode
  useEffect(() => {
    if (tailMode) {
      tailTimer.current = setInterval(() => fetchLogs(), TAIL_INTERVAL);
    } else {
      if (tailTimer.current) {
        clearInterval(tailTimer.current);
        tailTimer.current = null;
      }
    }

    return () => {
      if (tailTimer.current) {
        clearInterval(tailTimer.current);
      }
    };
  }, [tailMode, selectedCategory, searchQuery, limit]);

  // Initial fetch
  useEffect(() => {
    fetchCategories();
    fetchLogs();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    if (!tailMode) {
      fetchLogs();
    }
  }, [selectedCategory, searchQuery, limit]);

  return (
    <VStack spacing={4} align="stretch">
      {/* Controls */}
      <HStack spacing={4} wrap="wrap">
        <HStack spacing={2}>
          <FaFilter size={14} />
          <Select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            placeholder="All Categories"
            size="sm"
            width="180px"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </HStack>

        <HStack spacing={2}>
          <FaSearch size={14} />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="sm"
            width="200px"
          />
        </HStack>

        <Select 
          value={limit} 
          onChange={(e) => setLimit(parseInt(e.target.value))}
          size="sm"
          width="100px"
        >
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
          <option value={500}>500</option>
        </Select>

        <HStack spacing={2}>
          <Switch
            isChecked={tailMode}
            onChange={toggleTailMode}
            colorScheme="green"
            size="sm"
          />
          <Text fontSize="sm" color="gray.600">
            Tail Mode
          </Text>
          {tailMode && <Badge colorScheme="green" size="sm">LIVE</Badge>}
        </HStack>

        <Button
          leftIcon={<FaSync />}
          onClick={() => fetchLogs(true)}
          isLoading={loading}
          size="sm"
          variant="outline"
        >
          Refresh
        </Button>
      </HStack>

      {lastUpdated && (
        <Text fontSize="xs" color="gray.500">
          Last updated: {lastUpdated.toLocaleTimeString()} • {logs.length} entries
        </Text>
      )}

      {error && (
        <Alert status="warning">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* Logs Table */}
      {logs.length === 0 && !loading ? (
        <Alert status="info">
          <AlertIcon />
          No audit logs found. Try adjusting the filters or refresh to fetch new data.
        </Alert>
      ) : (
        <Box borderWidth={1} borderColor="gray.200" borderRadius="md" overflow="hidden">
          <TableContainer>
            <Table size="sm" variant="striped">
              <Thead bg="gray.100">
                <Tr>
                  <Th width="40px"></Th>
                  <Th width="120px">Time</Th>
                  <Th width="100px">Level</Th>
                  <Th width="120px">Category</Th>
                  <Th width="120px">Actor</Th>
                  <Th>Message</Th>
                </Tr>
              </Thead>
              <Tbody>
                {logs.map((log, index) => (
                  <React.Fragment key={`${log.timestamp}-${index}`}>
                    <Tr _hover={{ bg: "gray.50" }}>
                      <Td p={1}>
                        <IconButton
                          aria-label="Expand row"
                          icon={expandedRows.has(index) ? <FaChevronUp /> : <FaChevronDown />}
                          onClick={() => toggleRowExpansion(index)}
                          size="xs"
                          variant="ghost"
                        />
                      </Td>
                      <Td>
                        <Tooltip label={new Date(log.timestamp).toLocaleString()}>
                          <HStack spacing={1}>
                            <FaClock size={10} color="gray" />
                            <Text fontSize="xs" color="gray.600">
                              {getRelativeTime(log.timestamp)}
                            </Text>
                          </HStack>
                        </Tooltip>
                      </Td>
                      <Td>
                        <Badge colorScheme={getLevelColor(log.level)} size="sm">
                          {log.level?.toUpperCase()}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={getCategoryColor(log.category)} variant="outline" size="sm">
                          {log.category}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack spacing={1}>
                          <FaUser size={10} color="gray" />
                          <Text fontSize="xs" noOfLines={1}>
                            {log.actor?.displayName || log.actor?.username || 'System'}
                          </Text>
                        </HStack>
                      </Td>
                      <Td>
                        <Text fontSize="sm" noOfLines={2}>
                          {log.message}
                        </Text>
                      </Td>
                    </Tr>
                    
                    {/* Expanded row details */}
                    <Tr>
                      <Td colSpan={6} p={0}>
                        <Collapse in={expandedRows.has(index)}>
                          <Box p={4} bg="gray.50" borderTop="1px" borderColor="gray.200">
                            <VStack spacing={3} align="stretch">
                              <HStack spacing={4}>
                                <Text fontSize="sm" fontWeight="medium">
                                  Full Timestamp:
                                </Text>
                                <Code fontSize="xs">
                                  {new Date(log.timestamp).toISOString()}
                                </Code>
                              </HStack>
                              
                              {log.actor && Object.keys(log.actor).length > 0 && (
                                <VStack align="start" spacing={1}>
                                  <Text fontSize="sm" fontWeight="medium">
                                    Actor Details:
                                  </Text>
                                  <Box maxW="400px">
                                    <JSONPreview 
                                      data={log.actor} 
                                      maxHeight="150px"
                                      showActions={false}
                                    />
                                  </Box>
                                </VStack>
                              )}
                              
                              {log.meta && Object.keys(log.meta).length > 0 && (
                                <VStack align="start" spacing={1}>
                                  <Text fontSize="sm" fontWeight="medium">
                                    Metadata:
                                  </Text>
                                  <Box maxW="100%">
                                    <JSONPreview 
                                      data={log.meta} 
                                      maxHeight="200px"
                                      showActions={false}
                                    />
                                  </Box>
                                </VStack>
                              )}
                            </VStack>
                          </Box>
                        </Collapse>
                      </Td>
                    </Tr>
                  </React.Fragment>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tailMode && (
        <Alert status="info" size="sm">
          <AlertIcon />
          <Text fontSize="xs">
            Tail mode is active - logs will refresh automatically every 5 seconds.
            Disable tail mode to stop automatic refreshing.
          </Text>
        </Alert>
      )}
    </VStack>
  );
};

export default AuditLogPanel;