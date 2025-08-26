// frontend/src/pages/admin/AdminTracing.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Button,
  Code,
  Badge,
  useToast
} from '@chakra-ui/react';
import { FaRoute, FaSync, FaCopy } from 'react-icons/fa';
import { getRuntimeConfig } from '../../api/adminRuntime.js';
import SectionCard from '../../components/admin/common/SectionCard.jsx';
import KeyValueGrid from '../../components/admin/common/KeyValueGrid.jsx';

export default function AdminTracing() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const toast = useToast();

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await getRuntimeConfig();
      setConfig(result.config);
      
      // Generate a sample request ID to show current format
      setCurrentRequestId(generateSampleRequestId());
    } catch (err) {
      setError(`Failed to load configuration: ${err.message}`);
      toast({
        title: "Failed to load config",
        description: err.message,
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const generateSampleRequestId = () => {
    // Generate a sample request ID similar to what the backend would generate
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: `${label} copied`,
        status: "success",
        duration: 2000
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: error.message,
        status: "error"
      });
    }
  };

  const getSampleRecentRequestIds = () => {
    // Generate some sample request IDs to show recent activity format
    const now = Date.now();
    return [
      `req_${now - 1000}_abc123de`,
      `req_${now - 2500}_def456gh`,
      `req_${now - 4200}_hij789kl`,
      `req_${now - 5800}_mno012pq`,
      `req_${now - 7300}_rst345uv`
    ];
  };

  return (
    <Box layerStyle="cardBlue" w="100%" p={{ base: 2, md: 4 }}>
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={2}>
        <HStack>
          <FaRoute />
          <Heading size="md">Request Tracing</Heading>
        </HStack>
        <Button
          size="sm"
          leftIcon={<FaSync />}
          onClick={loadConfig}
          isLoading={loading}
          variant="outline"
          color="black"
          borderColor="black"
        >
          Refresh
        </Button>
      </HStack>

      {loading && (
        <VStack p={10}>
          <Spinner />
          <Text>Loading tracing configuration...</Text>
        </VStack>
      )}

      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {config && (
        <VStack spacing={6} align="stretch">
          {/* Request ID Configuration */}
          <SectionCard title="Request ID Configuration">
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between">
                <Text fontSize="sm" fontWeight="medium" color="gray.700">
                  Header Name
                </Text>
                <HStack spacing={2}>
                  <Code fontSize="sm" colorScheme="blue">
                    {config.tracing.REQUEST_ID_HEADER}
                  </Code>
                  <Button
                    size="xs"
                    variant="outline"
                    leftIcon={<FaCopy />}
                    onClick={() => copyToClipboard(config.tracing.REQUEST_ID_HEADER, 'Header name')}
                  >
                    Copy
                  </Button>
                </HStack>
              </HStack>

              <HStack justify="space-between">
                <Text fontSize="sm" fontWeight="medium" color="gray.700">
                  Sample Request ID
                </Text>
                <HStack spacing={2}>
                  <Code fontSize="sm" colorScheme="green">
                    {currentRequestId}
                  </Code>
                  <Button
                    size="xs"
                    variant="outline"
                    leftIcon={<FaCopy />}
                    onClick={() => copyToClipboard(currentRequestId, 'Request ID')}
                  >
                    Copy
                  </Button>
                </HStack>
              </HStack>

              <Alert status="info">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" fontWeight="bold">Request ID Usage</Text>
                  <Text fontSize="sm">
                    Every request to the API receives a unique request ID in the response headers.
                    This ID can be used to trace requests through logs and audit trails.
                  </Text>
                </VStack>
              </Alert>
            </VStack>
          </SectionCard>

          {/* Request ID Generation */}
          <SectionCard title="Request ID Generation">
            <VStack align="stretch" spacing={3}>
              <Text fontSize="sm" color="gray.600" bg="gray.50" p={3} borderRadius="md">
                Request IDs are automatically generated for every incoming request using a combination of:
              </Text>
              
              <KeyValueGrid
                data={{
                  "Prefix": "req_",
                  "Timestamp": "Current time in milliseconds",
                  "Random Component": "8-character alphanumeric string",
                  "Format": "req_[timestamp]_[random]",
                  "Example": currentRequestId
                }}
                columns={1}
              />

              <Alert status="info">
                <AlertIcon />
                <Text fontSize="sm">
                  Request IDs are unique across all requests and can be used to correlate 
                  log entries, audit records, and error reports for debugging purposes.
                </Text>
              </Alert>
            </VStack>
          </SectionCard>

          {/* Recent Request IDs Sample */}
          <SectionCard title="Sample Recent Request IDs">
            <VStack align="stretch" spacing={3}>
              <Text fontSize="sm" color="gray.600">
                This shows the format of recent request IDs that would be available for tracing:
              </Text>

              <VStack align="stretch" spacing={2}>
                {getSampleRecentRequestIds().map((requestId, index) => (
                  <HStack key={index} justify="space-between" p={2} bg="gray.50" borderRadius="md">
                    <HStack spacing={3}>
                      <Badge size="sm" colorScheme="blue">#{index + 1}</Badge>
                      <Code fontSize="sm">{requestId}</Code>
                    </HStack>
                    <Button
                      size="xs"
                      variant="ghost"
                      leftIcon={<FaCopy />}
                      onClick={() => copyToClipboard(requestId, 'Request ID')}
                    >
                      Copy
                    </Button>
                  </HStack>
                ))}
              </VStack>

              <Alert status="warning" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  These are sample request IDs for demonstration. In a real application,
                  you would see actual request IDs from recent API calls.
                </Text>
              </Alert>
            </VStack>
          </SectionCard>

          {/* Request Forwarding */}
          <SectionCard title="Request Forwarding & Propagation">
            <VStack align="stretch" spacing={3}>
              <Text fontSize="sm" color="gray.700" fontWeight="semibold">
                How Request IDs Work:
              </Text>
              
              <VStack align="start" spacing={2} pl={4}>
                <Text fontSize="sm">
                  • <strong>Generation:</strong> Each incoming request gets a unique ID if none is provided
                </Text>
                <Text fontSize="sm">
                  • <strong>Forwarding:</strong> The request ID is included in all outbound requests to other services
                </Text>
                <Text fontSize="sm">
                  • <strong>Logging:</strong> All log entries include the request ID for correlation
                </Text>
                <Text fontSize="sm">
                  • <strong>Audit Trail:</strong> Request IDs are stored in audit logs for traceability
                </Text>
                <Text fontSize="sm">
                  • <strong>Error Tracking:</strong> Error responses include the request ID for debugging
                </Text>
              </VStack>

              <Alert status="info" mt={4}>
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" fontWeight="bold">Client Usage</Text>
                  <Text fontSize="sm">
                    Clients can provide their own request ID by sending the {config.tracing.REQUEST_ID_HEADER} header.
                    If no ID is provided, the server will generate one automatically.
                  </Text>
                </VStack>
              </Alert>
            </VStack>
          </SectionCard>

          {/* Integration Examples */}
          <SectionCard title="Integration Examples">
            <VStack align="stretch" spacing={3}>
              <Text fontSize="sm" color="gray.700" fontWeight="semibold">
                Using Request IDs for Debugging:
              </Text>
              
              <Box as="pre" fontSize="xs" bg="gray.50" p={3} borderRadius="md" overflow="auto">
{`// Client-side JavaScript
const response = await fetch('/api/users', {
  headers: {
    '${config.tracing.REQUEST_ID_HEADER}': 'client_generated_id_123'
  }
});

// The response will include the request ID
const requestId = response.headers.get('${config.tracing.REQUEST_ID_HEADER}');
console.log('Request ID:', requestId);

// Server logs will show:
// [INFO] ${currentRequestId} - Processing GET /api/users
// [ERROR] ${currentRequestId} - Database connection failed`}
              </Box>

              <Alert status="info">
                <AlertIcon />
                <Text fontSize="sm">
                  When reporting issues, include the request ID to help administrators 
                  quickly locate the relevant logs and audit entries.
                </Text>
              </Alert>
            </VStack>
          </SectionCard>
        </VStack>
      )}
    </Box>
  );
}