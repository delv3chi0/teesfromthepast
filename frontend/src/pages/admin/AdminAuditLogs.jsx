// frontend/src/pages/admin/AdminAuditLogs.jsx
import { useEffect, useState } from "react";
import { client } from "../../api/client";
import {
  Box, Heading, HStack, Input, Button, Table, Thead, Tbody, Tr, Th, Td,
  Text, Code, useToast, IconButton, Tooltip, TableContainer, Tag,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  VStack, Badge
} from "@chakra-ui/react";
import { FaSync, FaInfoCircle } from "react-icons/fa";

export default function AdminAuditLogs({ token }) {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ actor: "", action: "", targetType: "", targetId: "" });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const toast = useToast();

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await client.get("/admin/audit", {
        headers: { Authorization: `Bearer ${token}` },
        params: { ...filters, page: p, limit: 50 },
      });
      setItems(res.data.items || []);
      setPage(res.data.page || p);
      setHasMore(!!res.data.hasMore);
    } catch (e) {
      toast({ title: "Failed to load audit logs", status: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); /* on mount */ // eslint-disable-next-line
  }, []);

  return (
    <Box layerStyle="cardBlue" w="100%" p={{ base: 2, md: 4 }}>
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="md">Admin Audit Logs</Heading>
        <HStack>
          <Input placeholder="Actor (User ID)" value={filters.actor} onChange={(e)=>setFilters(f=>({...f, actor:e.target.value}))} size="sm" w="220px"/>
          <Input placeholder="Action (e.g. LOGIN)" value={filters.action} onChange={(e)=>setFilters(f=>({...f, action:e.target.value}))} size="sm" w="200px"/>
          <Input placeholder="Target Type" value={filters.targetType} onChange={(e)=>setFilters(f=>({...f, targetType:e.target.value}))} size="sm" w="160px"/>
          <Input placeholder="Target ID" value={filters.targetId} onChange={(e)=>setFilters(f=>({...f, targetId:e.target.value}))} size="sm" w="200px"/>
          <Button leftIcon={<FaSync/>} size="sm" onClick={()=>load(1)} isLoading={loading}>Apply</Button>
        </HStack>
      </HStack>

      <TableContainer w="100%">
        <Table size="sm" variant="simple" w="100%">
          <Thead>
            <Tr>
              <Th>When</Th>
              <Th>Actor</Th>
              <Th>Action</Th>
              <Th>Session ID</Th>
              <Th>Network</Th>
              <Th isNumeric>Details</Th>
            </Tr>
          </Thead>
          <Tbody>
            {items.map((i) => {
              // session id propagated in meta.sessionJti on LOGIN/REGISTER
              const sessionId = i?.meta?.sessionJti || "-";
              return (
                <Tr key={i._id}>
                  <Td><Text fontSize="sm">{new Date(i.createdAt).toLocaleString()}</Text></Td>
                  <Td>
                    <Text fontWeight="bold">{i.actor?.username || "(unknown)"}</Text>
                    <Text fontSize="xs" color="gray.500">{i.actor?.email}</Text>
                  </Td>
                  <Td>
                    <Badge colorScheme={i.action === "LOGIN" ? "green" : i.action === "LOGOUT" ? "orange" : "blue"}>
                      {i.action}
                    </Badge>
                  </Td>
                  <Td>
                    {sessionId !== "-" ? (
                      <Code fontSize="xs" title={sessionId}>{sessionId.slice(0, 8)}…</Code>
                    ) : <Text>—</Text>}
                  </Td>
                  <Td>
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm">{i.ip || "-"}</Text>
                      <Text fontSize="xs" color="gray.500" noOfLines={1} title={i.userAgent}>{i.userAgent || "-"}</Text>
                    </VStack>
                  </Td>
                  <Td isNumeric>
                    <Tooltip label="View details">
                      <IconButton
                        aria-label="Details"
                        size="sm"
                        icon={<FaInfoCircle />}
                        onClick={() => setDetail(i)}
                      />
                    </Tooltip>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>

      <HStack mt={3} justify="flex-end">
        <Button size="sm" onClick={() => { if (page > 1) load(page - 1); }} isDisabled={page <= 1}>Prev</Button>
        <Text fontSize="sm">Page {page}</Text>
        <Button size="sm" onClick={() => { if (hasMore) load(page + 1); }} isDisabled={!hasMore}>Next</Button>
      </HStack>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Session / Audit Details
            {detail?.action && (
              <Tag ml={3} colorScheme={detail.action === "LOGIN" ? "green" : detail.action === "LOGOUT" ? "orange" : "blue"}>
                {detail.action}
              </Tag>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {detail && (
              <VStack align="start" spacing={2} fontSize="sm">
                <Text><b>ID:</b> {detail._id}</Text>
                <Text><b>When:</b> {new Date(detail.createdAt).toLocaleString()}</Text>
                <Text><b>Actor:</b> {detail.actor?.username || "(unknown)"} {detail.actor?.email ? `(${detail.actor.email})` : ""}</Text>
                <Text><b>Target:</b> {detail.targetType || "—"} {detail.targetId ? ` • ${detail.targetId}` : ""}</Text>
                <Text><b>IP:</b> {detail.ip || "—"}</Text>
                <Text><b>User Agent:</b> {detail.userAgent || "—"}</Text>
                {detail?.meta?.sessionJti && <Text><b>Session ID:</b> {detail.meta.sessionJti}</Text>}
                {/* Show other meta keys nicely */}
                {detail?.meta && (
                  Object.entries(detail.meta)
                    .filter(([k]) => k !== "sessionJti")
                    .map(([k, v]) => (
                      <Text key={k}><b>{k}:</b> {typeof v === "object" ? JSON.stringify(v) : String(v)}</Text>
                    ))
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter><Button onClick={() => setDetail(null)}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
