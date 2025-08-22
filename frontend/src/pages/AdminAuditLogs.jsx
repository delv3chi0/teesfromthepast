import { useEffect, useState } from 'react';
import { client } from '../api/client';
import {
  Box, Heading, HStack, Input, Button, Table, Thead, Tbody, Tr, Th, Td,
  Text, Code, useToast, IconButton, Tooltip, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalCloseButton, ModalBody, ModalFooter, useDisclosure, VStack, Divider
} from '@chakra-ui/react';
import { FaSync, FaInfoCircle } from 'react-icons/fa';

export default function AdminAuditLogs() {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ actor:'', action:'', targetType:'', targetId:'' });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const toast = useToast();
  const details = useDisclosure();

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await client.get('/admin/audit', { params: { ...filters, page: p, limit: 50 } });
      setItems(res.data.items || []);
      setPage(res.data.page || p);
      // compute hasMore from total if provided; otherwise fall back to length check
      const total = typeof res.data.total === 'number' ? res.data.total : undefined;
      const lim = typeof res.data.limit === 'number' ? res.data.limit : 50;
      const computedHasMore = total != null ? p * lim < total : (res.data.items || []).length === lim;
      setHasMore(!!res.data.hasMore || computedHasMore);
    } catch (e) {
      toast({ title: 'Failed to load audit logs', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetails = (row) => {
    setSelected(row);
    details.onOpen();
  };

  return (
    <Box>
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="lg">Admin Audit Logs</Heading>
        <HStack>
          <Input placeholder="Actor (User ID)" value={filters.actor} onChange={e=>setFilters(f=>({...f, actor:e.target.value}))} size="sm" w="220px"/>
          <Input placeholder="Action (e.g. LOGIN)" value={filters.action} onChange={e=>setFilters(f=>({...f, action:e.target.value}))} size="sm" w="220px"/>
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
            <Th>Network</Th>
            <Th>Summary</Th>
            <Th isNumeric>Details</Th>
          </Tr>
        </Thead>
        <Tbody>
          {items.map(i=>(
            <Tr key={i._id}>
              <Td>
                <Text fontSize="sm">{new Date(i.createdAt).toLocaleString()}</Text>
              </Td>

              <Td>
                <Text fontWeight="bold">{i.actor?.username || i.actorDisplay || '(unknown)'}</Text>
                <Text fontSize="xs" color="gray.500">{i.actor?.email || ''}</Text>
              </Td>

              <Td>
                <Code>{i.action}</Code>
              </Td>

              <Td>
                <Text>{i.targetType || '-'}</Text>
                <Text fontSize="xs" color="gray.500">{i.targetId || ''}</Text>
              </Td>

              <Td>
                <Text fontSize="sm">{i.ip || '-'}</Text>
                <Text fontSize="xs" color="gray.500" noOfLines={1} title={i.userAgent}>{i.userAgent || '-'}</Text>
              </Td>

              <Td>
                <Text fontSize="xs" noOfLines={2}>
                  {i.actionLabel || i.message || (i.meta && (i.meta.summary || '')) || '—'}
                </Text>
              </Td>

              <Td isNumeric>
                <Tooltip label="Session Details">
                  <IconButton
                    size="sm"
                    aria-label="Session Details"
                    icon={<FaInfoCircle />}
                    onClick={() => openDetails(i)}
                  />
                </Tooltip>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <HStack mt={3} justify="flex-end" gap={3}>
        <Button
          size="sm"
          onClick={() => { if (page > 1) load(page - 1); }}
          isDisabled={page <= 1}
          variant="outline"
        >
          Prev
        </Button>
        <Text fontSize="sm">Page {page}</Text>
        <Button
          size="sm"
          onClick={() => { if (hasMore) load(page + 1); }}
          isDisabled={!hasMore}
          variant="outline"
        >
          Next
        </Button>
      </HStack>

      {/* Details Modal */}
      <Modal isOpen={details.isOpen} onClose={details.onClose} size="xl" scrollBehavior="inside" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Session Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selected ? (
              <VStack align="stretch" spacing={3}>
                <Box>
                  <Heading size="sm" mb={1}>Actor</Heading>
                  <Text><strong>Username:</strong> {selected.actor?.username || selected.actorDisplay || '(unknown)'}</Text>
                  {selected.actor?.email && <Text><strong>Email:</strong> {selected.actor.email}</Text>}
                  {selected.actor?._id && <Text><strong>User ID:</strong> {selected.actor._id}</Text>}
                </Box>

                <Divider />

                <Box>
                  <Heading size="sm" mb={1}>Event</Heading>
                  <Text><strong>Action:</strong> {selected.action}</Text>
                  <Text><strong>When:</strong> {new Date(selected.createdAt).toLocaleString()}</Text>
                  <Text><strong>Target:</strong> {selected.targetType || '—'} {selected.targetId ? `(${selected.targetId})` : ''}</Text>
                </Box>

                <Divider />

                <Box>
                  <Heading size="sm" mb={1}>Network</Heading>
                  <Text><strong>IP:</strong> {selected.ip || '—'}</Text>
                  <Text><strong>User-Agent:</strong> {selected.userAgent || '—'}</Text>
                </Box>

                <Divider />

                <Box>
                  <Heading size="sm" mb={1}>Meta</Heading>
                  <Text as="pre" whiteSpace="pre-wrap" fontSize="sm">
                    {JSON.stringify(selected.meta || {}, null, 2)}
                  </Text>
                </Box>
              </VStack>
            ) : (
              <Text>No item selected.</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={details.onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
