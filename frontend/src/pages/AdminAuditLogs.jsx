// frontend/src/pages/AdminAuditLogs.jsx
import { useEffect, useState } from 'react';
import { client } from '../api/client';
import {
  Box, Heading, HStack, Input, Button, Table, Thead, Tbody, Tr, Th, Td,
  Text, Code, useToast, IconButton, Tooltip, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Badge
} from '@chakra-ui/react';
import { FaSync, FaInfoCircle } from 'react-icons/fa';

export default function AdminAuditLogs() {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ actor:'', action:'', targetType:'', targetId:'' });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const toast = useToast();

  const load = async (p=1) => {
    setLoading(true);
    try {
      const res = await client.get('/admin/audit', { params: { ...filters, page: p, limit: 50 } });
      setItems(res.data.items || []);
      setPage(res.data.page || p);
      setHasMore(!!res.data.hasMore);
    } catch {
      toast({ title: 'Failed to load audit logs', status:'error' });
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(1); // eslint-disable-next-line
  }, []);

  return (
    <Box>
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="lg">Admin Audit Logs</Heading>
        <HStack>
          <Input placeholder="Actor (User ID)" value={filters.actor} onChange={e=>setFilters(f=>({...f, actor:e.target.value}))} size="sm" w="220px"/>
          <Input placeholder="Action (e.g. USER_DELETE)" value={filters.action} onChange={e=>setFilters(f=>({...f, action:e.target.value}))} size="sm" w="220px"/>
          <Input placeholder="Target Type" value={filters.targetType} onChange={e=>setFilters(f=>({...f, targetType:e.target.value}))} size="sm" w="180px"/>
          <Input placeholder="Target ID" value={filters.targetId} onChange={e=>setFilters(f=>({...f, targetId:e.target.value}))} size="sm" w="220px"/>
          <Button leftIcon={<FaSync/>} size="sm" onClick={()=>load(1)} isLoading={loading}>Apply</Button>
        </HStack>
      </HStack>

      <Table size="sm" variant="striped">
        <Thead>
          <Tr>
            <Th>When</Th>
            <Th>Actor</Th>
            <Th>Action</Th>
            <Th>Target</Th>
            <Th>IP</Th>
            <Th>UA</Th>
            <Th>Meta</Th>
            <Th>Details</Th>
          </Tr>
        </Thead>
        <Tbody>
          {items.map(i=>(
            <Tr key={i._id}>
              <Td><Text fontSize="sm">{new Date(i.createdAt).toLocaleString()}</Text></Td>
              <Td>
                <Text fontWeight="bold">
                  {i.actor?.username || i.actorDisplay || i.meta?.actorDisplay || '(unknown)'}
                </Text>
                <Text fontSize="xs" color="gray.500">{i.actor?.email || ''}</Text>
              </Td>
              <Td><Code>{i.action}</Code></Td>
              <Td>
                <Text>{i.targetType || '-'}</Text>
                <Text fontSize="xs" color="gray.500">{i.targetId}</Text>
              </Td>
              <Td>{i.ip || '-'}</Td>
              <Td><Text maxW="300px" noOfLines={1} title={i.userAgent}>{i.userAgent || '-'}</Text></Td>
              <Td>
                <Text fontSize="xs" as="pre" whiteSpace="pre-wrap" maxW="380px">
                  {JSON.stringify(i.meta || {}, null, 2)}
                </Text>
              </Td>
              <Td>
                <Tooltip label="Session Details">
                  <IconButton size="xs" icon={<FaInfoCircle/>} onClick={() => setDetail(i)} aria-label="details"/>
                </Tooltip>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <HStack mt={3} justify="flex-end" gap={3}>
        <Button size="sm" onClick={()=>{ if (page>1) load(page-1); }} isDisabled={page<=1}>Prev</Button>
        <Text fontSize="sm">Page {page}</Text>
        <Button size="sm" onClick={()=>{ if (hasMore) load(page+1); }} isDisabled={!hasMore}>Next</Button>
      </HStack>

      <Modal isOpen={!!detail} onClose={()=>setDetail(null)} size="xl" scrollBehavior="inside">
        <ModalOverlay/>
        <ModalContent>
          <ModalHeader>
            Session / Audit Details
            {detail?.action && <Badge ml={2}>{detail.action}</Badge>}
          </ModalHeader>
          <ModalCloseButton/>
          <ModalBody>
            {detail && (
              <Box as="pre" whiteSpace="pre-wrap" fontSize="sm">
{JSON.stringify({
  _id: detail._id,
  when: detail.createdAt,
  actor: {
    id: detail.actor?._id || null,
    username: detail.actor?.username || detail.actorDisplay || detail.meta?.actorDisplay || "(unknown)",
    email: detail.actor?.email || null,
  },
  target: { type: detail.targetType, id: detail.targetId },
  ip: detail.ip,
  userAgent: detail.userAgent,
  meta: detail.meta || {},
}, null, 2)}
            </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={()=>setDetail(null)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
