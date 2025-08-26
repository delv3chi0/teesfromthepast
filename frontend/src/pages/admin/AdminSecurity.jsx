// frontend/src/pages/admin/AdminSecurity.jsx
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
  useToast
} from '@chakra-ui/react';
import { FaLock, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import { getRuntimeConfig, updateSecurityConfig } from '../../api/adminRuntime.js';
import SectionCard from '../../components/admin/common/SectionCard.jsx';
import ToggleRow from '../../components/admin/common/ToggleRow.jsx';
import KeyValueGrid from '../../components/admin/common/KeyValueGrid.jsx';

export default function AdminSecurity() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const toast = useToast();

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await getRuntimeConfig();
      setConfig(result.config);
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

  const handleCSPReportOnlyChange = async (value) => {
    const result = await updateSecurityConfig({ CSP_REPORT_ONLY: value });
    setConfig(prev => ({ ...prev, security: result.config.security }));
  };

  const handleCOEPChange = async (value) => {
    const result = await updateSecurityConfig({ ENABLE_COEP: value });
    setConfig(prev => ({ ...prev, security: result.config.security }));
  };

  return (
    <Box layerStyle="cardBlue" w="100%" p={{ base: 2, md: 4 }}>
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={2}>
        <HStack>
          <FaLock />
          <Heading size="md">Security Configuration</Heading>
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
          <Text>Loading security configuration...</Text>
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
          {/* Memory-only warning */}
          <Alert status="warning">
            <FaExclamationTriangle />
            <VStack align="start" spacing={1} ml={2}>
              <Text fontWeight="bold">Runtime Security Overrides</Text>
              <Text fontSize="sm">
                Changes here are temporary and affect security headers in real-time.
                These overrides are lost on server restart.
              </Text>
            </VStack>
          </Alert>

          {/* Security Headers Configuration */}
          <SectionCard title="Content Security Policy (CSP)">
            <VStack spacing={4} align="stretch">
              <ToggleRow
                label="Report-Only Mode"
                value={config.security.CSP_REPORT_ONLY}
                onSave={handleCSPReportOnlyChange}
                tooltip="When enabled, CSP violations are reported but not blocked. When disabled, violations are blocked."
                colorScheme="blue"
              />
              
              <Text fontSize="sm" color="gray.600" bg="gray.50" p={3} borderRadius="md">
                <strong>Report-Only Mode:</strong> CSP violations are logged but content is not blocked.
                This is useful for testing CSP policies without breaking functionality.
                <br /><br />
                <strong>Enforcement Mode:</strong> CSP violations are blocked and reported.
                Use this in production after thoroughly testing with report-only mode.
              </Text>

              <KeyValueGrid
                data={{
                  "Current Mode": config.security.CSP_REPORT_ONLY ? "Report-Only" : "Enforcement",
                  "Header Sent": config.security.CSP_REPORT_ONLY ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy",
                  "Violation Handling": config.security.CSP_REPORT_ONLY ? "Logged, not blocked" : "Blocked and logged"
                }}
                columns={1}
              />
            </VStack>
          </SectionCard>

          {/* Cross-Origin Embedder Policy */}
          <SectionCard title="Cross-Origin Embedder Policy (COEP)">
            <VStack spacing={4} align="stretch">
              <ToggleRow
                label="Enable COEP"
                value={config.security.ENABLE_COEP}
                onSave={handleCOEPChange}
                tooltip="Controls whether the Cross-Origin-Embedder-Policy header is sent. Required for some advanced browser features like SharedArrayBuffer."
                colorScheme="purple"
              />
              
              <Text fontSize="sm" color="gray.600" bg="gray.50" p={3} borderRadius="md">
                <strong>Cross-Origin Embedder Policy</strong> controls how the page can embed cross-origin resources.
                When enabled, it helps create a secure cross-origin isolated environment.
                <br /><br />
                <strong>Warning:</strong> Enabling COEP may break some third-party integrations that don't support
                cross-origin isolation. Test thoroughly before enabling in production.
              </Text>

              <KeyValueGrid
                data={{
                  "Status": config.security.ENABLE_COEP ? "Enabled" : "Disabled",
                  "Header Value": config.security.ENABLE_COEP ? "require-corp" : "Not sent",
                  "Impact": config.security.ENABLE_COEP ? "Cross-origin isolation enabled" : "Standard cross-origin behavior"
                }}
                columns={1}
              />
            </VStack>
          </SectionCard>

          {/* Security Headers Overview */}
          <SectionCard title="Security Headers Overview">
            <VStack align="stretch" spacing={3}>
              <Text fontSize="sm" color="gray.600">
                This application uses multiple security headers to protect against common web vulnerabilities:
              </Text>
              
              <KeyValueGrid
                data={{
                  "Helmet.js": "Provides baseline security headers (X-Frame-Options, X-Content-Type-Options, etc.)",
                  "CORS": "Configured with allowed origins and credentials handling",
                  "Rate Limiting": "Protects against brute force and DoS attacks",
                  "Request ID": "Tracks requests for audit and debugging purposes",
                  "CSP": config.security.CSP_REPORT_ONLY ? "Report-only mode" : "Enforcement mode",
                  "COEP": config.security.ENABLE_COEP ? "Enabled" : "Disabled"
                }}
                columns={1}
              />
            </VStack>
          </SectionCard>

          {/* Security Best Practices */}
          <SectionCard title="Security Recommendations">
            <VStack align="stretch" spacing={3}>
              <Text fontSize="sm" color="gray.700" fontWeight="semibold">
                Production Security Checklist:
              </Text>
              
              <VStack align="start" spacing={2} pl={4}>
                <Text fontSize="sm">• Test CSP in report-only mode before enforcing</Text>
                <Text fontSize="sm">• Monitor CSP violation reports for legitimate usage</Text>
                <Text fontSize="sm">• Enable COEP only if cross-origin isolation is needed</Text>
                <Text fontSize="sm">• Regularly review and update security headers</Text>
                <Text fontSize="sm">• Use HTTPS in production with proper SSL configuration</Text>
                <Text fontSize="sm">• Implement proper authentication and authorization</Text>
                <Text fontSize="sm">• Keep dependencies updated for security patches</Text>
              </VStack>

              <Alert status="info" mt={4}>
                <AlertIcon />
                <Text fontSize="sm">
                  Security configurations should be tested in a staging environment before applying to production.
                  Some changes may affect how third-party resources load on your site.
                </Text>
              </Alert>
            </VStack>
          </SectionCard>
        </VStack>
      )}
    </Box>
  );
}