// frontend/src/pages/AdminAuditLogs.jsx
import { useEffect, useState } from "react";
import { client } from "../api/client";
import {
  Box, Heading, HStack, Input, Button, Table, Thead, Tbody, Tr, Th, Td,
  Text, Code, useToast, IconButton, Tooltip, Tag, TableContainer,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  VStack
} from "@chakra-ui/react";
import { FaSync, FaInfoCircle } from "react-icons/fa";

export default function AdminAuditLogs() {
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
      const res = await client.get("/admin/audit", { params: { ...filters, page: p, limit: 50 } });
      setItems(res.data.items || []);
      setPage(res.data.page || p);
      setHasMore(Boolean(res.data.hasMore || (res.data.total || 0) > (res.data.page || 1) * (res.data.limit || 50)));
    } catch {
      toast({ title: "Failed to load audit logs", status: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); /* eslint-disable react-hooks/exhaustive-deps */ }, []);

  return (
    <Box layerStyle="cardBlue" w="100%" p={{ base: 2, md: 4 }}>
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="md">Admin Audit Logs</Heading>
        <HStack>
          <Input placeholder="Actor (User ID)" value={filters.actor} onChange={e => setFilters(f => ({ ...f, actor: e.target.value }))} size="sm" w="200px" />
          <Input placeholder="Action (e.g. LOGIN)" value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))} size="sm" w="180px" />
          <Input placeholder="Target Type" value={filters.targetType} onChange={e => setFilters(f => ({ ...f, targetType: e.target.value }))} size="sm" w="160px" />
          <Input placeholder="Target ID" value={filters.targetId} onChange={e => setFilters(f => ({ ...f, targetId: e.target.value }))} size="sm" w="180px" />
          <Button leftIcon={<FaSync />} size="sm" onClick={() => load(1)} isLoading={loading}>Apply</Button>
        </HStack>
      </HStack>

      <TableContainer w="100%">
        <Table size="sm" variant="simple" w="100%">
          <Thead>
            <Tr>
              <Th>When</Th>
              <Th>Actor</Th>
              <Th>Action</Th>
              <Th>Target</Th>
              <Th>Session ID</Th>
              <Th>IP</Th>
              <Th>UA</Th>
              <Th isNumeric>Details</Th>
            </Tr>
          </Thead>
          <Tbody>
            {items.map((i) => {
              const sessionId =
                i.meta?.sessionId ||
                i.meta?.sid ||
                i.meta?.session ||
                i.targetType === "Auth" ? i.targetId : "";

              return (
                <Tr key={i._id}>
                  <Td><Text fontSize="sm">{new Date(i.createdAt).toLocaleString()}</Text></Td>
                  <Td>
                    <Text fontWeight="bold">{i.actor?.username || i.actorDisplay || "(unknown)"}</Text>
                    <Text fontSize="xs" color="gray.500">{i.actor?.email || ""}</Text>
                  </Td>
                  <Td><Tag size="sm" colorScheme={i.action === "LOGIN" ? "green" : i.action === "LOGOUT" ? "purple" : "blue"}>{i.action}</Tag></Td>
                  <Td>
                    <Text>{i.targetType || "-"}</Text>
                    <Text fontSize="xs" color="gray.500">{i.targetId || ""}</Text>
                  </Td>
                  <Td><Code fontSize="xs">{sessionId || "-"}</Code></Td>
                  <Td>{i.ip || "-"}</Td>
                  <Td><Text maxW="320px" noOfLines={1} title={i.userAgent}>{i.userAgent || "-"}</Text></Td>
                  <Td isNumeric>
                    <Tooltip label="Session / Audit Details">
                      <IconButton
                        size="sm"
                        aria-label="Details"
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
            Session / Audit Details{" "}
            <Tag ml={2} size="sm" colorScheme={detail?.action === "LOGIN" ? "green" : detail?.action === "LOGOUT" ? "purple" : "blue"}>
              {detail?.action}
            </Tag>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {detail && (
              <VStack align="stretch" spacing={2} fontFamily="mono" fontSize="sm">
                <Box><b>id:</b> {detail._id}</Box>
                <Box><b>when:</b> {new Date(detail.createdAt).toLocaleString()}</Box>
                <Box><b>actor:</b> {detail.actor?.username || detail.actorDisplay || "(unknown)"} {detail.actor?.email ? ` <${detail.actor.email}>` : ""}</Box>
                <Box><b>target:</b> {detail.targetType || "-"} {detail.targetId ? ` ${detail.targetId}` : ""}</Box>
                <Box><b>ip:</b> {detail.ip || "-"}</Box>
                <Box><b>userAgent:</b> {detail.userAgent || "-"}</Box>
                <Box><b>meta:</b></Box>
                <Box as="pre" whiteSpace="pre-wrap">{JSON.stringify(detail.meta || {}, null, 2)}</Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter><Button onClick={() => setDetail(null)}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
