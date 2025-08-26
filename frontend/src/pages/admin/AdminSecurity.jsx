// frontend/src/pages/admin/AdminSecurity.jsx
// Security configuration page with dynamic toggles
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
  useToast
} from '@chakra-ui/react';
import { FaSync, FaShieldAlt } from 'react-icons/fa';
import { fetchRuntimeConfig, updateSecurityConfig } from '../../api/adminRuntime.js';
import SectionCard from '../../components/admin/common/SectionCard.jsx';
import ToggleRow from '../../components/admin/common/ToggleRow.jsx';

const AdminSecurity = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backendAvailable, setBackendAvailable] = useState(true);
  const toast = useToast();

  // Fetch current configuration
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await fetchRuntimeConfig();
      
      if (result.success) {
        setConfig(result.data.security);
        setBackendAvailable(true);
      } else {
        setError(result.error);
        setBackendAvailable(result.backendAvailable);
      }
    } catch (err) {
      setError('Failed to fetch security configuration');
      setBackendAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Update security setting
  const updateSetting = async (key, value) => {
    try {
      const updates = { [key]: value };
      const result = await updateSecurityConfig(updates);
      
      if (result.success) {
        setConfig(prev => ({ ...prev, [key]: value }));
        
        toast({
          title: 'Security setting updated',
          description: `${key} has been ${value ? 'enabled' : 'disabled'}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Update failed',
          description: result.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      toast({
        title: 'Update failed',
        description: 'Failed to update security setting',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Get effective mode description
  const getEffectiveMode = () => {
    if (!config) return '';
    
    const modes = [];
    
    if (config.cspReportOnly) {
      modes.push('CSP Report-Only');
    } else {
      modes.push('CSP Enforcing');
    }
    
    if (config.enableCOEP) {
      modes.push('COEP Enabled');
    } else {
      modes.push('COEP Disabled');
    }
    
    return modes.join(' | ');
  };

  if (!backendAvailable) {
    return (
      <SectionCard title="Security Configuration">
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

  if (loading || !config) {
    return (
      <SectionCard title="Security Configuration">
        <HStack justify="center" py={8}>
          <Spinner size="md" />
          <Text>Loading security configuration...</Text>
        </HStack>
      </SectionCard>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <SectionCard 
        title="Security Configuration"
        headerContent={
          <HStack>
            <Button
              size="sm"
              leftIcon={<FaSync />}
              onClick={fetchConfig}
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
            <Text>Security settings take effect immediately for new requests.</Text>
            <Text fontSize="xs" color="gray.600">
              Changes are ephemeral and will be lost on server restart.
            </Text>
          </VStack>
        </Alert>

        {/* Current Effective Mode */}
        <HStack justify="space-between" align="center">
          <HStack>
            <FaShieldAlt />
            <Text fontWeight="medium">Current Security Mode:</Text>
          </HStack>
          <Badge colorScheme="blue" fontSize="sm" px={3} py={1}>
            {getEffectiveMode()}
          </Badge>
        </HStack>
      </SectionCard>

      {/* Error Display */}
      {error && (
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* Security Settings */}
      <SectionCard title="Content Security Policy (CSP)">
        <VStack spacing={4} align="stretch">
          <ToggleRow
            label="CSP Report-Only Mode"
            description="When enabled, CSP violations are reported but not blocked. When disabled, CSP violations are enforced and blocked."
            value={config.cspReportOnly}
            onChange={(value) => updateSetting('cspReportOnly', value)}
          />
          
          <Alert status={config.cspReportOnly ? "warning" : "success"} size="sm">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontSize="sm">
                CSP is currently in <strong>{config.cspReportOnly ? 'Report-Only' : 'Enforcing'}</strong> mode
              </Text>
              <Text fontSize="xs" color="gray.600">
                {config.cspReportOnly 
                  ? 'Violations will be logged but content will still load'
                  : 'Violations will block content from loading'
                }
              </Text>
            </VStack>
          </Alert>
        </VStack>
      </SectionCard>

      <SectionCard title="Cross-Origin Embedder Policy (COEP)">
        <VStack spacing={4} align="stretch">
          <ToggleRow
            label="Enable COEP"
            description="Cross-Origin Embedder Policy requires cross-origin resources to be explicitly opted into being loaded. This enhances security but may break some functionality."
            value={config.enableCOEP}
            onChange={(value) => updateSetting('enableCOEP', value)}
          />
          
          <Alert status={config.enableCOEP ? "success" : "info"} size="sm">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontSize="sm">
                COEP is currently <strong>{config.enableCOEP ? 'Enabled' : 'Disabled'}</strong>
              </Text>
              <Text fontSize="xs" color="gray.600">
                {config.enableCOEP 
                  ? 'Cross-origin resources must explicitly opt-in to be embedded'
                  : 'Cross-origin resources can be embedded without explicit opt-in'
                }
              </Text>
            </VStack>
          </Alert>
        </VStack>
      </SectionCard>

      {/* Security Guidelines */}
      <SectionCard title="Security Guidelines">
        <VStack spacing={3} align="stretch">
          <Alert status="info" size="sm">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" fontWeight="medium">Recommended Configuration</Text>
              <Text fontSize="xs">
                • Start with CSP Report-Only mode to identify potential issues
                • Monitor CSP violation reports before switching to enforcing mode
                • Enable COEP only after ensuring all cross-origin resources are properly configured
              </Text>
            </VStack>
          </Alert>
          
          <Alert status="warning" size="sm">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" fontWeight="medium">Important Notes</Text>
              <Text fontSize="xs">
                • These settings affect browser security policies immediately
                • Test thoroughly in development before applying to production
                • Changes are ephemeral and need to be applied to static configuration for persistence
              </Text>
            </VStack>
          </Alert>
        </VStack>
      </SectionCard>
    </VStack>
  );
};

export default AdminSecurity;