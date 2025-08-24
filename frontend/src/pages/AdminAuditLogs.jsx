// frontend/src/pages/AdminAuditLogs.jsx
import { useEffect, useMemo, useState } from "react";
import { client } from "../api/client";
import {
  Box, Heading, HStack, Input, Button, Table, Thead, Tbody, Tr, Th, Td,
  Text, Code, useToast, IconButton, Tooltip, Tag, TableContainer,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  VStack, Flex, Select
} from "@chakra-ui/react";
import { FaSync, FaInfoCircle, FaCopy } from "react-icons/fa";

const isObjId = (s) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s);
const shortId = (id = "", chunk = 4) => {
  if (!id) return "-";
  const s = String(id).replace(/[^a-zA-Z0-9]/g, "");
  if (s.length <= chunk * 2) return s;
  return `${s.slice(0, chunk)}…${s.slice(-chunk)}`;
};

export default function AdminAuditLogs() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const toast = useToast();

  // Filters
  const [actorOrQ, setActorOrQ] = useState("");     // Accepts userId/email/username/session id/anything
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [dateFrom, setDateFrom] = useState("");     // YYYY-MM-DD
  const [dateTo, setDateTo] = useState("");         // YYYY-MM-DD

  const limit = 25;

  const queryParams = useMemo(() => {
    const params = {
      action: action || undefined,
      targetType: targetType || undefined,
      page,
      limit,
    };

    // Translate the single input into either actor or q
    if (actorOrQ) {
      if (isObjId(actorOrQ)) params.actor = actorOrQ;
      else params.q = actorOrQ;
    }

    // Date range to ISO (start-of-day / end-of-day)
    if (dateFrom) params.createdFrom = new Date(`${dateFrom}T00:00:00Z`).toISOString();
    if (dateTo) params.createdTo = new Date(`${dateTo}T23:59:59Z`).toISOString();

    return params;
  }, [actorOrQ, action, targetType, page, limit, dateFrom, dateTo]);

  const load = async (p = 1, append = false) => {
    setLoading(true);
    try {
      const res = await client.get("/admin/audit", {
        params: { ...queryParams, page: p },
      });
      const next = res.data?.items || [];
      setPage(res.data?.page || p);
      setHasMore(Boolean(res.data?.hasMore ?? ((res.data?.total || 0) > (res.data?.page || 1) * (res.data?.limit || limit))));
      setItems((prev) => (append ? [...prev, ...next] : next));
    } catch (e) {
      toast({
        title: "Failed to load audit logs",
        description: e?.response?.data?.message || e.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = () => load(1, false);
  const showMore = () => load(page + 1, true);

  return (
    <Box layerStyle="cardBlue" w="100%" p={{ base: 2, md: 4 }}>
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="md">Admin Audit Logs</Heading>
        <HStack gap={2} flexWrap="wrap">
          <Input
            placeholder="User ID / username / email / session id"
            value={actorOrQ}
            onChange={(e) => setActorOrQ(e.target.value)}
            size="sm"
            w="260px"
          />
          <Select
            placeholder="Action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            size="sm"
            w="160px"
          >
            <option value="REGISTER">REGISTER</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="PROFILE_UPDATE">PROFILE_UPDATE</option>
            <option value="PASSWORD_RESET_REQUEST">PASSWORD_RESET_REQUEST</option>
            <option value="PASSWORD_RESET">PASSWORD_RESET</option>
            <option value="PASSWORD_CHANGE">PASSWORD_CHANGE</option>
            <option value="ORDER_CREATE">ORDER_CREATE</option>
          </Select>
          <Select
            placeholder="Target type"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            size="sm"
            w="160px"
          >
            <option value="User">User</option>
            <option value="Order">Order</option>
            <option value="Design">Design</option>
            <option value="Auth">Auth</option>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            size="sm"
            w="160px"
            title="From date"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            size="sm"
            w="160px"
            title="To date"
          />
          <Button leftIcon={<FaSync />} size="sm" onClick={apply} isLoading={loading}>
            Apply
          </Button>
        </HStack>
      </HStack>

      <TableContainer
        w="100%"
        overflowX="auto"
        borderRadius="md"
        borderWidth="1px"
        borderColor="rgba(0,0,0,0.08)"
      >
        <Table size="sm" variant="simple" w="full" tableLayout="fixed">
          <Thead position="sticky" top={0} zIndex={1} bg="brand.cardBlue">
            <Tr>
              <Th w="160px">When</Th>
              <Th w="220px">Actor</Th>
              <Th w="120px">Action</Th>
              <Th w="200px">Session ID</Th>
              <Th w="130px">IP</Th>
              <Th w="360px">User Agent</Th>
              <Th w="90px" isNumeric>Details</Th>
            </Tr>
          </Thead>
          <Tbody>
            {items.map((i) => {
              const sessionId =
                i.sessionJti ||
                i.meta?.sessionId ||
                i.meta?.sid ||
                i.meta?.session ||
                "";
              return (
                <Tr key={i._id}>
                  <Td>
                    <Text fontSize="sm" noOfLines={1}>
                      {new Date(i.createdAt).toLocaleString()}
                    </Text>
                  </Td>
                  <Td>
                    <Text fontWeight="bold" noOfLines={1}>
                      {i.actor?.username || i.actorDisplay || "(unknown)"}
                    </Text>
                    <Text fontSize="xs" color="gray.500" noOfLines={1}>
                      {i.actor?.email || ""}
                    </Text>
                  </Td>
                  <Td>
                    <Tag
                      size="sm"
                      colorScheme={
                        i.action === "LOGIN"
                          ? "green"
                          : i.action === "LOGOUT"
                          ? "purple"
                          : "blue"
                      }
                    >
                      {i.action}
                    </Tag>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <Tooltip label={sessionId || "-"}>
                        <Code fontSize="xs">{shortId(sessionId)}</Code>
                      </Tooltip>
                      {!!sessionId && (
                        <Tooltip label="Copy full Session ID">
                          <IconButton
                            aria-label="Copy Session ID"
                            icon={<FaCopy />}
                            size="xs"
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(sessionId);
                              toast({ title: "Session ID copied", status: "success", duration: 1200 });
                            }}
                          />
                        </Tooltip>
                      )}
                    </HStack>
                  </Td>
                  <Td><Text noOfLines={1}>{i.ip || "-"}</Text></Td>
                  <Td><Text noOfLines={2} title={i.userAgent}>{i.userAgent || "-"}</Text></Td>
                  <Td isNumeric>
                    <Tooltip label="View details">
                      <IconButton
                        size="sm"
                        aria-label="Details"
                        icon={<FaInfoCircle />}
                        onClick={() => setDetail(i)}
                        variant="ghost"
                      />
                    </Tooltip>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>

      <Flex mt={3} justify="space-between" align="center">
        <Text fontSize="sm" color="gray.600">
          Showing {items.length} {items.length === 1 ? "entry" : "entries"}
        </Text>
        <HStack>
          <Button size="sm" onClick={() => load(1, false)} variant="outline">
            Refresh
          </Button>
          <Button size="sm" onClick={showMore} isDisabled={!hasMore} isLoading={loading}>
            {hasMore ? "Show more" : "No more"}
          </Button>
        </HStack>
      </Flex>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Audit Details{" "}
            {detail?.action && (
              <Tag
                ml={2}
                size="sm"
                colorScheme={
                  detail.action === "LOGIN"
                    ? "green"
                    : detail.action === "LOGOUT"
                    ? "purple"
                    : "blue"
                }
              >
                {detail.action}
              </Tag>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {detail && (
              <VStack align="stretch" spacing={2} fontSize="sm">
                <Box><b>id:</b> {detail._id}</Box>
                <Box><b>when:</b> {new Date(detail.createdAt).toLocaleString()}</Box>
                <Box>
                  <b>actor:</b>{" "}
                  {detail.actor?.username || detail.actorDisplay || "(unknown)"}{" "}
                  {detail.actor?.email ? ` <${detail.actor.email}>` : ""}
                </Box>
                <Box><b>ip:</b> {detail.ip || "-"}</Box>
                <Box><b>userAgent:</b> {detail.userAgent || "-"}</Box>
                <Box><b>sessionId:</b> {detail.sessionJti || detail.meta?.sessionId || detail.meta?.sid || "-"}</Box>
                <Box><b>meta:</b></Box>
                <Box as="pre" whiteSpace="pre-wrap" fontFamily="mono">
                  {JSON.stringify(detail.meta || {}, null, 2)}
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setDetail(null)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
