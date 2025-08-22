// frontend/src/pages/AdminPage.jsx
import React, { useCallback, useEffect, useState } from "react";
import {
  Box, Heading, Text, VStack, Tabs, TabList, TabPanels, Tab, TabPanel,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Spinner,
  Alert, AlertIcon, Button, useToast, Badge, HStack, IconButton, Tooltip,
} from "@chakra-ui/react";
import { FaSync, FaTrashAlt } from "react-icons/fa";
import { client, setAuthHeader } from "../api/client";
import { useAuth } from "../context/AuthProvider";
import InventoryPanel from "../components/admin/InventoryPanel.jsx";
import AdminAuditLogs from "./admin/AdminAuditLogs.jsx";

// Helper to format datetimes safely
const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");

export default function AdminPage() {
  const toast = useToast();
  const { token } = useAuth();

  // Keep axios auth header synced with our token
  useEffect(() => { setAuthHeader(token); }, [token]);

  // -------- STATE (declare BEFORE any callbacks that use them) --------
  const [tabIndex, setTabIndex] = useState(0);

  // Users
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");

  // Orders
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  // Designs
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [designsError, setDesignsError] = useState("");

  // Sessions / Devices
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState("");

  // Audit tab (no data stored here; component fetches)
  const [auditsLoaded, setAuditsLoaded] = useState(false);

  // -------- FETCHERS (now safe to reference the state above) --------
  const fetchUsers = useCallback(async () => {
    if (users.length > 0) return;
    setLoadingUsers(true); setUsersError("");
    try {
      const { data } = await client.get("/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      setUsers(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      setUsersError("Failed to fetch users");
    } finally {
      setLoadingUsers(false);
    }
  }, [token, users.length]);

  const fetchOrders = useCallback(async () => {
    if (orders.length > 0) return;
    setLoadingOrders(true); setOrdersError("");
    try {
      const { data } = await client.get("/admin/orders", { headers: { Authorization: `Bearer ${token}` } });
      setOrders(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      setOrdersError("Failed to fetch orders");
    } finally {
      setLoadingOrders(false);
    }
  }, [token, orders.length]);

  const fetchDesigns = useCallback(async () => {
    if (designs.length > 0) return;
    setLoadingDesigns(true); setDesignsError("");
    try {
      const { data } = await client.get("/admin/designs", { headers: { Authorization: `Bearer ${token}` } });
      setDesigns(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      setLoadingDesigns("Failed to fetch designs");
    } finally {
      setLoadingDesigns(false);
    }
  }, [token, designs.length]);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true); setSessionsError("");
    try {
      const { data } = await client.get("/admin/sessions", {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 1, limit: 100, activeOnly: true },
      });
      setSessions(data?.items || []);
    } catch (e) {
      setSessionsError("Failed to fetch sessions");
    } finally {
      setLoadingSessions(false);
    }
  }, [token]);

  // Map tab index to loader
  // 0 Dashboard, 1 Users, 2 Orders, 3 Designs, 4 Inventory, 5 Devices, 6 Audit Logs
  const dataFetchers = {
    0: null,
    1: fetchUsers,
    2: fetchOrders,
    3: fetchDesigns,
    4: null,        // Inventory panel fetches internally
    5: fetchSessions,
    6: () => setAuditsLoaded(true),
  };

  const handleTabsChange = (index) => {
    setTabIndex(index);
    const f = dataFetchers[index];
    if (typeof f === "function") f();
  };

  // -------- PANELS --------
  const UsersPanel = () => (
    <Box layerStyle="cardBlue" p={{ base: 2, md: 4 }}>
      <HStack justify="space-between" mb={3}>
        <Heading size="md">Users</Heading>
        <Button size="sm" leftIcon={<FaSync />} onClick={() => { setUsers([]); fetchUsers(); }} isLoading={loadingUsers}>Refresh</Button>
      </HStack>
      {loadingUsers ? (
        <VStack p={8}><Spinner/></VStack>
      ) : usersError ? (
        <Alert status="error"><AlertIcon/>{usersError}</Alert>
      ) : (
        <TableContainer>
          <Table size="sm" variant="simple">
            <Thead><Tr><Th>Username</Th><Th>Email</Th><Th>Created</Th><Th>Admin</Th></Tr></Thead>
            <Tbody>
              {users.map(u => (
                <Tr key={u._id}>
                  <Td><Text fontWeight="bold">{u.username}</Text></Td>
                  <Td>{u.email}</Td>
                  <Td>{fmt(u.createdAt)}</Td>
                  <Td>{u.isAdmin ? <Badge colorScheme="purple">Yes</Badge> : "No"}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const OrdersPanel = () => (
    <Box layerStyle="cardBlue" p={{ base: 2, md: 4 }}>
      <HStack justify="space-between" mb={3}>
        <Heading size="md">Orders</Heading>
        <Button size="sm" leftIcon={<FaSync />} onClick={() => { setOrders([]); fetchOrders(); }} isLoading={loadingOrders}>Refresh</Button>
      </HStack>
      {loadingOrders ? (
        <VStack p={8}><Spinner/></VStack>
      ) : ordersError ? (
        <Alert status="error"><AlertIcon/>{ordersError}</Alert>
      ) : (
        <TableContainer>
          <Table size="sm" variant="simple">
            <Thead><Tr><Th>ID</Th><Th>User</Th><Th>Total</Th><Th>Status</Th><Th>Created</Th></Tr></Thead>
            <Tbody>
              {orders.map(o => (
                <Tr key={o._id || o.id}>
                  <Td>{(o._id || o.id || "").toString().slice(0,8)}…</Td>
                  <Td>{o.user?.username || o.user?.email || "—"}</Td>
                  <Td>{o.total != null ? `$${Number(o.total).toFixed(2)}` : "—"}</Td>
                  <Td>{o.status || "—"}</Td>
                  <Td>{fmt(o.createdAt)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const DesignsPanel = () => (
    <Box layerStyle="cardBlue" p={{ base: 2, md: 4 }}>
      <HStack justify="space-between" mb={3}>
        <Heading size="md">Designs</Heading>
        <Button size="sm" leftIcon={<FaSync />} onClick={() => { setDesigns([]); fetchDesigns(); }} isLoading={loadingDesigns}>Refresh</Button>
      </HStack>
      {loadingDesigns ? (
        <VStack p={8}><Spinner/></VStack>
      ) : designsError ? (
        <Alert status="error"><AlertIcon/>{designsError}</Alert>
      ) : (
        <TableContainer>
          <Table size="sm" variant="simple">
            <Thead><Tr><Th>Title</Th><Th>Owner</Th><Th>Created</Th></Tr></Thead>
            <Tbody>
              {designs.map(d => (
                <Tr key={d._id || d.id}>
                  <Td>{d.title || d.name || "—"}</Td>
                  <Td>{d.user?.username || d.user?.email || "—"}</Td>
                  <Td>{fmt(d.createdAt)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const DevicesPanel = () => (
    <Box layerStyle="cardBlue" p={{ base: 2, md: 4 }}>
      <HStack justify="space-between" mb={3}>
        <Heading size="md">Devices / Active Sessions</Heading>
        <Button
          size="sm"
          leftIcon={<FaSync />}
          onClick={() => fetchSessions()}
          isLoading={loadingSessions}
        >
          Refresh
        </Button>
      </HStack>

      {loadingSessions ? (
        <VStack p={8}><Spinner/></VStack>
      ) : sessionsError ? (
        <Alert status="error"><AlertIcon/>{sessionsError}</Alert>
      ) : (
        <TableContainer>
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th>User</Th>
                {/* JTI intentionally hidden */}
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
              {sessions.map(s => (
                <Tr key={s.jti}>
                  <Td>
                    <Text fontWeight="bold">{s.user?.username || "(unknown)"}</Text>
                    <Text fontSize="xs" color="gray.500">{s.user?.email}</Text>
                  </Td>
                  <Td>{s.ip || "—"}</Td>
                  <Td><Text maxW="360px" noOfLines={1} title={s.userAgent}>{s.userAgent || "—"}</Text></Td>
                  <Td>{fmt(s.createdAt)}</Td>
                  <Td>{fmt(s.lastSeenAt || s.createdAt)}</Td>
                  <Td>{fmt(s.expiresAt)}</Td>
                  <Td>
                    {s.status === "active" ? <Badge colorScheme="green">Active</Badge> :
                     s.status === "expired" ? <Badge>Expired</Badge> :
                     <Badge colorScheme="red">Revoked</Badge>}
                  </Td>
                  <Td isNumeric>
                    {s.status === "active" && (
                      <Tooltip label="Revoke this session">
                        <IconButton
                          size="sm"
                          icon={<FaTrashAlt />}
                          aria-label="Revoke"
                          onClick={async () => {
                            try {
                              await client.delete(`/admin/sessions/${s.jti}`, { headers: { Authorization: `Bearer ${token}` } });
                              await fetchSessions();
                              toast({ title: "Session revoked", status: "success" });
                            } catch {
                              toast({ title: "Failed to revoke session", status: "error" });
                            }
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

  // Auto-load Devices when its tab is first visited
  useEffect(() => {
    if (tabIndex === 5 && sessions.length === 0 && !loadingSessions) {
      fetchSessions();
    }
  }, [tabIndex, sessions.length, loadingSessions, fetchSessions]);

  return (
    <Box p={{ base: 2, md: 4 }}>
      <Heading size="lg" mb={4}>Admin</Heading>
      <Tabs index={tabIndex} onChange={handleTabsChange} isFitted colorScheme="brandAccentOrange">
        <TabList>
          <Tab>Dashboard</Tab>
          <Tab>Users</Tab>
          <Tab>Orders</Tab>
          <Tab>Designs</Tab>
          <Tab>Inventory</Tab>
          <Tab>Devices</Tab>
          <Tab>Audit Logs</Tab>
        </TabList>
        <TabPanels mt={4}>
          <TabPanel>
            <Box layerStyle="cardBlue" p={{ base: 3, md: 5 }}>
              <Heading size="md" mb={2}>Overview</Heading>
              <Text color="gray.300">Welcome to the admin dashboard.</Text>
            </Box>
          </TabPanel>

          <TabPanel><UsersPanel/></TabPanel>
          <TabPanel><OrdersPanel/></TabPanel>
          <TabPanel><DesignsPanel/></TabPanel>

          <TabPanel>
            {/* Your Inventory panel handles its own data */}
            <InventoryPanel />
          </TabPanel>

          <TabPanel><DevicesPanel/></TabPanel>

          <TabPanel>
            {/* Matches brand card style/colors; the component fetches on demand */}
            <AdminAuditLogs token={token}/>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
