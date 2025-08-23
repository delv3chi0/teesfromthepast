import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Heading, Text, VStack, Tabs, TabList, TabPanels, Tab, TabPanel, Icon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Spinner, Alert, AlertIcon,
  Button, useToast, Tag, Image, Select, HStack, Badge, Code, Tooltip,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Input, Switch, Divider, SimpleGrid, AspectRatio
} from "@chakra-ui/react";
import {
  FaUsersCog, FaBoxOpen, FaPalette, FaEdit, FaTrashAlt, FaEye,
  FaWarehouse, FaTachometerAlt, FaInfoCircle, FaSync, FaUserSlash, FaKey, FaCopy
} from "react-icons/fa";

import { client, setAuthHeader } from "../api/client";
import { useAuth } from "../context/AuthProvider";
import InventoryPanel from "../components/admin/InventoryPanel.jsx";
import AdminDashboard from "./admin/AdminDashboard.jsx";
import AdminAuditLogs from "./AdminAuditLogs.jsx";

/** ---- small utils ---- */
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");
const money = (c) => (typeof c === "number" ? `$${(c / 100).toFixed(2)}` : "—");
const monthName = (yyyymm) => {
  if (!yyyymm || typeof yyyymm !== "string" || yyyymm.length !== 7) return "N/A";
  const [y, m] = yyyymm.split("-");
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return date.toLocaleString("default", { month: "short", year: "numeric" });
};
const shortId = (id = "", chunk = 4) => {
  if (!id) return "-";
  const s = String(id).replace(/[^a-zA-Z0-9]/g, "");
  if (s.length <= chunk * 2) return s;
  return `${s.slice(0, chunk)}…${s.slice(-chunk)}`;
};

export default function AdminPage() {
  const toast = useToast();
  const { token } = useAuth();
  useEffect(() => { setAuthHeader(token); }, [token]);

  const [tabIndex, setTabIndex] = useState(0);

  /** ---- Users ---- */
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  /** ---- Orders ---- */
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingSelectedOrder, setLoadingSelectedOrder] = useState(false);

  /** ---- Designs ---- */
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [designsError, setDesignsError] = useState("");
  const [selectedDesign, setSelectedDesign] = useState(null);

  /** ---- Sessions / Devices ---- */
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [deviceDetail, setDeviceDetail] = useState(null);

  /** ---- Edit user modal state ---- */
  const [editOpen, setEditOpen] = useState(false);
  const [viewUserOpen, setViewUserOpen] = useState(false);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);

  /** ---- Order modals ---- */
  const [viewOrderOpen, setViewOrderOpen] = useState(false);
  const [deleteOrderOpen, setDeleteOrderOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  /** ---- Design modals ---- */
  const [viewDesignOpen, setViewDesignOpen] = useState(false);
  const [deleteDesignOpen, setDeleteDesignOpen] = useState(false);
  const [designToDelete, setDesignToDelete] = useState(null);

  /** ---- Device modal ---- */
  const [deviceOpen, setDeviceOpen] = useState(false);

  /** ---- Simple, comfortable defaults (bigger text, no fixed table layout) ---- */

  /** Fetchers */
  const fetchUsers = useCallback(async () => {
    if (users.length) return;
    setLoadingUsers(true); setUsersError("");
    try {
      const { data } = await client.get("/admin/users");
      setUsers(Array.isArray(data) ? data : (data?.items || []));
    } catch (e) {
      setUsersError("Failed to fetch users");
    } finally { setLoadingUsers(false); }
  }, [users.length]);

  const fetchOrders = useCallback(async () => {
    if (orders.length) return;
    setLoadingOrders(true); setOrdersError("");
    try {
      const { data } = await client.get("/admin/orders");
      setOrders(Array.isArray(data) ? data : (data?.items || []));
    } catch {
      setOrdersError("Failed to fetch orders");
    } finally { setLoadingOrders(false); }
  }, [orders.length]);

  const fetchDesigns = useCallback(async () => {
    if (designs.length) return;
    setLoadingDesigns(true); setDesignsError("");
    try {
      const { data } = await client.get("/admin/designs");
      setDesigns(Array.isArray(data) ? data : (data?.items || []));
    } catch {
      setDesignsError("Failed to fetch designs");
    } finally { setLoadingDesigns(false); }
  }, [designs.length]);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true); setSessionsError("");
    try {
      const { data } = await client.get("/admin/sessions", { params: { page: 1, limit: 100, activeOnly: true } });
      setSessions(data?.items || []);
    } catch {
      setSessionsError("Failed to fetch sessions");
    } finally { setLoadingSessions(false); }
  }, []);

  /** Tabs -> initiate lazy loads */
  const dataFetchers = {
    0: null,
    1: fetchUsers,
    2: fetchOrders,
    3: fetchDesigns,
    4: null,          // Inventory loads inside
    5: fetchSessions, // Devices
    6: null,          // Audit uses its own fetch
  };
  const handleTabsChange = (index) => {
    setTabIndex(index);
    const fn = dataFetchers[index];
    if (typeof fn === "function") fn();
  };

  /** ---- Users actions ---- */
  const [editFormData, setEditFormData] = useState({
    username: "", email: "", firstName: "", lastName: "", isAdmin: false, newPassword: "", confirmNewPassword: ""
  });
  const onEditField = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const openEditUser = (u) => {
    setSelectedUser(u);
    setEditFormData({
      username: u.username || "",
      email: u.email || "",
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      isAdmin: !!u.isAdmin,
      newPassword: "",
      confirmNewPassword: "",
    });
    setEditOpen(true);
  };
  const saveUserEdits = async () => {
    if (!selectedUser) return;
    if (editFormData.newPassword && editFormData.newPassword !== editFormData.confirmNewPassword) {
      toast({ title: "Passwords do not match", status: "error" }); return;
    }
    const payload = { ...editFormData };
    if (!payload.newPassword) delete payload.newPassword;
    delete payload.confirmNewPassword;
    try {
      const { data: updated } = await client.put(`/admin/users/${selectedUser._id}`, payload);
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
      toast({ title: "User updated", status: "success" });
      setEditOpen(false);
    } catch (e) {
      toast({ title: "Update failed", description: e.response?.data?.message, status: "error" });
    }
  };
  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await client.delete(`/admin/users/${selectedUser._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== selectedUser._id));
      toast({ title: "User deleted", status: "success" });
      setDeleteUserOpen(false);
    } catch (e) {
      toast({ title: "Delete failed", description: e.response?.data?.message, status: "error" });
    }
  };

  /** ---- Orders actions ---- */
  const openViewOrder = async (orderId) => {
    setViewOrderOpen(true);
    setLoadingSelectedOrder(true);
    try {
      const { data } = await client.get(`/admin/orders/${orderId}`);
      setSelectedOrder(data);
    } catch (e) {
      toast({ title: "Could not load order", description: e.response?.data?.message, status: "error" });
      setViewOrderOpen(false);
    } finally {
      setLoadingSelectedOrder(false);
    }
  };
  const updateOrderStatus = async (orderId, status) => {
    const snapshot = [...orders];
    setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, orderStatus: status } : o)));
    try {
      await client.put(`/admin/orders/${orderId}/status`, { status });
      toast({ title: "Order updated", status: "success", duration: 1400 });
    } catch (e) {
      setOrders(snapshot);
      toast({ title: "Update failed", description: e.response?.data?.message, status: "error" });
    }
  };
  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      await client.delete(`/admin/orders/${orderToDelete._id}`);
      setOrders((prev) => prev.filter((o) => o._id !== orderToDelete._id));
      toast({ title: "Order deleted", status: "success" });
      setDeleteOrderOpen(false);
    } catch (e) {
      toast({ title: "Delete failed", description: e.response?.data?.message, status: "error" });
    }
  };

  /** ---- Designs actions ---- */
  const confirmDeleteDesign = async () => {
    if (!designToDelete) return;
    try {
      await client.delete(`/admin/designs/${designToDelete._id}`);
      setDesigns((prev) => prev.filter((d) => d._id !== designToDelete._id));
      toast({ title: "Design deleted", status: "success" });
      setDeleteDesignOpen(false);
    } catch (e) {
      toast({ title: "Delete failed", description: e.response?.data?.message, status: "error" });
    }
  };

  /** ---- Sessions actions ---- */
  const SESSION_KEY = "tftp_session_id";
  const forceKickToLogin = () => {
    try {
      localStorage.removeItem("tftp_token");
      localStorage.removeItem("token");
      localStorage.removeItem(SESSION_KEY);
    } catch {}
    delete client.defaults.headers.common.Authorization;
    delete client.defaults.headers.common["x-session-id"];
    window.location.assign("/login?redirect=/admin");
  };
  const revokeSession = async (jti) => {
    try {
      await client.delete(`/admin/sessions/${jti}`);
      toast({ title: "Session revoked", status: "success" });
      const mine = localStorage.getItem(SESSION_KEY);
      if (mine && mine === jti) return forceKickToLogin();
      await fetchSessions();
    } catch {
      toast({ title: "Failed to revoke", status: "error" });
    }
  };
  const revokeAllForUser = async (userId) => {
    try {
      await client.delete(`/admin/sessions/user/${userId}`);
      toast({ title: "All sessions revoked", status: "success" });
      const mine = localStorage.getItem(SESSION_KEY);
      if (mine) return forceKickToLogin();
      await fetchSessions();
    } catch {
      toast({ title: "Failed to revoke user sessions", status: "error" });
    }
  };

  /** ---- Panels ---- */

  const PanelShell = ({ title, onRefresh, isLoading, error, children }) => (
    <Box p={{ base: 3, md: 4 }} layerStyle="cardBlue" borderRadius="xl" w="100%">
      <HStack justify="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Heading size="md">{title}</Heading>
        {onRefresh && (
          <Button size="sm" leftIcon={<FaSync />} onClick={onRefresh} isLoading={isLoading}>
            Refresh
          </Button>
        )}
      </HStack>
      {isLoading ? (
        <VStack p={10}><Spinner /></VStack>
      ) : error ? (
        <Alert status="error"><AlertIcon />{error}</Alert>
      ) : (
        children
      )}
    </Box>
  );

  const UsersPanel = () => (
    <PanelShell
      title="User Management"
      onRefresh={() => { setUsers([]); fetchUsers(); }}
      isLoading={loadingUsers}
      error={usersError}
    >
      <TableContainer borderRadius="md" borderWidth="1px" borderColor="rgba(0,0,0,0.08)">
        <Table size="md" variant="simple">
          <Thead bg="brand.cardBlue" position="sticky" top={0} zIndex={1}>
            <Tr>
              <Th>ID</Th>
              <Th>Username</Th>
              <Th>Email</Th>
              <Th>Name</Th>
              <Th>Admin</Th>
              <Th>Joined</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.map((u) => (
              <Tr key={u._id}>
                <Td fontSize="sm" title={u._id}><Code fontSize="sm">{shortId(u._id)}</Code></Td>
                <Td>{u.username}</Td>
                <Td>{u.email}</Td>
                <Td>{`${u.firstName || ""} ${u.lastName || ""}`.trim() || "—"}</Td>
                <Td><Tag size="sm" colorScheme={u.isAdmin ? "green" : "gray"}>{u.isAdmin ? "Yes" : "No"}</Tag></Td>
                <Td>{fmtDate(u.createdAt)}</Td>
                <Td>
                  <HStack spacing={1}>
                    <Tooltip label="View"><Button size="xs" variant="ghost" onClick={() => { setSelectedUser(u); setViewUserOpen(true); }}><Icon as={FaEye} /></Button></Tooltip>
                    <Tooltip label="Edit"><Button size="xs" variant="ghost" onClick={() => openEditUser(u)}><Icon as={FaEdit} /></Button></Tooltip>
                    <Tooltip label="Delete"><Button size="xs" colorScheme="red" variant="ghost" onClick={() => { setSelectedUser(u); setDeleteUserOpen(true); }}><Icon as={FaTrashAlt} /></Button></Tooltip>
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </PanelShell>
  );

  const OrdersPanel = () => {
    const statusColor = (s) =>
      s === "Delivered" ? "green" : s === "Shipped" ? "blue" : s === "Cancelled" ? "red" : "gray";
    return (
      <PanelShell
        title="Order Management"
        onRefresh={() => { setOrders([]); fetchOrders(); }}
        isLoading={loadingOrders}
        error={ordersError}
      >
        <TableContainer borderRadius="md" borderWidth="1px" borderColor="rgba(0,0,0,0.08)">
          <Table size="md" variant="simple">
            <Thead bg="brand.cardBlue" position="sticky" top={0} zIndex={1}>
              <Tr>
                <Th>ID</Th>
                <Th>User</Th>
                <Th>Date</Th>
                <Th>Total</Th>
                <Th>Pay Status</Th>
                <Th>Order Status</Th>
                <Th>Items</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {orders.map((o) => (
                <Tr key={o._id}>
                  <Td title={o._id}><Code fontSize="sm">{shortId(o._id)}</Code></Td>
                  <Td>{o.user?.email || "—"}</Td>
                  <Td>{fmtDate(o.createdAt)}</Td>
                  <Td>{money(o.totalAmount)}</Td>
                  <Td><Tag size="sm" colorScheme={o.paymentStatus === "Succeeded" ? "green" : "orange"}>{o.paymentStatus}</Tag></Td>
                  <Td>
                    <Select
                      size="sm"
                      value={o.orderStatus}
                      onChange={(e) => updateOrderStatus(o._id, e.target.value)}
                      maxW="180px"
                    >
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </Select>
                  </Td>
                  <Td>{o.orderItems?.length || 0}</Td>
                  <Td>
                    <HStack spacing={1}>
                      <Tooltip label="View"><Button size="xs" variant="ghost" onClick={() => openViewOrder(o._id)}><Icon as={FaEye} /></Button></Tooltip>
                      <Tooltip label="Delete"><Button size="xs" variant="ghost" colorScheme="red" onClick={() => { setOrderToDelete(o); setDeleteOrderOpen(true); }}><Icon as={FaTrashAlt} /></Button></Tooltip>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </PanelShell>
    );
  };

  const DesignsPanel = () => (
    <PanelShell
      title="Design Management"
      onRefresh={() => { setDesigns([]); fetchDesigns(); }}
      isLoading={loadingDesigns}
      error={designsError}
    >
      <TableContainer borderRadius="md" borderWidth="1px" borderColor="rgba(0,0,0,0.08)">
        <Table size="md" variant="simple">
          <Thead bg="brand.cardBlue" position="sticky" top={0} zIndex={1}>
            <Tr>
              <Th>Preview</Th>
              <Th>Prompt</Th>
              <Th>Meta</Th>
              <Th>Creator</Th>
              <Th>Created</Th>
              <Th>Votes (Month)</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {designs.map((d) => {
              const meta = d.settings || {};
              const mode = meta.mode || (meta.imageStrength != null ? "i2i" : "t2i");
              const previewSrc = d.thumbUrl || d.publicUrl || d.imageDataUrl || "";
              return (
                <Tr key={d._id}>
                  <Td>
                    {previewSrc ? (
                      <Image src={previewSrc} boxSize="56px" objectFit="cover" borderRadius="md" />
                    ) : (<Box boxSize="56px" borderWidth="1px" borderRadius="md" />)}
                  </Td>
                  <Td whiteSpace="normal" fontSize="sm">{d.prompt}</Td>
                  <Td>
                    <VStack align="start" spacing={0}>
                      <HStack spacing={2}>
                        <Badge colorScheme={mode === "i2i" ? "purple" : "blue"}>{mode.toUpperCase()}</Badge>
                        <Badge>{meta.aspectRatio || "—"}</Badge>
                      </HStack>
                      <HStack spacing={3} fontSize="xs" color="whiteAlpha.800">
                        <Text>CFG {meta.cfgScale ?? "—"}</Text>
                        <Text>Steps {meta.steps ?? "—"}</Text>
                        <Text>Strength {meta.imageStrength != null ? Math.round(meta.imageStrength * 100) + "%" : "—"}</Text>
                      </HStack>
                    </VStack>
                  </Td>
                  <Td>{d.user?.username || "N/A"}</Td>
                  <Td>{new Date(d.createdAt).toLocaleDateString()}</Td>
                  <Td>
                    {d.isSubmittedForContest && d.contestSubmissionMonth ? (
                      <VStack spacing={0}>
                        <Tag size="sm" colorScheme="blue" borderRadius="full">{d.votes || 0} Votes</Tag>
                        <Text fontSize="xs" color="brand.textMuted">{monthName(d.contestSubmissionMonth)}</Text>
                      </VStack>
                    ) : <Text fontSize="xs" color="brand.textMuted">N/A</Text>}
                  </Td>
                  <Td>
                    <HStack spacing={1}>
                      <Tooltip label="View"><Button size="xs" variant="ghost" onClick={() => { setSelectedDesign(d); setViewDesignOpen(true); }}><Icon as={FaEye} /></Button></Tooltip>
                      <Tooltip label="Delete"><Button size="xs" variant="ghost" colorScheme="red" onClick={() => { setDesignToDelete(d); setDeleteDesignOpen(true); }}><Icon as={FaTrashAlt} /></Button></Tooltip>
                    </HStack>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
    </PanelShell>
  );

  const DevicesPanel = () => (
    <PanelShell title="Devices / Active Sessions" onRefresh={fetchSessions} isLoading={loadingSessions} error={sessionsError}>
      <TableContainer borderRadius="md" borderWidth="1px" borderColor="rgba(0,0,0,0.08)">
        <Table size="md" variant="simple">
          <Thead bg="brand.cardBlue" position="sticky" top={0} zIndex={1}>
            <Tr>
              <Th>User</Th>
              <Th>Session ID</Th>
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
                  <Text fontWeight="bold" noOfLines={1}>{i.user?.username || "(unknown)"}</Text>
                  <Text fontSize="sm" color="gray.500" noOfLines={1}>{i.user?.email}</Text>
                  {i.user?._id && (
                    <Tooltip label="Revoke ALL for this user">
                      <Button size="xs" ml={2} variant="ghost" onClick={() => revokeAllForUser(i.user?._id)}><FaUserSlash /></Button>
                    </Tooltip>
                  )}
                </Td>
                <Td>
                  <HStack spacing={2}>
                    <Tooltip label={i.jti}><Code fontSize="sm">{shortId(i.jti)}</Code></Tooltip>
                    <Tooltip label="Copy full Session ID">
                      <Button size="xs" variant="ghost" onClick={() => { navigator.clipboard.writeText(i.jti); toast({ title: "Copied", status: "success", duration: 1000 }); }}>
                        <FaCopy />
                      </Button>
                    </Tooltip>
                  </HStack>
                </Td>
                <Td>{i.ip || "—"}</Td>
                <Td><Text noOfLines={1} title={i.userAgent}>{i.userAgent || "—"}</Text></Td>
                <Td>{fmtDate(i.createdAt)}</Td>
                <Td>{fmtDate(i.lastSeenAt || i.createdAt)}</Td>
                <Td>{fmtDate(i.expiresAt)}</Td>
                <Td>
                  {i.revokedAt ? <Badge colorScheme="red">Revoked</Badge> :
                   (new Date(i.expiresAt) < new Date() ? <Badge>Expired</Badge> : <Badge colorScheme="green">Active</Badge>)}
                </Td>
                <Td isNumeric>
                  <HStack justify="flex-end" spacing={1}>
                    <Tooltip label="Info">
                      <Button size="xs" variant="ghost" onClick={() => { setDeviceDetail(i); setDeviceOpen(true); }}>
                        <FaInfoCircle />
                      </Button>
                    </Tooltip>
                    {!i.revokedAt && (
                      <Tooltip label="Revoke this session">
                        <Button size="xs" variant="ghost" colorScheme="red" onClick={() => revokeSession(i.jti)}>
                          <FaTrashAlt />
                        </Button>
                      </Tooltip>
                    )}
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </PanelShell>
  );

  /** Auto-load devices once when entering tab */
  useEffect(() => {
    if (tabIndex === 5 && sessions.length === 0 && !loadingSessions) fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabIndex]);

  return (
    <Box w="100%" pb={10}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="pageTitle" color="brand.textLight">Admin Console</Heading>

        <Box bg="brand.paper" borderRadius="xl" shadow="xl" p={{ base: 2, md: 4 }}>
          <Tabs index={tabIndex} onChange={handleTabsChange} isLazy variant="enclosed" colorScheme="brandPrimary">
            <TabList flexWrap="wrap" mb={3}>
              <Tab><Icon as={FaTachometerAlt} mr={2} />Dashboard</Tab>
              <Tab><Icon as={FaUsersCog} mr={2} />Users</Tab>
              <Tab><Icon as={FaBoxOpen} mr={2} />Orders</Tab>
              <Tab><Icon as={FaPalette} mr={2} />Designs</Tab>
              <Tab><Icon as={FaWarehouse} mr={2} />Inventory</Tab>
              <Tab><Icon as={FaKey} mr={2} />Devices</Tab>
              <Tab><Icon as={FaInfoCircle} mr={2} />Audit Logs</Tab>
            </TabList>

            <TabPanels>
              <TabPanel px={0} py={2}><AdminDashboard token={token} onViewOrder={openViewOrder} /></TabPanel>
              <TabPanel px={0} py={2}><UsersPanel /></TabPanel>
              <TabPanel px={0} py={2}><OrdersPanel /></TabPanel>
              <TabPanel px={0} py={2}><DesignsPanel /></TabPanel>
              <TabPanel px={0} py={2}><InventoryPanel /></TabPanel>
              <TabPanel px={0} py={2}><DevicesPanel /></TabPanel>
              <TabPanel px={0} py={2}><AdminAuditLogs token={token} /></TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </VStack>

      {/* ------- Modals (self-contained, no dangling state) ------- */}

      {/* View User */}
      <Modal isOpen={viewUserOpen} onClose={() => setViewUserOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>User Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedUser ? (
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3} fontSize="sm">
                <Box><b>ID:</b> {selectedUser._id}</Box>
                <Box><b>Username:</b> {selectedUser.username || "—"}</Box>
                <Box><b>Email:</b> {selectedUser.email || "—"}</Box>
                <Box><b>Name:</b> {(selectedUser.firstName || "") + " " + (selectedUser.lastName || "")}</Box>
                <Box><b>Admin:</b> {selectedUser.isAdmin ? "Yes" : "No"}</Box>
                <Box><b>Joined:</b> {fmtDate(selectedUser.createdAt)}</Box>
              </SimpleGrid>
            ) : <Text>No user selected.</Text>}
          </ModalBody>
          <ModalFooter><Button onClick={() => setViewUserOpen(false)}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit User */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <FormControl><FormLabel>Username</FormLabel><Input name="username" value={editFormData.username} onChange={onEditField} /></FormControl>
              <FormControl><FormLabel>Email</FormLabel><Input name="email" value={editFormData.email} onChange={onEditField} /></FormControl>
              <HStack>
                <FormControl><FormLabel>First Name</FormLabel><Input name="firstName" value={editFormData.firstName} onChange={onEditField} /></FormControl>
                <FormControl><FormLabel>Last Name</FormLabel><Input name="lastName" value={editFormData.lastName} onChange={onEditField} /></FormControl>
              </HStack>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Admin</FormLabel>
                <Switch name="isAdmin" isChecked={!!editFormData.isAdmin} onChange={(e) => onEditField({ target: { name: "isAdmin", value: e.target.checked, type: "checkbox" } })} />
              </FormControl>
              <Divider />
              <HStack>
                <FormControl><FormLabel>New Password</FormLabel><Input name="newPassword" type="password" value={editFormData.newPassword} onChange={onEditField} /></FormControl>
                <FormControl><FormLabel>Confirm</FormLabel><Input name="confirmNewPassword" type="password" value={editFormData.confirmNewPassword} onChange={onEditField} /></FormControl>
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button onClick={() => setEditOpen(false)} variant="ghost">Cancel</Button>
              <Button colorScheme="brandPrimary" onClick={saveUserEdits}>Save</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete User */}
      <Modal isOpen={deleteUserOpen} onClose={() => setDeleteUserOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedUser ? (
              <Text>Are you sure you want to delete <b>{selectedUser.username || selectedUser.email}</b>? This can’t be undone.</Text>
            ) : <Text>No user selected.</Text>}
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button onClick={() => setDeleteUserOpen(false)} variant="ghost">Cancel</Button>
              <Button colorScheme="red" onClick={confirmDeleteUser}>Delete</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View Order */}
      <Modal isOpen={viewOrderOpen} onClose={() => setViewOrderOpen(false)} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Order Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {loadingSelectedOrder ? (
              <VStack p={6}><Spinner /></VStack>
            ) : selectedOrder ? (
              <VStack align="stretch" spacing={4}>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} fontSize="sm">
                  <Box><b>Order ID:</b> {selectedOrder._id}</Box>
                  <Box><b>Placed:</b> {fmtDate(selectedOrder.createdAt)}</Box>
                  <Box><b>Total:</b> {money(selectedOrder.totalAmount)}</Box>
                  <Box><b>Status:</b> {selectedOrder.orderStatus}</Box>
                  <Box><b>Payment:</b> {selectedOrder.paymentStatus}</Box>
                  <Box><b>Customer:</b> {selectedOrder.user?.email}</Box>
                </SimpleGrid>
                <Divider />
                <Heading size="sm">Items</Heading>
                <Table size="sm" variant="simple">
                  <Thead><Tr><Th>Item</Th><Th isNumeric>Qty</Th><Th isNumeric>Price</Th></Tr></Thead>
                  <Tbody>
                    {(selectedOrder.orderItems || []).map((it, idx) => (
                      <Tr key={idx}>
                        <Td>{it.name || it.product?.name || "Item"}</Td>
                        <Td isNumeric>{it.qty || it.quantity || 1}</Td>
                        <Td isNumeric>{money(it.price)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </VStack>
            ) : <Text>Order not found.</Text>}
          </ModalBody>
          <ModalFooter><Button onClick={() => setViewOrderOpen(false)}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Order */}
      <Modal isOpen={deleteOrderOpen} onClose={() => setDeleteOrderOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Order</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {orderToDelete ? <Text>Delete order <b>{shortId(orderToDelete._id)}</b>?</Text> : <Text>No order selected.</Text>}
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button onClick={() => setDeleteOrderOpen(false)} variant="ghost">Cancel</Button>
              <Button colorScheme="red" onClick={confirmDeleteOrder}>Delete</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View Design */}
      <Modal isOpen={viewDesignOpen} onClose={() => setViewDesignOpen(false)} size="2xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Design</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedDesign ? (
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" color="whiteAlpha.800">{selectedDesign.prompt || "—"}</Text>
                <AspectRatio ratio={1}>
                  <Image
                    src={selectedDesign.publicUrl || selectedDesign.imageDataUrl || selectedDesign.thumbUrl}
                    alt="design"
                    objectFit="contain"
                    borderRadius="lg"
                  />
                </AspectRatio>
              </VStack>
            ) : <Text>No design selected.</Text>}
          </ModalBody>
          <ModalFooter><Button onClick={() => setViewDesignOpen(false)}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Design */}
      <Modal isOpen={deleteDesignOpen} onClose={() => setDeleteDesignOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Design</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {designToDelete ? <Text>Delete this design? This can’t be undone.</Text> : <Text>No design selected.</Text>}
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button onClick={() => setDeleteDesignOpen(false)} variant="ghost">Cancel</Button>
              <Button colorScheme="red" onClick={confirmDeleteDesign}>Delete</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Device Info */}
      <Modal isOpen={deviceOpen} onClose={() => setDeviceOpen(false)} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Device / Client</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {deviceDetail ? (
              <VStack align="stretch" spacing={3} fontSize="sm">
                <Box><b>User:</b> {deviceDetail.user?.username || "(unknown)"} {deviceDetail.user?.email ? ` <${deviceDetail.user.email}>` : ""}</Box>
                <Box><b>Session ID:</b> {deviceDetail.jti}</Box>
                <Box><b>IP:</b> {deviceDetail.ip || "—"}</Box>
                <Box><b>User Agent:</b> {deviceDetail.userAgent || "—"}</Box>
                <Box><b>Created:</b> {fmtDate(deviceDetail.createdAt)}</Box>
                <Box><b>Last Seen:</b> {fmtDate(deviceDetail.lastSeenAt || deviceDetail.createdAt)}</Box>
                <Box><b>Expires:</b> {fmtDate(deviceDetail.expiresAt)}</Box>
                <Divider />
                <Box><b>Client Hints:</b></Box>
                <Box as="pre" whiteSpace="pre-wrap" fontFamily="mono">
                  {JSON.stringify(deviceDetail.client || {}, null, 2)}
                </Box>
              </VStack>
            ) : <Text>No session selected.</Text>}
          </ModalBody>
          <ModalFooter><Button onClick={() => setDeviceOpen(false)}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
