import { useEffect, useState } from 'react';
import { client } from '../api/client';
import {
  Box, Heading, Text, Table, Thead, Tr, Th, Tbody, Td,
  Button, HStack, Input, useToast, IconButton, Tooltip, Badge
} from '@chakra-ui/react';
import { FaSync, FaTrashAlt, FaUserSlash } from 'react-icons/fa';

export default function AdminDevices() {
  const [items, setItems] = useState([]);
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await client.get(`/admin/sessions`, { params: { page: p, userId: userId || undefined, limit: 50 } });
      setItems(res.data.items || []);
      setPage(res.data.page || p);
      setHasMore(!!res.data.hasMore);
    } catch (e) {
      toast({ title: 'Failed to load sessions', status: 'error' });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(1); /* eslint-disable-next-line */ }, []);

  const revokeOne = async (jti) => {
    try {
      await client.delete(`/admin/sessions/${jti}`);
      toast({ title: 'Session revoked', status: 'success' });
      load(page);
    } catch { toast({ title: 'Failed to revoke', status: 'error' }); }
  };
  const revokeAllForUser = async (uid) => {
    try {
      await client.delete(`/admin/sessions/user/${uid}`);
      toast({ title: 'All sessions revoked for user', status: 'success' });
      load(page);
    } catch { toast({ title: 'Failed to revoke', status: 'error' }); }
  };

  return (
    <Box>
      <HStack justify="space-between" mb={4} flexWrap="wrap">
        <Heading size="lg">Devices / Active Sessions</Heading>
        <HStack>
          <Input placeholder="Filter by User ID" value={userId} onChange={e=>setUserId(e.target.value)} size="sm" w="260px"/>
          <Button leftIcon={<FaSync/>} onClick={()=>load(1)} isLoading={loading} size="sm">Refresh</Button>
        </HStack>
      </HStack>

      <Table size="sm" variant="striped">
        <Thead>
          <Tr>
            <Th>User</Th>
            <Th>JTI</Th>
            <Th>IP</Th>
            <Th>User Agent</Th>
            <Th>Created</Th>
            <Th>Expires</Th>
            <Th>Status</Th>
            <Th isNumeric>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {items.map((i)=>(
            <Tr key={i.jti}>
              <Td>
                <Text fontWeight="bold">{i.user?.username || '(unknown)'}</Text>
                <Text fontSize="xs" color="gray.500">{i.user?.email}</Text>
                <Tooltip label="Revoke ALL for this user">
                  <IconButton ml={2} size="xs" icon={<FaUserSlash/>} onClick={()=>revokeAllForUser(i.user?._id)} aria-label="Revoke all"/>
                </Tooltip>
              </Td>
              <Td><Text fontSize="xs" noOfLines={1} title={i.jti}>{i.jti}</Text></Td>
              <Td>{i.ip || '-'}</Td>
              <Td><Text maxW="360px" noOfLines={1} title={i.userAgent}>{i.userAgent || '-'}</Text></Td>
              <Td>{new Date(i.createdAt).toLocaleString()}</Td>
              <Td>{new Date(i.expiresAt).toLocaleString()}</Td>
              <Td>
                {i.revokedAt
                  ? <Badge colorScheme="red">Revoked</Badge>
                  : (new Date(i.expiresAt) < new Date() ? <Badge>Expired</Badge> : <Badge colorScheme="green">Active</Badge>)
                }
              </Td>
              <Td isNumeric>
                <Tooltip label="Revoke this session">
                  <IconButton size="sm" icon={<FaTrashAlt/>} onClick={()=>revokeOne(i.jti)} aria-label="Revoke"/>
                </Tooltip>
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
