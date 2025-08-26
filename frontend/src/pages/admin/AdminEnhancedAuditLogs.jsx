// frontend/src/pages/admin/AdminEnhancedAuditLogs.jsx
// Admin page for enhanced audit logs with dynamic features

import React from 'react';
import { VStack, Alert, AlertIcon, Text } from '@chakra-ui/react';

import SectionCard from '../../components/admin/common/SectionCard.jsx';
import AuditLogPanel from '../../components/admin/Audit/AuditLogPanel.jsx';

const AdminEnhancedAuditLogs = () => {
  return (
    <VStack spacing={6} align="stretch">
      <SectionCard title="Enhanced Audit Logs">
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" fontWeight="medium">
              Dynamic Audit Log Monitoring
            </Text>
            <Text fontSize="xs">
              Real-time audit log viewing with advanced filtering, search, and tail mode. 
              Shows logs from both database and in-memory ring buffer for comprehensive monitoring.
            </Text>
          </VStack>
        </Alert>

        <AuditLogPanel />
      </SectionCard>
    </VStack>
  );
};

export default AdminEnhancedAuditLogs;