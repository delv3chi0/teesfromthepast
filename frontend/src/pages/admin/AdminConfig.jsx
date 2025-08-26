// frontend/src/pages/admin/AdminConfig.jsx
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
  Badge,
  useToast
} from '@chakra-ui/react';
import { FaCog, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import { getRuntimeConfig, getDynamicOverrides } from '../../api/adminRuntime.js';
import SectionCard from '../../components/admin/common/SectionCard.jsx';
import JSONPreview from '../../components/admin/common/JSONPreview.jsx';
import KeyValueGrid from '../../components/admin/common/KeyValueGrid.jsx';

export default function AdminConfig() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [overrides, setOverrides] = useState(null);
  const [error, setError] = useState('');
  const toast = useToast();

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Load runtime config
      const configResult = await getRuntimeConfig();
      setConfig(configResult.config);

      // Load dynamic overrides
      const overridesResult = await getDynamicOverrides();
      setOverrides(overridesResult.overrides);
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

  const getOverrideStatus = (category) => {
    if (!overrides || !overrides[category]) return 'default';
    
    const categoryOverrides = overrides[category];
    const hasActiveOverrides = Object.values(categoryOverrides).some(value => value !== null);
    return hasActiveOverrides ? 'overridden' : 'default';
  };

  const countActiveOverrides = () => {
    if (!overrides) return 0;
    
    let count = 0;
    Object.values(overrides).forEach(category => {
      if (typeof category === 'object') {
        Object.values(category).forEach(value => {
          if (value !== null) count++;
        });
      }
    });
    return count;
  };

  return (
    <Box layerStyle="cardBlue" w="100%" p={{ base: 2, md: 4 }}>
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={2}>
        <HStack>
          <FaCog />
          <Heading size="md">Configuration Inspector</Heading>
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
          <Text>Loading configuration...</Text>
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
          {/* Override Status */}
          <Alert status="info">
            <FaExclamationTriangle />
            <VStack align="start" spacing={1} ml={2}>
              <Text fontWeight="bold">Runtime Configuration</Text>
              <Text fontSize="sm">
                This shows the effective runtime configuration with any dynamic overrides applied.
                {countActiveOverrides() > 0 ? (
                  <> Currently {countActiveOverrides()} override(s) are active.</>
                ) : (
                  <> No dynamic overrides are currently active.</>
                )}
              </Text>
            </VStack>
          </Alert>

          {/* Configuration Categories */}
          <SectionCard title="Rate Limiting Configuration">
            <VStack align="stretch" spacing={3}>
              <HStack justify="space-between">
                <Text fontSize="sm" fontWeight="semibold">Status</Text>
                <Badge colorScheme={getOverrideStatus('rateLimit') === 'overridden' ? 'orange' : 'green'}>
                  {getOverrideStatus('rateLimit') === 'overridden' ? 'Overridden' : 'Default'}
                </Badge>
              </HStack>
              
              <KeyValueGrid
                data={config.rateLimit}
                columns={2}
              />
            </VStack>
          </SectionCard>

          <SectionCard title="Security Configuration">
            <VStack align="stretch" spacing={3}>
              <HStack justify="space-between">
                <Text fontSize="sm" fontWeight="semibold">Status</Text>
                <Badge colorScheme={getOverrideStatus('security') === 'overridden' ? 'orange' : 'green'}>
                  {getOverrideStatus('security') === 'overridden' ? 'Overridden' : 'Default'}
                </Badge>
              </HStack>
              
              <KeyValueGrid
                data={config.security}
                columns={2}
              />
            </VStack>
          </SectionCard>

          <SectionCard title="Tracing Configuration">
            <VStack align="stretch" spacing={3}>
              <HStack justify="space-between">
                <Text fontSize="sm" fontWeight="semibold">Status</Text>
                <Badge colorScheme={getOverrideStatus('tracing') === 'overridden' ? 'orange' : 'green'}>
                  {getOverrideStatus('tracing') === 'overridden' ? 'Overridden' : 'Default'}
                </Badge>
              </HStack>
              
              <KeyValueGrid
                data={config.tracing}
                columns={1}
              />
            </VStack>
          </SectionCard>

          <SectionCard title="Metrics Configuration">
            <VStack align="stretch" spacing={3}>
              <HStack justify="space-between">
                <Text fontSize="sm" fontWeight="semibold">Status</Text>
                <Badge colorScheme={getOverrideStatus('metrics') === 'overridden' ? 'orange' : 'green'}>
                  {getOverrideStatus('metrics') === 'overridden' ? 'Overridden' : 'Default'}
                </Badge>
              </HStack>
              
              <KeyValueGrid
                data={config.metrics}
                columns={1}
              />
            </VStack>
          </SectionCard>

          <SectionCard title="Version Information">
            <KeyValueGrid
              data={config.versions}
              columns={2}
            />
          </SectionCard>

          {/* Dynamic Overrides Detail */}
          {overrides && countActiveOverrides() > 0 && (
            <SectionCard title="Active Dynamic Overrides">
              <VStack align="stretch" spacing={3}>
                <Alert status="warning" size="sm">
                  <AlertIcon />
                  <Text fontSize="sm">
                    These overrides are stored in memory and will be lost on server restart.
                  </Text>
                </Alert>
                
                <JSONPreview 
                  data={overrides} 
                  title="Dynamic Overrides" 
                />
              </VStack>
            </SectionCard>
          )}

          {/* Complete Runtime Configuration */}
          <SectionCard title="Complete Runtime Configuration">
            <VStack align="stretch" spacing={3}>
              <Text fontSize="sm" color="gray.600">
                This is the complete effective configuration that the application is currently using.
                You can copy this JSON or export it for documentation purposes.
              </Text>
              
              <JSONPreview 
                data={config} 
                title="Runtime Configuration" 
              />
            </VStack>
          </SectionCard>

          {/* Configuration Notes */}
          <SectionCard title="Configuration Notes">
            <VStack align="stretch" spacing={3}>
              <Text fontSize="sm" color="gray.700" fontWeight="semibold">
                Understanding Configuration Sources:
              </Text>
              
              <VStack align="start" spacing={2} pl={4}>
                <Text fontSize="sm">
                  • <strong>Environment Variables:</strong> Base configuration from .env file or system environment
                </Text>
                <Text fontSize="sm">
                  • <strong>Dynamic Overrides:</strong> Runtime changes made through the admin interface (memory-only)
                </Text>
                <Text fontSize="sm">
                  • <strong>Effective Config:</strong> The final configuration used by the application (env + overrides)
                </Text>
              </VStack>

              <Alert status="info" mt={4}>
                <AlertIcon />
                <Text fontSize="sm">
                  Dynamic overrides take precedence over environment variables but are lost on restart.
                  To make permanent changes, update your environment variables or .env file.
                </Text>
              </Alert>
            </VStack>
          </SectionCard>
        </VStack>
      )}
    </Box>
  );
}