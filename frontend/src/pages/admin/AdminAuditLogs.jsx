// frontend/src/pages/admin/AdminAuditLogs.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Heading, VStack, HStack, Input, Button, Spinner, Alert, AlertIcon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Badge, Code, Text, Tooltip,
  useToast
} from "@chakra-ui/react";
import { FaSync } from "react-icons/fa";
import { client } from "../../api/client";

const ActionBadge = ({ action }) => {
  const map = {
    LOGIN: "green",
    LOGOUT: "gray",
    USER_UPDATE: "blue",
    USER_DELETE: "red",
    ORDER_DELETE: "red",
    ORDER_STATUS_UPDATE: "purple",
    DESIGN_DELETE: "orange",
    SESSION_REVOKE: "yellow",
    SESSION_REVOKE_ALL: "yellow",
  };
  const scheme = map[action] || "teal";
  return <Badge colorScheme={scheme}>{action}</Badge>;
};

export default function AuditLogsPanel({ token }) {
  const toast = useToast();
  const [filters, setFilters] = useState({ actor: "", action: "", targetType: "", targetId: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  const queryParams = useMemo(() => {
    const out = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v && String(v).trim().length) out[k] = v.trim();
    });
    return out;
  }, [filters]);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await client.get("/admin/audit", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        params: { ...queryParams, page: 1, limit: 100 },
      });
      setRows(data.items || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load audit logs");
      toast({ status: "error", title: "Audit error", description: err });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* initial */ /* eslint-disable-next-line */ }, []);

  return (
    <Box p={{ base: 2, md: 4 }} layerStyle="cardBlue" w="100%">
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="md">Admin Audit Logs</Heading>
        <HStack>
          <Input placeholder="Actor (User ID)" value={filters.actor} onChange={e=>setFilters(f=>({...f, actor:e.target.value}))} size="sm" w="220px"/>
          <Input placeholder="Action (e.g. LOGIN)" value={filters.action} onChange={e=>setFilters(f=>({...f, action:e.target.value}))} size="sm" w="200px"/>
          <Input placeholder="Target Type" value={filters.targetType} onChange={e=>setFilters(f=>({...f, targetType:e.target.value}))} size="sm" w="180px"/>
          <Input placeholder="Target ID" value={filters.targetId} onChange={e=>setFilters(f=>({...f, targetId:e.target.value}))} size="sm" w="220px"/>
          <Button leftIcon={<FaSync/>} size="sm" onClick={load} isLoading={loading}>Apply</Button>
        </HStack>
      </HStack>

      {loading ? (
        <VStack p={10}><Spinner/></VStack>
      ) : err ? (
        <Alert status="error"><AlertIcon/>{err}</Alert>
      ) : (
        <TableContainer w="100%">
          <Table size="sm" variant="simple" w="100%">
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
              {rows.map((i) => (
                <Tr key={i._id}>
                  <Td><Text fontSize="sm">{new Date(i.when).toLocaleString()}</Text></Td>
                  <Td>
                    {i.actor ? (
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold">{i.actor.label}</Text>
                        <Text fontSize="xs" color="gray.500">{i.actor.email}</Text>
                      </VStack>
                    ) : <Text color="gray.400">System</Text>}
                  </Td>
                  <Td><ActionBadge action={i.action} /></Td>
                  <Td>
                    {i.target ? (
                      <VStack align="start" spacing={0}>
                        <Code fontSize="xs">{i.target.type || "-"}</Code>
                        <Text fontSize="xs" color="gray.500">{i.target.id || "-"}</Text>
                      </VStack>
                    ) : <Text color="gray.400">—</Text>}
                  </Td>
                  <Td>{i.ip || "-"}</Td>
                  <Td>
                    <Tooltip label={i.userAgent || ""}>
                      <Text maxW="300px" noOfLines={1}>{i.userAgent || "-"}</Text>
                    </Tooltip>
                  </Td>
                  <Td>
                    <Tooltip label={<pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(i.meta || {}, null, 2)}</pre>} hasArrow placement="left">
                      <Code fontSize="xs">{JSON.stringify(i.meta || {})?.slice(0, 60)}{JSON.stringify(i.meta || {}).length > 60 ? "…" : ""}</Code>
                    </Tooltip>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
