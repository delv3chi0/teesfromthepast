// frontend/src/components/admin/Audit/AuditLogPanel.jsx
// Enhanced audit log panel with ring buffer integration
import React, { useState, useEffect, useCallback } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Select,
  Switch,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  Code,
  useToast,
  Tooltip,
  IconButton,
  Box,
  Collapse,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { 
  FaSync, 
  FaSearch, 
  FaFilter, 
  FaChevronDown, 
  FaChevronUp, 
  FaInfoCircle,
  FaCopy,
  FaPlay,
  FaPause
} from 'react-icons/fa';
import { fetchAuditCategories, fetchAuditLogs } from '../../../api/adminRuntime';

export default function AuditLogPanel() {
  const [logs, setLogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tailMode, setTailMode] = useState(false);
  const [tailInterval, setTailInterval] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [limitFilter, setLimitFilter] = useState(50);
  
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const { isOpen: isFiltersOpen, onToggle: onFiltersToggle } = useDisclosure();
  
  const toast = useToast();

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetchAuditCategories();
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to fetch audit categories:', error);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        category: categoryFilter || undefined,
        q: searchQuery || undefined,
        limit: limitFilter,
      };

      const response = await fetchAuditLogs(params);
      setLogs(response.logs || []);
    } catch (error) {
      toast({
        title: "Failed to fetch audit logs",
        description: error.message,
        status: "error",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchQuery, limitFilter, toast]);

  // Tail mode functionality
  useEffect(() => {
    if (tailMode) {
      const interval = setInterval(fetchLogs, 5000); // Poll every 5 seconds
      setTailInterval(interval);
    } else {
      if (tailInterval) {
        clearInterval(tailInterval);
        setTailInterval(null);
      }
    }

    return () => {
      if (tailInterval) clearInterval(tailInterval);
    };
  }, [tailMode, fetchLogs]);

  // Initial load
  useEffect(() => {
    fetchCategories();
    fetchLogs();
  }, [fetchCategories, fetchLogs]);

  const handleLogDetail = (log) => {
    setSelectedLog(log);
    onDetailOpen();
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        status: "success",
        duration: 1500,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
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

  const getCategoryColor = (category) => {
    const colors = {
      auth: 'blue',
      admin: 'purple',
      user: 'green',
      system: 'orange',
      error: 'red',
      general: 'gray'
    };
    return colors[category] || 'gray';
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* Header with controls */}
      <HStack justify="space-between" align="center">
        <HStack spacing={3}>
          <Text fontSize="lg" fontWeight="bold">Audit Logs (Ring Buffer)</Text>
          <Badge colorScheme={tailMode ? 'green' : 'gray'}>
            {tailMode ? 'Live' : 'Static'}
          </Badge>
        </HStack>
        
        <HStack spacing={2}>
          <Tooltip label="Toggle filters">
            <IconButton
              size="sm"
              icon={isFiltersOpen ? <FaChevronUp /> : <FaChevronDown />}
              onClick={onFiltersToggle}
              variant="ghost"
              aria-label="Toggle filters"
            />
          </Tooltip>
          
          <HStack>
            <Text fontSize="sm">Tail mode (5s)</Text>
            <Switch
              isChecked={tailMode}
              onChange={(e) => setTailMode(e.target.checked)}
              colorScheme="green"
              size="sm"
            />
            {tailMode ? <FaPause size={12} /> : <FaPlay size={12} />}
          </HStack>
          
          <Button
            size="sm"
            leftIcon={<FaSync />}
            onClick={fetchLogs}
            isLoading={loading}
            variant="outline"
            colorScheme="blue"
          >
            Refresh
          </Button>
        </HStack>
      </HStack>

      {/* Filters */}
      <Collapse in={isFiltersOpen}>
        <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50">
          <VStack spacing={3}>
            <HStack spacing={3} w="full">
              <Box flex={1}>
                <Text fontSize="sm" fontWeight="medium" mb={1}>Category</Text>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  size="sm"
                  placeholder="All categories"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </Box>
              
              <Box flex={2}>
                <Text fontSize="sm" fontWeight="medium" mb={1}>Search</Text>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in messages, actors, actions..."
                  size="sm"
                />
              </Box>
              
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={1}>Limit</Text>
                <Select
                  value={limitFilter}
                  onChange={(e) => setLimitFilter(parseInt(e.target.value))}
                  size="sm"
                  w="100px"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </Select>
              </Box>
            </HStack>
            
            <HStack w="full">
              <Button
                size="sm"
                leftIcon={<FaSearch />}
                onClick={fetchLogs}
                colorScheme="blue"
              >
                Apply Filters
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setCategoryFilter('');
                  setSearchQuery('');
                  setLimitFilter(50);
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Collapse>

      {/* Ring buffer notice */}
      <Alert status="info" size="sm">
        <AlertIcon />
        <Text fontSize="sm">
          Showing audit logs from in-memory ring buffer (latest {logs.length} entries). 
          For full historical logs, use the Database Audit Logs tab.
        </Text>
      </Alert>

      {/* Logs table */}
      {logs.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">
            {loading ? 'Loading...' : 'No audit logs found'}
          </Text>
        </Box>
      ) : (
        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Time</Th>
                <Th>Category</Th>
                <Th>Action</Th>
                <Th>Actor</Th>
                <Th>Message</Th>
                <Th>Details</Th>
              </Tr>
            </Thead>
            <Tbody>
              {logs.map((log, index) => (
                <Tr key={log.id || index}>
                  <Td>
                    <VStack align="start" spacing={0}>
                      <Text fontSize="xs" fontWeight="medium">
                        {formatTimestamp(log.timestamp)}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </Text>
                    </VStack>
                  </Td>
                  
                  <Td>
                    <Badge colorScheme={getCategoryColor(log.category)} size="sm">
                      {log.category || 'general'}
                    </Badge>
                  </Td>
                  
                  <Td>
                    <Code fontSize="xs">{log.action}</Code>
                  </Td>
                  
                  <Td>
                    {log.actor ? (
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="medium">
                          {log.actor.username}
                        </Text>
                        {log.actor.email && (
                          <Text fontSize="xs" color="gray.500">
                            {log.actor.email}
                          </Text>
                        )}
                      </VStack>
                    ) : (
                      <Text fontSize="sm" color="gray.500">System</Text>
                    )}
                  </Td>
                  
                  <Td maxW="300px">
                    <Text fontSize="sm" noOfLines={2}>
                      {log.message}
                    </Text>
                  </Td>
                  
                  <Td>
                    <HStack spacing={1}>
                      <Tooltip label="View details">
                        <IconButton
                          size="xs"
                          icon={<FaInfoCircle />}
                          onClick={() => handleLogDetail(log)}
                          variant="ghost"
                          aria-label="View details"
                        />
                      </Tooltip>
                      
                      {log.id && (
                        <Tooltip label="Copy ID">
                          <IconButton
                            size="xs"
                            icon={<FaCopy />}
                            onClick={() => copyToClipboard(log.id)}
                            variant="ghost"
                            aria-label="Copy ID"
                          />
                        </Tooltip>
                      )}
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      {/* Log detail modal */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Audit Log Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedLog && (
              <Box
                as="pre"
                fontSize="sm"
                fontFamily="mono"
                whiteSpace="pre-wrap"
                p={4}
                bg="gray.50"
                borderRadius="md"
                overflowX="auto"
              >
                {JSON.stringify(selectedLog, null, 2)}
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onDetailClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}