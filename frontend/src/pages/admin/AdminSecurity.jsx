// frontend/src/pages/admin/AdminSecurity.jsx
// Admin Security configuration tab
import React, { useState, useEffect, useCallback } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  useToast,
  Alert,
  AlertIcon,
  Box,
  Code,
  Badge
} from '@chakra-ui/react';
import { FaSave, FaSync, FaShieldAlt } from 'react-icons/fa';
import { fetchRuntimeConfig, updateSecurityConfig } from '../../api/adminRuntime';
import SectionCard from '../../components/admin/common/SectionCard';
import ToggleRow from '../../components/admin/common/ToggleRow';

export default function AdminSecurity() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [securityConfig, setSecurityConfig] = useState({
    cspReportOnly: null,
    enableCOEP: null
  });
  const toast = useToast();

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchRuntimeConfig();
      const security = response.config.security;
      
      setConfig(security);
      setSecurityConfig({
        cspReportOnly: security.cspReportOnly,
        enableCOEP: security.enableCOEP
      });
    } catch (error) {
      toast({
        title: "Failed to fetch security config",
        description: error.message,
        status: "error",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSecurityConfig(securityConfig);
      
      toast({
        title: "Security configuration updated",
        description: "Changes are now active",
        status: "success",
        duration: 3000,
      });

      // Refresh to show updated config
      await fetchConfig();
    } catch (error) {
      toast({
        title: "Failed to update configuration",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const buildEffectiveCSP = () => {
    const reportOnly = securityConfig.cspReportOnly !== null ? 
      securityConfig.cspReportOnly : 
      true; // Default from backend

    // This is a simplified version - the actual CSP is built in the backend
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'"
    ];

    return {
      policy: cspDirectives.join('; '),
      reportOnly
    };
  };

  const effectiveCSP = buildEffectiveCSP();

  const headerActions = (
    <HStack spacing={3}>
      <Button
        size="sm"
        leftIcon={<FaSync />}
        onClick={fetchConfig}
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
        colorScheme="green"
      >
        Save Changes
      </Button>
    </HStack>
  );

  if (loading && !config) {
    return (
      <SectionCard title="Security Configuration">
        <Text>Loading configuration...</Text>
      </SectionCard>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <SectionCard title="Security Configuration" headerActions={headerActions}>
        <Alert status="info" mb={4}>
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">Runtime Security Settings</Text>
            <Text fontSize="sm">
              These settings modify security headers dynamically. Changes take effect immediately.
              Settings are ephemeral and reset on server restart.
            </Text>
          </VStack>
        </Alert>

        <VStack spacing={4} align="stretch">
          <ToggleRow
            label="CSP Report-Only Mode"
            value={securityConfig.cspReportOnly}
            onChange={(value) => setSecurityConfig({ 
              ...securityConfig, 
              cspReportOnly: value 
            })}
            description="When enabled, CSP violations are reported but not enforced. Useful for testing new policies."
            tooltip="Toggle between enforcing CSP (false) and report-only mode (true)"
          />

          <ToggleRow
            label="Cross-Origin Embedder Policy (COEP)"
            value={securityConfig.enableCOEP}
            onChange={(value) => setSecurityConfig({ 
              ...securityConfig, 
              enableCOEP: value 
            })}
            description="Enables Cross-Origin Embedder Policy: require-corp header. May break some third-party embeds."
            tooltip="Enable or disable COEP header for enhanced isolation"
          />
        </VStack>
      </SectionCard>

      <SectionCard title="Current Security Headers">
        <VStack spacing={4} align="stretch">
          <Box>
            <HStack justify="space-between" align="center" mb={2}>
              <Text fontWeight="bold">Content Security Policy</Text>
              <Badge colorScheme={effectiveCSP.reportOnly ? 'yellow' : 'green'}>
                {effectiveCSP.reportOnly ? 'Report-Only' : 'Enforced'}
              </Badge>
            </HStack>
            <Code
              display="block"
              whiteSpace="pre-wrap"
              p={3}
              bg="gray.50"
              borderRadius="md"
              fontSize="sm"
            >
              {effectiveCSP.policy}
            </Code>
            <Text fontSize="xs" color="gray.600" mt={1}>
              Header: Content-Security-Policy{effectiveCSP.reportOnly ? '-Report-Only' : ''}
            </Text>
          </Box>

          <Box>
            <Text fontWeight="bold" mb={2}>Other Security Headers</Text>
            <VStack align="start" spacing={2}>
              <Box>
                <Text fontSize="sm" fontWeight="medium">Cross-Origin Resource Policy</Text>
                <Code fontSize="sm">Cross-Origin-Resource-Policy: same-site</Code>
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="medium">Cross-Origin Opener Policy</Text>
                <Code fontSize="sm">Cross-Origin-Opener-Policy: same-origin</Code>
              </Box>
              {securityConfig.enableCOEP && (
                <Box>
                  <Text fontSize="sm" fontWeight="medium">Cross-Origin Embedder Policy</Text>
                  <Code fontSize="sm">Cross-Origin-Embedder-Policy: require-corp</Code>
                  <Badge colorScheme="blue" size="sm" ml={2}>Active</Badge>
                </Box>
              )}
              <Box>
                <Text fontSize="sm" fontWeight="medium">Referrer Policy</Text>
                <Code fontSize="sm">Referrer-Policy: strict-origin-when-cross-origin</Code>
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="medium">X-Frame-Options</Text>
                <Code fontSize="sm">X-Frame-Options: DENY</Code>
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="medium">X-Content-Type-Options</Text>
                <Code fontSize="sm">X-Content-Type-Options: nosniff</Code>
              </Box>
            </VStack>
          </Box>
        </VStack>
      </SectionCard>

      <SectionCard title="Manual Verification">
        <VStack align="start" spacing={3}>
          <Text fontWeight="bold">Testing Security Headers</Text>
          <Text fontSize="sm" color="gray.600">
            To verify security header changes are active:
          </Text>
          <Box as="ol" pl={4} fontSize="sm" color="gray.700">
            <Box as="li" mb={1}>Open browser developer tools (F12)</Box>
            <Box as="li" mb={1}>Navigate to Network tab</Box>
            <Box as="li" mb={1}>Refresh this page or make a request</Box>
            <Box as="li" mb={1}>Check response headers for CSP and COEP changes</Box>
          </Box>
          <Box bg="gray.50" p={3} borderRadius="md" fontSize="sm" fontFamily="mono">
            curl -I {window.location.origin}/api/admin/runtime/config
          </Box>
          <Text fontSize="xs" color="gray.500">
            Use this command to check headers from command line
          </Text>
        </VStack>
      </SectionCard>
    </VStack>
  );
}