// frontend/src/pages/AdminPage.jsx
// NOTE: This is your file with 3 focused fixes:
// 1) Correct dataFetchers mapping so Devices (index 5) loads sessions automatically.
// 2) Hide JTI column in Devices table (we still use it internally for revoke).
// 3) Ensure axios auth header stays in sync with token.

import React, { useCallback, useEffect, useState } from "react";
import {
  Box, Heading, Text, VStack, Tabs, TabList, TabPanels, Tab, TabPanel, Icon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Spinner, Alert, AlertIcon,
  Button, useToast, Tag, Image, Select,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure,
  FormControl, FormLabel, Input, Switch, InputGroup, InputRightElement, IconButton as ChakraIconButton,
  Divider, Tooltip, Grid, GridItem, Flex, SimpleGrid, HStack, Badge
} from "@chakra-ui/react";
import {
  FaUsersCog, FaBoxOpen, FaPalette, FaEdit, FaTrashAlt, FaEye, FaKey,
  FaWarehouse, FaTachometerAlt, FaInfoCircle, FaSync, FaUserSlash
} from "react-icons/fa";
import { client, setAuthHeader } from "../api/client";
import { useAuth } from "../context/AuthProvider";
import InventoryPanel from "../components/admin/InventoryPanel.jsx";
import AdminDashboard from "./admin/AdminDashboard.jsx";
import AdminAuditLogs from "./admin/AdminAuditLogs.jsx";

// ... (helpers & state same as your copy above)

const AdminPage = () => {
  const toast = useToast();
  const { token } = useAuth();

  // keep axios header synced
  useEffect(() => { setAuthHeader(token); }, [token]);

  // --- your existing state declarations unchanged ---

  // Lazy data loaders per-tab (FIXED indexes):
  // 0 Dashboard, 1 Users, 2 Orders, 3 Designs, 4 Inventory, 5 Devices, 6 Audit Logs
  const dataFetchers = {
    0: useCallback(async () => {/* dashboard loads itself */}, []),
    1: useCallback(async () => {
      if (users.length > 0) return;
      setLoadingUsers(true); setUsersError("");
      try { const { data } = await client.get("/admin/users", { headers: { Authorization: `Bearer ${token}` } }); setUsers(data); }
      catch (e) { setUsersError("Failed to fetch users"); }
      finally { setLoadingUsers(false); }
    }, [token, users.length]),
    2: useCallback(async () => {
      if (orders.length > 0) return;
      setLoadingOrders(true); setOrdersError("");
      try { const { data } = await client.get("/admin/orders", { headers: { Authorization: `Bearer ${token}` } }); setOrders(data); }
      catch (e) { setOrdersError("Failed to fetch orders"); }
      finally { setLoadingOrders(false); }
    }, [token, orders.length]),
    3: useCallback(async () => {
      if (designs.length > 0) return;
      setLoadingDesigns(true); setDesignsError("");
      try { const { data } = await client.get("/admin/designs", { headers: { Authorization: `Bearer ${token}` } }); setDesigns(data); }
      catch (e) { setDesignsError("Failed to fetch designs"); }
      finally { setLoadingDesigns(false); }
    }, [token, designs.length]),
    4: useCallback(async () => {/* Inventory panel fetches itself */}, []),
    5: useCallback(async () => { // DEVICES (auto-load)
      setLoadingSessions(true); setSessionsError("");
      try {
        const { data } = await client.get("/admin/sessions", {
          headers: { Authorization: `Bearer ${token}` },
          params: { page: 1, limit: 100, activeOnly: true },
        });
        setSessions(data.items || []);
      } catch (e) {
        setSessionsError("Failed to fetch sessions");
      } finally { setLoadingSessions(false); }
    }, [token]),
    6: useCallback(async () => { if (!auditsLoaded) setAuditsLoaded(true); }, [auditsLoaded]),
  };

  useEffect(() => {
    // load the initial tab (dashboard) doesn’t need data; nothing else
  }, []);

  const handleTabsChange = (index) => {
    setTabIndex(index);
    const fetcher = dataFetchers[index];
    if (fetcher) fetcher();
  };

  // --- DevicesPanel (JTI column removed visually) ---
  const DevicesPanel = () => (
    <Box p={{ base: 2, md: 4 }} layerStyle="cardBlue" w="100%">
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="md">Devices / Active Sessions</Heading>
        <Button
          leftIcon={<FaSync />}
          size="sm"
          onClick={async () => {
            setLoadingSessions(true);
            try {
              const { data } = await client.get("/admin/sessions", {
                headers: { Authorization: `Bearer ${token}` },
                params: { page: 1, limit: 100, activeOnly: true },
              });
              setSessions(data.items || []);
            } catch (e) {
              toast({ title: "Failed to refresh sessions", status: "error" });
            } finally { setLoadingSessions(false); }
          }}
          isLoading={loadingSessions}
        >
          Refresh
        </Button>
      </HStack>

      {loadingSessions ? (
        <VStack p={10}><Spinner/></VStack>
      ) : sessionsError ? (
        <Alert status="error"><AlertIcon/>{sessionsError}</Alert>
      ) : (
        <TableContainer w="100%">
          <Table size="sm" variant="simple" w="100%">
            <Thead>
              <Tr>
                <Th>User</Th>
                {/* <Th>JTI</Th>  -- hidden by request */}
                <Th>IP</Th>
                <Th>User Agent</Th>
                <Th>Created</Th>
                <Th>Last Seen</Th>
                <Th>Expires</Th>
                <Th>Status</Th>
                <Th isNumeric>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {sessions.map((i) => (
                <Tr key={i.jti}>
                  <Td>
                    <Text fontWeight="bold">{i.user?.username || "(unknown)"}</Text>
                    <Text fontSize="xs" color="gray.500">{i.user?.email}</Text>
                  </Td>
                  {/* JTI hidden */}
                  <Td>{i.ip || "-"}</Td>
                  <Td><Text maxW="360px" noOfLines={1} title={i.userAgent}>{i.userAgent || "-"}</Text></Td>
                  <Td>{new Date(i.createdAt).toLocaleString()}</Td>
                  <Td>{new Date(i.lastSeenAt || i.createdAt).toLocaleString()}</Td>
                  <Td>{new Date(i.expiresAt).toLocaleString()}</Td>
                  <Td>
                    {i.status === "active" ? <Badge colorScheme="green">Active</Badge> :
                     i.status === "expired" ? <Badge>Expired</Badge> :
                     <Badge colorScheme="red">Revoked</Badge>}
                  </Td>
                  <Td isNumeric>
                    {i.status === "active" && (
                      <Tooltip label="Revoke this session">
                        <ChakraIconButton size="sm" icon={<FaTrashAlt />} aria-label="Revoke"
                          onClick={async () => {
                            try {
                              await client.delete(`/admin/sessions/${i.jti}`, { headers: { Authorization: `Bearer ${token}` } });
                              const { data } = await client.get("/admin/sessions", {
                                headers: { Authorization: `Bearer ${token}` }, params: { page: 1, limit: 100, activeOnly: true },
                              });
                              setSessions(data.items || []);
                              toast({ title: "Session revoked", status: "success" });
                            } catch { toast({ title: "Failed to revoke session", status: "error" }); }
                          }}
                        />
                      </Tooltip>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  // --- rest of your component unchanged, but Tabs list must include 7 tabs ---
  return (
    // ... keep your same render, just ensure tabs order/indices match the fetchers above
    // Dashboard, Users, Orders, Designs, Inventory, Devices, Audit Logs
    // Replace your DevicesPanel definition with this updated one.
    // Ensure <Tabs onChange={handleTabsChange} index={tabIndex}> remains.
    // And keep <AdminAuditLogs token={token}/> (updated file below) for audit logs.
    <>
      {/* your original big JSX with the updated DevicesPanel in place */}
    </>
  );
};

export default AdminPage;
