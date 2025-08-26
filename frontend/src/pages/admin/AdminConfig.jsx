// frontend/src/pages/admin/AdminConfig.jsx
// Admin Configuration viewer tab
import React, { useState, useEffect, useCallback } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  useToast,
  Alert,
  AlertIcon,
  Badge
} from '@chakra-ui/react';
import { FaSync, FaCog, FaExclamationTriangle } from 'react-icons/fa';
import { fetchRuntimeConfig } from '../../api/adminRuntime';
import SectionCard from '../../components/admin/common/SectionCard';
import JSONPreview from '../../components/admin/common/JSONPreview';

export default function AdminConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchRuntimeConfig();
      setConfig(response.config);
    } catch (error) {
      toast({
        title: "Failed to fetch configuration",
        description: error.message,
        status: "error",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const headerActions = (
    <HStack spacing={3}>
      <Button
        size="sm"
        leftIcon={<FaSync />}
        onClick={fetchConfig}
        isLoading={loading}
        variant="outline"
        colorScheme="blue"
      >
        Refresh
      </Button>
    </HStack>
  );

  const getConfigSections = () => {
    if (!config) return [];

    return [
      {
        title: "Version Information",
        data: config.version,
        description: "Build and deployment details"
      },
      {
        title: "Rate Limiting",
        data: config.rateLimit,
        description: "Current rate limiting configuration and overrides"
      },
      {
        title: "Security Settings",
        data: config.security,
        description: "Security headers and policy configurations"
      },
      {
        title: "Tracing Configuration",
        data: config.tracing,
        description: "Request tracing and ID management settings"
      },
      {
        title: "Metrics Configuration",
        data: config.metrics,
        description: "Metrics collection and monitoring settings"
      },
      {
        title: "Audit Configuration",
        data: config.audit,
        description: "Audit logging and ring buffer settings"
      }
    ];
  };

  return (
    <VStack spacing={6} align="stretch">
      <SectionCard title="Runtime Configuration Snapshot" headerActions={headerActions}>
        <Alert status="warning" mb={4}>
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <HStack>
              <FaExclamationTriangle />
              <Text fontWeight="bold">Ephemeral Configuration</Text>
            </HStack>
            <Text fontSize="sm">
              These settings are stored in memory and will be reset when the server restarts.
              This view shows the current active configuration including any dynamic overrides.
            </Text>
          </VStack>
        </Alert>

        {config && (
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between" align="center">
              <HStack>
                <FaCog />
                <Text fontWeight="bold">Configuration Snapshot</Text>
              </HStack>
              <Badge colorScheme="green">
                Updated: {config.timestamp ? new Date(config.timestamp).toLocaleString() : 'Unknown'}
              </Badge>
            </HStack>

            <JSONPreview
              data={config}
              title="Complete Runtime Configuration"
              collapsible={true}
              maxHeight="600px"
            />
          </VStack>
        )}
      </SectionCard>

      {/* Individual Configuration Sections */}
      {getConfigSections().map((section) => (
        <SectionCard key={section.title} title={section.title}>
          <VStack spacing={3} align="stretch">
            <Text fontSize="sm" color="gray.600">
              {section.description}
            </Text>
            
            <JSONPreview
              data={section.data}
              title={`${section.title} Details`}
              collapsible={true}
              maxHeight="300px"
              fontSize="xs"
            />
          </VStack>
        </SectionCard>
      ))}

      {/* Configuration Guidelines */}
      <SectionCard title="Configuration Guidelines">
        <VStack align="start" spacing={4}>
          <Box>
            <Text fontWeight="bold" mb={2}>Understanding Configuration Precedence</Text>
            <VStack align="start" spacing={1} fontSize="sm" color="gray.700">
              <Text>1. <strong>Dynamic overrides</strong> (highest priority) - Set via admin console</Text>
              <Text>2. <strong>Environment variables</strong> - Set in .env or deployment</Text>
              <Text>3. <strong>Default values</strong> (lowest priority) - Hardcoded fallbacks</Text>
            </VStack>
          </Box>

          <Box>
            <Text fontWeight="bold" mb={2}>Making Changes Persistent</Text>
            <Text fontSize="sm" color="gray.700">
              To make configuration changes permanent, update the corresponding environment 
              variables in your deployment configuration. Dynamic overrides are useful for 
              testing and emergency adjustments but should not be relied upon for long-term configuration.
            </Text>
          </Box>

          <Box>
            <Text fontWeight="bold" mb={2}>Verification Commands</Text>
            <VStack align="start" spacing={2} fontSize="sm" fontFamily="mono" color="gray.600">
              <Text>curl -H "Authorization: Bearer TOKEN" {window.location.origin}/api/admin/runtime/config</Text>
              <Text>curl -I {window.location.origin}/api/health</Text>
              <Text>curl -I {window.location.origin}/api/readiness</Text>
            </VStack>
          </Box>
        </VStack>
      </SectionCard>
    </VStack>
  );
}