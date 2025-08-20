// frontend/src/pages/admin/AdminAuditLogs.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Heading, Text, VStack, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Spinner, Alert, AlertIcon, HStack, Input, Button, Badge
} from "@chakra-ui/react";
import { FaSync, FaGlobe, FaDesktop } from "react-icons/fa";
import { client } from "../../api/client";

function actionLabel(a) {
  const map = {
    LOGIN: "Login",
    LOGOUT: "Logout",
    REGISTER: "Register",
    PROFILE_UPDATE: "Profile Updated",
    PASSWORD_RESET_REQUEST: "Password Reset Requested",
    PASSWORD_RESET: "Password Reset",
    PASSWORD_CHANGE: "Password Changed",
    USER_UPDATE: "User Updated",
    USER_DELETE: "User Deleted",
    ORDER_DELETE: "Order Deleted",
    ORDER_STATUS_UPDATE: "Order Status Updated",
    DESIGN_DELETE: "Design Deleted",
    PRODUCT_CREATE: "Product Created",
    PRODUCT_UPDATE: "Product Updated",
    PRODUCT_DELETE: "Product Deleted",
  };
  return map[a] || a;
}

export default function AdminAuditLogs({ token }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [filters, setFilters] = useState({ actor: "", action: "", targetType: "", targetId: "" });

  const params = useMemo(
    () => ({ ...filters, page: 1, limit: 100 }),
    [filters]
  );

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await client.get("/admin/audit", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setAudits(data.items || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); // initial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box p={{ base: 2, md: 4 }} layerStyle="cardBlue" w="100%">
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="md">Admin Audit Logs</Heading>
        <HStack>
          <Input placeholder="Actor (User ID)" value={filters.actor} onChange={(e)=>setFilters(f=>({...f, actor:e.target.value}))} size="sm" w="220px"/>
          <Input placeholder="Action (e.g. LOGIN)" value={filters.action} onChange={(e)=>setFilters(f=>({...f, action:e.target.value}))} size="sm" w="220px"/>
          <Input placeholder="Target Type" value={filters.targetType} onChange={(e)=>setFilters(f=>({...f, targetType:e.target.value}))} size="sm" w="180px"/>
          <Input placeholder="Target ID" value={filters.targetId} onChange={(e)=>setFilters(f=>({...f, targetId:e.target.value}))} size="sm" w="220px"/>
          <Button leftIcon={<FaSync />} size="sm" onClick={load} isLoading={loading}>Apply</Button>
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
                <Th>Summary</Th>
                <Th>Network</Th>
                <Th>Meta</Th>
              </Tr>
            </Thead>
            <Tbody>
              {audits.map((i)=>(
                <Tr key={i._id}>
                  <Td><Text fontSize="sm">{new Date(i.createdAt).toLocaleString()}</Text></Td>
                  <Td>
                    <Text fontWeight="bold">{i.actor?.username || i.actor?.email || "(unknown)"}</Text>
                    {i.actor?.email && <Text fontSize="xs" color="gray.500">{i.actor.email}</Text>}
                  </Td>
                  <Td><Badge colorScheme="blue">{actionLabel(i.action)}</Badge></Td>
                  <Td>
                    <Text fontSize="sm">
                      {i.targetType || "—"}{i.targetId ? `: ${i.targetId}` : ""}
                    </Text>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <FaGlobe/><Text fontSize="xs">{i.ip || "-"}</Text>
                    </HStack>
                    <HStack spacing={2} mt={1}>
                      <FaDesktop/><Text maxW="280px" noOfLines={1} title={i.userAgent} fontSize="xs" color="gray.500">
                        {i.userAgent || "-"}
                      </Text>
                    </HStack>
                  </Td>
                  <Td>
                    <Text fontSize="xs" as="pre" whiteSpace="pre-wrap" maxW="340px">
                      {JSON.stringify(i.meta || {}, null, 2)}
                    </Text>
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
