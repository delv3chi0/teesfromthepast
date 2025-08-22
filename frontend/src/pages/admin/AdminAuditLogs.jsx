// frontend/src/pages/admin/AdminAuditLogs.jsx
import { useEffect, useState, useCallback } from "react";
import { client } from "../../api/client";
import {
  Box, Heading, HStack, Input, Button, Table, Thead, Tbody, Tr, Th, Td,
  Text, Code, useToast, Tooltip, IconButton, VStack, Badge,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Select, Stack, Divider
} from "@chakra-ui/react";
import { FaSync, FaInfoCircle, FaBroom } from "react-icons/fa";
import { useAuth } from "../../context/AuthProvider";

export default function AdminAuditLogs() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ actor: "", action: "", targetType: "", targetId: "" });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  // Details modal
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Clear controls
  const [clearMode, setClearMode] = useState("none");
  const [clearBefore, setClearBefore] = useState("");

  const toast = useToast();

  const load = useCallback(async (p = 1) => {
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
  }, [filters, token, toast]);

  useEffect(() => { load(1); }, []); // eslint-disable-line

  const openDetails = async (id) => {
    try {
      const res = await client.get(`/admin/audit/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setDetail(res.data);
      setDetailOpen(true);
    } catch {
      toast({ title: "Failed to load details", status: "error" });
    }
  };

  const doClear = async () => {
    try {
      if (clearMode === "none") return;
      if (clearMode === "all") {
        await client.delete("/admin/audit", {
          headers: { Authorization: `Bearer ${token}` },
          data: { everything: true },
        });
      } else if (clearMode === "before") {
        if (!clearBefore) {
          toast({ title: "Pick a cutoff date/time first", status: "warning" });
          return;
        }
        await client.delete("/admin/audit", {
          headers: { Authorization: `Bearer ${token}` },
          data: { before: clearBefore },
        });
      }
      toast({ title: "Audit logs cleared", status: "success" });
      setClearMode("none");
      setClearBefore("");
      load(1);
    } catch {
      toast({ title: "Failed to clear logs", status: "error" });
    }
  };

  return (
    <Box>
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="lg" color="brand.textLight">Admin Audit Logs</Heading>
        <HStack>
          <Input placeholder="Actor (User ID)" value={filters.actor} onChange={(e)=>setFilters(f=>({...f, actor:e.target.value}))} size="sm" w="220px" />
          <Input placeholder="Action (e.g. LOGIN)" value={filters.action} onChange={(e)=>setFilters(f=>({...f, action:e.target.value}))} size="sm" w="220px"/>
          <Input placeholder="Target Type" value={filters.targetType} onChange={(e)=>setFilters(f=>({...f, targetType:e.target.value}))} size="sm" w="180px"/>
          <Input placeholder="Target ID" value={filters.targetId} onChange={(e)=>setFilters(f=>({...f, targetId:e.target.value}))} size="sm" w="220px"/>
          <Button leftIcon={<FaSync/>} size="sm" onClick={()=>load(1)} isLoading={loading} colorScheme="brandAccentOrange">Apply</Button>
        </HStack>
      </HStack>

      <HStack mb={4} spacing={3} flexWrap="wrap">
        <Select size="sm" value={clearMode} onChange={(e)=>setClearMode(e.target.value)} w="220px">
          <option value="none">Clear: (choose…)</option>
          <option value="before">Clear before date/time…</option>
          <option value="all">Clear ALL logs</option>
        </Select>
        {clearMode === "before" && (
          <Input size="sm" type="datetime-local" value={clearBefore} onChange={(e)=>setClearBefore(e.target.value)} w="260px" />
        )}
        {clearMode !== "none" && (
          <Button size="sm" colorScheme="red" leftIcon={<FaBroom/>} onClick={doClear}>Confirm Clear</Button>
        )}
      </HStack>

      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>When</Th>
            <Th>Actor</Th>
            <Th>Action</Th>
            <Th>Target</Th>
            <Th>IP</Th>
            <Th>UA</Th>
            <Th>Meta</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {items.map(i => (
            <Tr key={i._id}>
              <Td><Text fontSize="sm">{new Date(i.createdAt).toLocaleString()}</Text></Td>
              <Td>
                <Text fontWeight="bold" color="brand.textLight">{i.actor?.username || i.actorDisplay || "(unknown)"}</Text>
                <Text fontSize="xs" color="brand.textMuted">{i.actor?.email}</Text>
              </Td>
              <Td><Badge colorScheme="purple">{i.actionLabel || i.action}</Badge></Td>
              <Td>
                <Text color="brand.textLight">{i.targetType || "-"}</Text>
                <Text fontSize="xs" color="brand.textMuted">{i.targetId || ""}</Text>
              </Td>
              <Td>{i.ip || "-"}</Td>
              <Td><Text maxW="300px" noOfLines={1} title={i.userAgent}>{i.userAgent || "-"}</Text></Td>
              <Td>
                <Box maxW="360px" p={2} bg="blackAlpha.500" borderRadius="md" overflow="hidden">
                  <Text fontSize="xs" as="pre" whiteSpace="pre-wrap">{JSON.stringify(i.meta || {}, null, 2)}</Text>
                </Box>
              </Td>
              <Td isNumeric>
                <Tooltip label="Session / Request Details">
                  <IconButton aria-label="Details" size="sm" icon={<FaInfoCircle/>} onClick={() => openDetails(i._id)} />
                </Tooltip>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <HStack mt={3} justify="flex-end" spacing={3}>
        <Button size="sm" onClick={()=>{ if (page>1) load(page-1); }} isDisabled={page<=1}>Prev</Button>
        <Text fontSize="sm">Page {page}</Text>
        <Button size="sm" onClick={()=>{ if (hasMore) load(page+1); }} isDisabled={!hasMore}>Next</Button>
      </HStack>

      {/* Details Modal */}
      <Modal isOpen={detailOpen} onClose={()=>setDetailOpen(false)} size="4xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent bg="brand.secondary">
          <ModalHeader color="brand.textLight">
            Session / Audit Details <Badge ml={2}>{detail?.action}</Badge>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {detail ? (
              <Stack spacing={5}>
                <Box>
                  <Heading size="sm" mb={2}>Who / When</Heading>
                  <Text><strong>Actor:</strong> {detail.actor?.username || detail.actor?.email || detail.actorDisplay || "(unknown)"} {detail.actor?._id ? `(${detail.actor._id})` : ""}</Text>
                  <Text><strong>Action:</strong> {detail.action}</Text>
                  <Text><strong>Time:</strong> {new Date(detail.createdAt).toLocaleString()}</Text>
                  <Text><strong>Target:</strong> {detail.targetType || "-"} {detail.targetId ? `(${detail.targetId})` : ""}</Text>
                </Box>

                <Divider/>

                <Box>
                  <Heading size="sm" mb={2}>Request</Heading>
                  <Text><strong>Method:</strong> {detail.method || "-"}</Text>
                  <Text><strong>URL:</strong> {detail.url || "-"}</Text>
                  <Text><strong>Origin:</strong> {detail.origin || "-"}</Text>
                  <Text><strong>Referrer:</strong> {detail.referrer || "-"}</Text>
                </Box>

                <Divider/>

                <Box>
                  <Heading size="sm" mb={2}>Network / Client</Heading>
                  <Text><strong>IP:</strong> {detail.ip || "-"}</Text>
                  <Text><strong>User Agent:</strong> {detail.userAgent || "-"}</Text>
                  <Text><strong>Session JTI:</strong> {detail.sessionJti || "-"}</Text>
                </Box>

                <Divider/>

                <Box>
                  <Heading size="sm" mb={2}>Client Blob</Heading>
                  <Box p={3} bg="blackAlpha.500" borderRadius="md">
                    <Text as="pre" fontSize="sm" whiteSpace="pre-wrap">{JSON.stringify(detail.client || {}, null, 2)}</Text>
                  </Box>
                </Box>

                <Box>
                  <Heading size="sm" mb={2}>Meta</Heading>
                  <Box p={3} bg="blackAlpha.500" borderRadius="md">
                    <Text as="pre" fontSize="sm" whiteSpace="pre-wrap">{JSON.stringify(detail.meta || {}, null, 2)}</Text>
                  </Box>
                </Box>
              </Stack>
            ) : (
              <VStack minH="200px" justify="center"><Text>Loading…</Text></VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={()=>setDetailOpen(false)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
