// frontend/src/pages/admin/runtime/AdminSecurity.jsx
/**
 * Admin Security tab for managing dynamic security configuration
 */

import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Button,
  Text,
  Alert,
  AlertIcon,
  Badge,
  useToast
} from '@chakra-ui/react';
import { FaSync, FaSave } from 'react-icons/fa';
import SectionCard from '../../../components/shared/SectionCard.jsx';
import ToggleRow from '../../../components/shared/ToggleRow.jsx';
import { 
  fetchRuntimeConfig, 
  updateSecurityConfig, 
  handleRuntimeApiError 
} from '../../../api/adminRuntime.js';

export default function AdminSecurity() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [localConfig, setLocalConfig] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  const toast = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config && localConfig) {
      const hasConfigChanges = JSON.stringify(config.security) !== JSON.stringify(localConfig);
      setHasChanges(hasConfigChanges);
    }
  }, [config, localConfig]);

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetchRuntimeConfig();
      setConfig(response.data);
      setLocalConfig(response.data.security);
    } catch (err) {
      const errorInfo = handleRuntimeApiError(err);
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!localConfig) return;
    
    setSaving(true);
    
    try {
      await updateSecurityConfig(localConfig);
      
      toast({
        title: 'Security configuration updated',
        description: 'Changes applied successfully and are effective immediately',
        status: 'success',
        duration: 3000
      });
      
      await loadConfig();
      setHasChanges(false);
    } catch (err) {
      const errorInfo = handleRuntimeApiError(err);
      toast({
        title: 'Update Failed',
        description: errorInfo.message,
        status: 'error',
        duration: 5000
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setLocalConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <SectionCard title="Security" subtitle="Loading configuration...">
        <Text>Loading...</Text>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="Security" subtitle="Dynamic security configuration">
        <Alert status="error">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text>{error}</Text>
            <Button size="sm" onClick={loadConfig}>
              Retry
            </Button>
          </VStack>
        </Alert>
      </SectionCard>
    );
  }

  if (!config || !localConfig) {
    return null;
  }

  return (
    <VStack spacing={6} align="stretch">
      <SectionCard
        title="Security"
        subtitle="Dynamic security header configuration"
        badge={
          <Badge colorScheme="orange" variant="subtle">
            EPHEMERAL
          </Badge>
        }
        helpText="Changes are applied immediately but not persisted. Server restart resets to environment defaults."
        headerActions={
          <HStack spacing={2}>
            <Button
              size="sm"
              leftIcon={<FaSync />}
              onClick={loadConfig}
              isLoading={loading}
              variant="outline"
            >
              Refresh
            </Button>
            
            <Button
              size="sm"
              leftIcon={<FaSave />}
              onClick={handleSave}
              isLoading={saving}
              isDisabled={!hasChanges}
              colorScheme="blue"
            >
              Save Changes
            </Button>
          </HStack>
        }
      >
        {hasChanges && (
          <Alert status="info" mb={4}>
            <AlertIcon />
            You have unsaved changes. Click "Save Changes" to apply them.
          </Alert>
        )}
        
        <VStack spacing={4} align="stretch">
          <ToggleRow
            label="CSP Report Only"
            value={localConfig.cspReportOnly}
            onChange={(value) => handleFieldChange('cspReportOnly', value)}
            helpText="When enabled, CSP violations are reported but not enforced. When disabled, CSP violations are blocked."
            trueLabel="Report Only"
            falseLabel="Enforcing"
          />
          
          <ToggleRow
            label="Enable COEP"
            value={localConfig.enableCOEP}
            onChange={(value) => handleFieldChange('enableCOEP', value)}
            helpText="Cross-Origin Embedder Policy header. Enables advanced browser features but may affect third-party integrations."
            trueLabel="Enabled"
            falseLabel="Disabled"
          />
        </VStack>
      </SectionCard>
    </VStack>
  );
}