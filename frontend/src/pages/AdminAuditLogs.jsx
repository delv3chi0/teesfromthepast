import { useEffect, useState } from 'react';
import { client } from '../api/client';
import {
  Box, Heading, HStack, Input, Select, Button, Table, Thead, Tbody, Tr, Th, Td,
  Text, Code, useToast, IconButton, Tooltip
} from '@chakra-ui/react';
import { FaSync } from 'react-icons/fa';

export default function AdminAuditLogs() {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ actor:'', action:'', targetType:'', targetId:'' });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
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
          </Tr>
        </Thead>
        <Tbody>
          {items.map(i=>(
            <Tr key={i._id}>
              <Td><Text fontSize="sm">{new Date(i.createdAt).toLocaleString()}</Text></Td>
              <Td>
                <Text fontWeight="bold">{i.actor?.username || '(unknown)'}</Text>
                <Text fontSize="xs" color="gray.500">{i.actor?.email}</Text>
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
            </Tr>
          ))}
        </Tbody>
      </Table>

      <HStack mt={3} justify="flex-end">
        <Button size="sm" onClick={()=>{ if (page>1) load(page-1); }} isDisabled={page<=1}>Prev</Button>
        <Text fontSize="sm">Page {page}</Text>
        <Button size="sm" onClick={()=>{ if (hasMore) load(page+1); }} isDisabled={!hasMore}>Next</Button>
      </HStack>
    </Box>
  );
}
