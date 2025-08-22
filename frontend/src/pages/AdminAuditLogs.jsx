import { useEffect, useMemo, useState } from "react";
import { client } from "../api/client";
import {
  Box, Heading, HStack, Input, Button, Table, Thead, Tbody, Tr, Th, Td,
  Text, Code, useToast, IconButton, Tooltip, Spinner, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Divider,
  useDisclosure, Badge
} from "@chakra-ui/react";
import { FaSync, FaTrashAlt, FaInfoCircle, FaBroom } from "react-icons/fa";
import { useAuth } from "../context/AuthProvider";

export default function AdminAuditLogs() {
  const toast = useToast();
  const { token } = useAuth();

  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ actor: "", action: "", targetType: "", targetId: "" });
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [details, setDetails] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const hasPrev = page > 1;
  const hasNext = useMemo(() => page * limit < total, [page, limit, total]);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await client.get("/admin/audit", {
        params: { ...filters, page: p, limit },
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(res.data.items || []);
      setPage(res.data.page || p);
      setTotal(res.data.total || 0);
    } catch (e) {
      toast({ title: "Failed to load audit logs", status: "error" });
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (id) => {
    try {
      const res = await client.get(`/admin/audit/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDetails(res.data);
      onOpen();
    } catch {
      toast({ title: "Failed to load details", status: "error" });
    }
  };

  const clearLogs = async () => {
    if (!confirm("Clear audit logs with current filters? This cannot be undone.")) return;
    try {
      await client.delete("/admin/audit", {
        params: { ...filters },
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: "Audit logs cleared", status: "success" });
      load(1);
    } catch {
      toast({ title: "Failed to clear logs", status: "error" });
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box>
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="lg">Admin Audit Logs</Heading>
        <HStack>
          <Input
            placeholder="Actor (User ID)"
            value={filters.actor}
            onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value }))}
            size="sm"
            w="220px"
          />
          <Input
            placeholder="Action (e.g. LOGIN)"
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            size="sm"
            w="220px"
          />
          <Input
            placeholder="Target Type"
            value={filters.targetType}
            onChange={(e) => setFilters((f) => ({ ...f, targetType: e.target.value }))}
            size="sm"
            w="180px"
          />
          <Input
            placeholder="Target ID"
            value={filters.targetId}
            onChange={(e) => setFilters((f) => ({ ...f, targetId: e.target.value }))}
            size="sm"
            w="220px"
          />
          <Button leftIcon={<FaSync />} size="sm" onClick={() => load(1)} isLoading={loading}>
            Apply
          </Button>
          <Tooltip label="Clear logs (uses current filters)">
            <Button
              size="sm"
              colorScheme="red"
              leftIcon={<FaBroom />}
              onClick={clearLogs}
              isDisabled={loading}
            >
              Clear
            </Button>
          </Tooltip>
        </HStack>
      </HStack>

      {loading ? (
        <HStack justify="center" py={10}><Spinner size="lg" /></HStack>
      ) : (
        <>
          <Table size="sm" variant="striped">
            <Thead>
              <Tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Target</Th>
                <Th>IP</Th>
                <Th>UA</Th>
                <Th isNumeric>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {items.map((i) => (
                <Tr key={i._id}>
                  <Td>
                    <Text fontSize="sm">{new Date(i.createdAt).toLocaleString()}</Text>
                  </Td>
                  <Td>
                    <Text fontWeight="bold">
                      {i.actor?.username || i.actorDisplay || "(unknown)"}
                    </Text>
                    <Text fontSize="xs" color="gray.500">{i.actor?.email}</Text>
                  </Td>
                  <Td>
                    <HStack>
                      <Code>{i.action}</Code>
                      {i.targetType ? <Badge>{i.targetType}</Badge> : null}
                    </HStack>
                  </Td>
                  <Td>
                    <Text noOfLines={1} maxW="220px" title={i.targetId}>
                      {i.targetId || "-"}
                    </Text>
                  </Td>
                  <Td>{i.ip || "-"}</Td>
                  <Td>
                    <Text maxW="300px" noOfLines={1} title={i.userAgent}>
                      {i.userAgent || "-"}
                    </Text>
                  </Td>
                  <Td isNumeric>
                    <Tooltip label="Details">
                      <IconButton
                        aria-label="Details"
                        size="sm"
                        icon={<FaInfoCircle />}
                        onClick={() => openDetails(i._id)}
                        variant="ghost"
                      />
                    </Tooltip>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <HStack mt={3} justify="space-between">
            <Text fontSize="sm">
              Showing {items.length} of {total} — Page {page}
            </Text>
            <HStack>
              <Button size="sm" onClick={() => load(page - 1)} isDisabled={!hasPrev}>
                Prev
              </Button>
