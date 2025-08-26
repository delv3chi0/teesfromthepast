// frontend/src/pages/admin/AdminConfig.jsx
// Runtime configuration viewer with export functionality
import React, { useState, useEffect, useCallback } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  Alert,
  AlertIcon,
  Spinner,
  Badge,
  Switch,
  useToast
} from '@chakra-ui/react';
import { FaSync, FaCog, FaDownload, FaCopy } from 'react-icons/fa';
import { fetchRuntimeConfig } from '../../api/adminRuntime.js';
import SectionCard from '../../components/admin/common/SectionCard.jsx';
import JSONPreview from '../../components/admin/common/JSONPreview.jsx';

const AdminConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const toast = useToast();

  // Fetch configuration data
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');

    try {
      const result = await fetchRuntimeConfig();
      
      if (result.success) {
        setConfig(result.data);
        setBackendAvailable(true);
        setLastUpdated(new Date());
      } else {
        setError(result.error);
        setBackendAvailable(result.backendAvailable);
      }
    } catch (err) {
      setError('Failed to fetch runtime configuration');
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
      }, 10000); // 10 seconds
      
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

  // Generate filename for export
  const getExportFilename = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `runtime-config-${timestamp}.json`;
  };

  // Copy configuration to clipboard
  const copyToClipboard = async () => {
    try {
      const jsonString = JSON.stringify(config, null, 2);
      await navigator.clipboard.writeText(jsonString);
      
      toast({
        title: 'Configuration copied',
        description: 'Runtime configuration has been copied to clipboard',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Download configuration as JSON file
  const downloadConfig = () => {
    try {
      const jsonString = JSON.stringify(config, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getExportFilename();
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Configuration downloaded',
        description: 'Runtime configuration has been saved as JSON file',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Calculate configuration summary
  const getConfigSummary = () => {
    if (!config) return {};
    
    return {
      rateLimitOverrides: config.rateLimit?.overrides?.length || 0,
      rateLimitRoleOverrides: config.rateLimit?.roleOverrides?.length || 0,
      recentRequestIds: config.tracing?.recentRequestIds?.length || 0,
      securityMode: `CSP: ${config.security?.cspReportOnly ? 'Report-Only' : 'Enforcing'}, COEP: ${config.security?.enableCOEP ? 'Enabled' : 'Disabled'}`,
      metricsEnabled: config.metrics?.enabled ? 'Yes' : 'No'
    };
  };

  if (!backendAvailable) {
    return (
      <SectionCard title="Runtime Configuration">
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

  const summary = getConfigSummary();

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <SectionCard 
        title="Runtime Configuration"
        headerContent={
          <HStack>
            <HStack>
              <Switch
                isChecked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                colorScheme="brand"
                size="sm"
              />
              <Text fontSize="sm">Auto-refresh (10s)</Text>
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
            <Text>This shows the current in-memory runtime configuration that can be modified dynamically.</Text>
            <Text fontSize="xs" color="gray.600">
              Changes are ephemeral and will be lost on server restart unless applied to static configuration.
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
          <Text>Loading runtime configuration...</Text>
        </HStack>
      )}

      {/* Configuration Summary */}
      {!loading && config && (
        <SectionCard title="Configuration Summary">
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="medium">Rate Limit Overrides</Text>
              <Badge colorScheme="blue">{summary.rateLimitOverrides}</Badge>
            </HStack>
            
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="medium">Role Overrides</Text>
              <Badge colorScheme="purple">{summary.rateLimitRoleOverrides}</Badge>
            </HStack>
            
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="medium">Recent Request IDs</Text>
              <Badge colorScheme="green">{summary.recentRequestIds}</Badge>
            </HStack>
            
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="medium">Security Mode</Text>
              <Badge colorScheme="orange" fontSize="xs">{summary.securityMode}</Badge>
            </HStack>
            
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="medium">Metrics Enabled</Text>
              <Badge colorScheme={config.metrics?.enabled ? 'green' : 'red'}>
                {summary.metricsEnabled}
              </Badge>
            </HStack>
          </VStack>
        </SectionCard>
      )}

      {/* Full Configuration Display */}
      {!loading && config && (
        <SectionCard 
          title="Full Configuration"
          headerContent={
            <HStack>
              <Button
                size="sm"
                leftIcon={<FaCopy />}
                onClick={copyToClipboard}
                variant="outline"
              >
                Copy
              </Button>
              <Button
                size="sm"
                leftIcon={<FaDownload />}
                onClick={downloadConfig}
                variant="outline"
                colorScheme="brand"
              >
                Download JSON
              </Button>
            </HStack>
          }
        >
          <JSONPreview 
            data={config}
            filename={getExportFilename()}
            showControls={false}
            maxHeight="600px"
          />
        </SectionCard>
      )}

      {/* Configuration Sections */}
      {!loading && config && (
        <VStack spacing={4} align="stretch">
          {/* Rate Limiting Section */}
          <SectionCard title="Rate Limiting Configuration">
            <JSONPreview 
              data={config.rateLimit}
              filename={`rate-limit-config-${new Date().toISOString().split('T')[0]}.json`}
              maxHeight="300px"
            />
          </SectionCard>

          {/* Security Section */}
          <SectionCard title="Security Configuration">
            <JSONPreview 
              data={config.security}
              filename={`security-config-${new Date().toISOString().split('T')[0]}.json`}
              maxHeight="200px"
            />
          </SectionCard>

          {/* Tracing Section */}
          <SectionCard title="Tracing Configuration">
            <JSONPreview 
              data={config.tracing}
              filename={`tracing-config-${new Date().toISOString().split('T')[0]}.json`}
              maxHeight="300px"
            />
          </SectionCard>

          {/* Metrics Section */}
          <SectionCard title="Metrics Configuration">
            <JSONPreview 
              data={config.metrics}
              filename={`metrics-config-${new Date().toISOString().split('T')[0]}.json`}
              maxHeight="150px"
            />
          </SectionCard>

          {/* Versions Section */}
          <SectionCard title="Version Information">
            <JSONPreview 
              data={config.versions}
              filename={`version-info-${new Date().toISOString().split('T')[0]}.json`}
              maxHeight="150px"
            />
          </SectionCard>
        </VStack>
      )}

      {/* Usage Information */}
      <SectionCard title="Usage Information">
        <VStack spacing={4} align="stretch">
          <Alert status="info" size="sm">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <Text fontSize="sm" fontWeight="medium">Configuration Management</Text>
              <Text fontSize="xs">
                • This configuration represents the current in-memory state of dynamic settings
                • Changes made through the admin console are reflected here immediately
                • Export this configuration to preserve current settings or for backup purposes
              </Text>
            </VStack>
          </Alert>
          
          <Alert status="warning" size="sm">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <Text fontSize="sm" fontWeight="medium">Persistence</Text>
              <Text fontSize="xs">
                • Dynamic configuration changes are ephemeral and lost on server restart
                • To make changes permanent, update the corresponding environment variables or config files
                • Use the export feature to capture current settings for deployment
              </Text>
            </VStack>
          </Alert>
        </VStack>
      </SectionCard>

      {/* Empty State */}
      {!loading && !config && !error && (
        <SectionCard>
          <VStack py={8} spacing={4}>
            <FaCog size={32} color="gray" />
            <Text color="gray.500" fontSize="lg">No configuration data available</Text>
            <Text color="gray.400" fontSize="sm" textAlign="center">
              Unable to fetch runtime configuration from the backend.
            </Text>
          </VStack>
        </SectionCard>
      )}
    </VStack>
  );
};

export default AdminConfig;