// frontend/src/pages/admin/AdminSecurity.jsx
// Admin page for managing security configuration

import React, { useState, useEffect } from 'react';
import { 
  VStack, 
  HStack,
  Text, 
  Button,
  Alert,
  AlertIcon,
  useToast,
  Divider
} from '@chakra-ui/react';
import { FaSync, FaShieldAlt } from 'react-icons/fa';

import SectionCard from '../../components/admin/common/SectionCard.jsx';
import ToggleRow from '../../components/admin/common/ToggleRow.jsx';
import KeyValueGrid from '../../components/admin/common/KeyValueGrid.jsx';
import { fetchRuntimeConfig, updateSecurityConfig } from '../../api/adminRuntime.js';

const AdminSecurity = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const toast = useToast();

  const fetchConfig = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await fetchRuntimeConfig();
      setConfig(data);
    } catch (err) {
      setError(err.fallback ? 
        'Runtime configuration not available. Using static configuration.' : 
        err.error || 'Failed to fetch configuration'
      );
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (field, value) => {
    try {
      const update = { [field]: value };
      const updated = await updateSecurityConfig(update);
      
      // Update local state immediately for responsive UI
      setConfig(prev => ({
        ...prev,
        security: {
          ...prev.security,
          ...updated
        }
      }));
      
      toast({
        title: "Security configuration updated",
        description: `${field} set to ${value}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Failed to update security configuration",
        description: err.error || 'Unknown error occurred',
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      
      // Refresh config to restore correct state
      await fetchConfig();
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const currentConfigData = config ? [
    { 
      label: 'CSP Report Only Mode', 
      value: config.security.cspReportOnly ? 'Enabled' : 'Disabled',
      badge: { 
        colorScheme: config.security.cspReportOnly ? 'green' : 'orange' 
      }
    },
    { 
      label: 'Cross-Origin Embedder Policy', 
      value: config.security.enableCOEP ? 'Enabled' : 'Disabled',
      badge: { 
        colorScheme: config.security.enableCOEP ? 'green' : 'gray' 
      }
    }
  ] : [];

  return (
    <VStack spacing={6} align="stretch">
      <SectionCard title="Security Configuration">
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" fontWeight="medium">
              Dynamic Security Settings (Ephemeral)
            </Text>
            <Text fontSize="xs">
              Changes apply immediately to new requests but are lost on server restart.
              These settings control Content Security Policy and cross-origin policies.
            </Text>
          </VStack>
        </Alert>

        <HStack justify="space-between">
          <Button
            leftIcon={<FaSync />}
            onClick={fetchConfig}
            isLoading={loading}
            size="sm"
            variant="outline"
          >
            Refresh
          </Button>
        </HStack>

        {error && (
          <Alert status="warning">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {config && (
          <>
            <Divider />
            
            <Text fontSize="md" fontWeight="semibold">Current Configuration</Text>
            <KeyValueGrid data={currentConfigData} columns={1} />
            
            <Divider />
            
            <Text fontSize="md" fontWeight="semibold">Security Settings</Text>
            
            <ToggleRow
              label="CSP Report-Only Mode"
              description="When enabled, Content Security Policy violations are reported but not enforced. Disable for strict enforcement."
              isChecked={config.security.cspReportOnly}
              onChange={(e) => updateConfig('cspReportOnly', e.target.checked)}
              helpText="CSP Report-Only mode allows testing policy changes without breaking functionality. Disable to enforce CSP strictly."
            />

            <ToggleRow
              label="Cross-Origin Embedder Policy (COEP)"
              description="Enables Cross-Origin Embedder Policy header for enhanced isolation. May require updates to cross-origin resources."
              isChecked={config.security.enableCOEP}
              onChange={(e) => updateConfig('enableCOEP', e.target.checked)}
              helpText="COEP provides additional security by requiring cross-origin resources to explicitly opt-in to being embedded. This may break some external resources if they don't support CORP headers."
            />

            <Divider />

            <Alert status="warning" size="sm">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="medium">
                  Security Impact Warning
                </Text>
                <Text fontSize="xs">
                  Changing these settings can affect browser behavior for all users immediately. 
                  Test changes carefully in a staging environment before applying to production.
                  Disabling CSP Report-Only mode will enforce strict CSP rules and may block content.
                </Text>
              </VStack>
            </Alert>
          </>
        )}
      </SectionCard>
    </VStack>
  );
};

export default AdminSecurity;