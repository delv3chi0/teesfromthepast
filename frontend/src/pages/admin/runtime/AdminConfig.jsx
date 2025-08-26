// frontend/src/pages/admin/runtime/AdminConfig.jsx
/**
 * Admin Config tab for displaying complete runtime configuration as JSON
 */

import React, { useState, useEffect } from 'react';
import {
  VStack,
  Button,
  Badge,
  useToast
} from '@chakra-ui/react';
import { FaSync } from 'react-icons/fa';
import SectionCard from '../../../components/shared/SectionCard.jsx';
import JSONPreview from '../../../components/shared/JSONPreview.jsx';
import { fetchRuntimeConfig, handleRuntimeApiError } from '../../../api/adminRuntime.js';

export default function AdminConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    
    try {
      const response = await fetchRuntimeConfig();
      setConfig(response.data);
    } catch (err) {
      const errorInfo = handleRuntimeApiError(err);
      toast({
        title: 'Failed to load configuration',
        description: errorInfo.message,
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      <SectionCard
        title="Configuration"
        subtitle="Complete runtime configuration snapshot"
        badge={
          <Badge colorScheme="orange" variant="subtle">
            EPHEMERAL
          </Badge>
        }
        helpText="Complete runtime configuration including all dynamic settings. Changes are not persisted across server restarts."
        headerActions={
          <Button
            size="sm"
            leftIcon={<FaSync />}
            onClick={loadConfig}
            isLoading={loading}
            variant="outline"
          >
            Refresh
          </Button>
        }
      >
        {config && (
          <JSONPreview
            data={config}
            title="Runtime Configuration"
            filename={`runtime-config-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`}
          />
        )}
      </SectionCard>
    </VStack>
  );
}