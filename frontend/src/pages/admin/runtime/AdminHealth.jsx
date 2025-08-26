// frontend/src/pages/admin/runtime/AdminHealth.jsx
/**
 * Admin Health tab for displaying health and readiness endpoint information
 */

import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Button,
  Text,
  Badge,
  useToast
} from '@chakra-ui/react';
import { FaSync, FaHeartbeat } from 'react-icons/fa';
import SectionCard from '../../../components/shared/SectionCard.jsx';
import KeyValueGrid from '../../../components/shared/KeyValueGrid.jsx';
import { client } from '../../../api/client.js';

export default function AdminHealth() {
  const [healthData, setHealthData] = useState(null);
  const [readinessData, setReadinessData] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    setLoading(true);
    
    try {
      const [healthRes, readinessRes] = await Promise.all([
        client.get('/health'),
        client.get('/readiness')
      ]);
      
      setHealthData(healthRes.data);
      setReadinessData(readinessRes.data);
    } catch (err) {
      toast({
        title: 'Failed to load health data',
        description: err.message,
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const healthItems = healthData ? [
    { key: 'Status', value: healthData.status, type: 'badge' },
    { key: 'Uptime', value: `${Math.floor(healthData.uptime || 0)}s`, type: 'code' },
    { key: 'Environment', value: healthData.environment, type: 'code' },
    { key: 'Version', value: healthData.version, type: 'code' },
    { key: 'Commit', value: healthData.commit?.slice(0, 8), type: 'code', copyable: true },
    { key: 'Rate Limit Algorithm', value: healthData.runtime?.rateLimitAlgorithm, type: 'badge' },
    { key: 'Metrics Enabled', value: healthData.runtime?.metricsEnabled, type: 'boolean' },
    { key: 'Redis Connected', value: healthData.redis?.connected, type: 'boolean' }
  ] : [];

  const readinessItems = readinessData ? [
    { key: 'Ready', value: readinessData.ready, type: 'boolean' },
    { key: 'Redis Required', value: readinessData.requirements?.redisRequired, type: 'boolean' },
    { key: 'Runtime Rate Limit', value: readinessData.runtime?.rateLimitAlgorithm, type: 'badge' },
    { key: 'Runtime Metrics', value: readinessData.runtime?.metricsEnabled, type: 'boolean' }
  ] : [];

  return (
    <VStack spacing={6} align="stretch">
      <SectionCard
        title="Health & Readiness"
        subtitle="System health and dependency status"
        headerActions={
          <Button
            size="sm"
            leftIcon={<FaSync />}
            onClick={loadHealthData}
            isLoading={loading}
            variant="outline"
          >
            Refresh
          </Button>
        }
      >
        <VStack spacing={6} align="stretch">
          <SectionCard title="Health Endpoint" subtitle="/health">
            <KeyValueGrid items={healthItems} columns={1} />
          </SectionCard>
          
          <SectionCard title="Readiness Endpoint" subtitle="/readiness">
            <KeyValueGrid items={readinessItems} columns={1} />
          </SectionCard>
        </VStack>
      </SectionCard>
    </VStack>
  );
}