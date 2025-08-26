// frontend/src/pages/admin/AdminConfig.jsx
// Admin page for viewing complete runtime configuration

import React, { useState, useEffect } from 'react';
import { 
  VStack, 
  HStack,
  Text, 
  Button,
  Alert,
  AlertIcon,
  Divider
} from '@chakra-ui/react';
import { FaSync, FaCog } from 'react-icons/fa';

import SectionCard from '../../components/admin/common/SectionCard.jsx';
import JSONPreview from '../../components/admin/common/JSONPreview.jsx';
import KeyValueGrid from '../../components/admin/common/KeyValueGrid.jsx';
import { fetchRuntimeConfig } from '../../api/adminRuntime.js';

const AdminConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchConfig = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await fetchRuntimeConfig();
      setConfig(data);
    } catch (err) {
      setError(err.fallback ? 
        'Runtime configuration not available. Dynamic console features require backend support.' : 
        err.error || 'Failed to fetch configuration'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const configSummary = config ? [
    { 
      label: 'Rate Limiting Algorithm', 
      value: config.rateLimit.algorithm,
      badge: { colorScheme: 'blue' }
    },
    { 
      label: 'Global Rate Limit', 
      value: `${config.rateLimit.globalMax} requests / ${config.rateLimit.windowMs}ms` 
    },
    { 
      label: 'Path Overrides', 
      value: config.rateLimit.overrides?.length || 0 
    },
    { 
      label: 'Role Overrides', 
      value: config.rateLimit.roleOverrides?.length || 0 
    },
    { 
      label: 'CSP Report Only', 
      value: config.security.cspReportOnly ? 'Enabled' : 'Disabled',
      badge: { 
        colorScheme: config.security.cspReportOnly ? 'green' : 'orange' 
      }
    },
    { 
      label: 'COEP Enabled', 
      value: config.security.enableCOEP ? 'Yes' : 'No',
      badge: { 
        colorScheme: config.security.enableCOEP ? 'green' : 'gray' 
      }
    },
    { 
      label: 'Request ID Header', 
      value: config.tracing.requestIdHeader,
      mono: true
    },
    { 
      label: 'Recent Requests Tracked', 
      value: config.tracing.recentRequestIds?.length || 0 
    },
    { 
      label: 'Metrics Enabled', 
      value: config.metrics.enabled ? 'Yes' : 'No',
      badge: { 
        colorScheme: config.metrics.enabled ? 'green' : 'gray' 
      }
    },
    { 
      label: 'Audit Log Ring Size', 
      value: config.audit.ringSize 
    },
    { 
      label: 'Audit Logs in Memory', 
      value: config.audit.logs?.length || 0 
    },
    { 
      label: 'Version', 
      value: config.versions.version || 'Unknown'
    },
    { 
      label: 'Commit', 
      value: config.versions.commit || 'Unknown',
      mono: true
    },
    { 
      label: 'Build Time', 
      value: config.versions.buildTime ? new Date(config.versions.buildTime).toLocaleString() : 'Unknown'
    }
  ] : [];

  const currentTimestamp = new Date().toISOString();
  const filename = `runtime-config-${currentTimestamp.replace(/[:.]/g, '-')}.json`;

  return (
    <VStack spacing={6} align="stretch">
      <SectionCard title="Runtime Configuration">
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" fontWeight="medium">
              Ephemeral Configuration Snapshot
            </Text>
            <Text fontSize="xs">
              This shows the current in-memory runtime configuration. All dynamic settings 
              are ephemeral and will be lost when the server restarts. Use this for debugging 
              and monitoring current operational state.
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
            Refresh Configuration
          </Button>
        </HStack>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {config && (
          <>
            <Divider />
            
            <Text fontSize="md" fontWeight="semibold">Configuration Summary</Text>
            <KeyValueGrid data={configSummary} columns={2} />
            
            <Divider />
            
            <Text fontSize="md" fontWeight="semibold">Complete Configuration (JSON)</Text>
            <JSONPreview 
              data={config} 
              filename={filename}
              maxHeight="600px"
            />

            <Alert status="info" size="sm">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontSize="xs" fontWeight="medium">
                  Configuration Notes
                </Text>
                <Text fontSize="xs">
                  • Rate limiting settings apply immediately to new requests
                  • Security settings affect browser behavior for all users
                  • Tracing data shows recent request activity
                  • Audit logs are kept in a ring buffer (newest first)
                  • Version information reflects the current deployment
                </Text>
              </VStack>
            </Alert>
          </>
        )}

        {!config && !loading && !error && (
          <Alert status="info">
            <AlertIcon />
            Click refresh to fetch the current runtime configuration.
          </Alert>
        )}
      </SectionCard>
    </VStack>
  );
};

export default AdminConfig;