// frontend/src/pages/AdminPage.jsx
import React, { useCallback, useEffect, useState } from "react";
import {
  Box, Heading, Text, VStack, Tabs, TabList, TabPanels, Tab, TabPanel, Icon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Spinner, Alert, AlertIcon,
  Button, useToast, Tag, Image, Select,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure,
  FormControl, FormLabel, Input, Switch, InputGroup, InputRightElement, IconButton as ChakraIconButton,
  Divider, Tooltip, Grid, GridItem, Flex, HStack, Badge
} from "@chakra-ui/react";
import {
  FaUsersCog, FaBoxOpen, FaPalette, FaEdit, FaTrashAlt, FaEye,
  FaWarehouse, FaTachometerAlt, FaInfoCircle, FaSync, FaUserSlash, FaKey
} from "react-icons/fa";

import { client, setAuthHeader } from "../api/client";
import { useAuth } from "../context/AuthProvider";
import InventoryPanel from "../components/admin/InventoryPanel.jsx";
import AdminDashboard from "./admin/AdminDashboard.jsx";
import AdminAuditLogs from "./AdminAuditLogs.jsx";

// helpers
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");
const money = (c) => (typeof c === "number" ? `$${(c / 100).toFixed(2)}` : "—");
const monthName = (yyyymm) => {
  if (!yyyymm || typeof yyyymm !== "string" || yyyymm.length !== 7) return "N/A";
  const [y, m] = yyyymm.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1, 1);
  return date.toLocaleString("default", { month: "short", year: "numeric" });
};

export default function AdminPage() {
  const toast = useToast();
  const { token } = useAuth();
  useEffect(() => { setAuthHeader(token); }, [token]);

  const [tabIndex, setTabIndex] = useState(0);

  // Users
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  // Orders
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingSelectedOrder, setLoadingSelectedOrder] = useState(false);

  // Designs
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [designsError, setDesignsError] = useState("");

  // Devices / Sessions
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [sessionsPage] = useState(1);

  // Audit logs
  const [auditsLoaded, setAuditsLoaded] = useState(false);

  // Modals
  const { isOpen: isViewUserModalOpen, onOpen: onViewUserModalOpen, onClose: onViewUserModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isDeleteUserModalOpen, onOpen: onDeleteUserModalOpen, onClose: onDeleteUserModalClose } = useDisclosure();
  const { isOpen: isViewOrderModalOpen, onOpen: onOpenViewOrderModal, onClose: onCloseViewOrderModal } = useDisclosure();
  const { isOpen: isDeleteOrderModalOpen, onOpen: onDeleteOrderModalOpen, onClose: onDeleteOrderModalClose } = useDisclosure();
  const { isOpen: isViewDesignModalOpen, onOpen: onOpenViewDesignModal, onClose: onCloseViewDesignModal } = useDisclosure();
  const { isOpen: isDeleteDesignModalOpen, onOpen: onOpenDeleteDesignModal, onClose: onCloseDeleteDesignModal } = useDisclosure();

  const [orderToDelete, setOrderToDelete] = useState(null);
  const [designToDelete, setDesignToDelete] = useState(null);

  const [editFormData, setEditFormData] = useState({
    username: "", email: "", firstName: "", lastName: "", isAdmin: false, newPassword: "", confirmNewPassword: ""
  });
  const [showNewPasswordInModal, setShowNewPasswordInModal] = useState(false);
  const [showConfirmNewPasswordInModal, setShowConfirmNewPasswordInModal] = useState(false);

  // ---------- Fetchers ----------
  const fetchUsers = useCallback(async () => {
    if (users.length > 0) return;
    setLoadingUsers(true); setUsersError("");
    try {
      const { data } = await client.get("/admin/users");
      setUsers(Array.isArray(data) ? data : (data?.items || []));
    } catch {
      setUsersError("Failed to fetch users");
    } finally { setLoadingUsers(false); }
  }, [users.length]);

  const fetchOrders = useCallback(async () => {
    if (orders.length > 0) return;
    setLoadingOrders(true); setOrdersError("");
    try {
      const { data } = await client.get("/admin/orders");
      setOrders(Array.isArray(data) ? data : (data?.items || []));
    } catch {
      setOrdersError("Failed to fetch orders");
    } finally { setLoadingOrders(false); }
  }, [orders.length]);

  const fetchDesigns = useCallback(async () => {
    if (designs.length > 0) return;
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
      const { data } = await client.get("/admin/sessions", { params: { page: sessionsPage, limit: 100, activeOnly: true } });
      setSessions(data?.items || []);
    } catch {
      setSessionsError("Failed to fetch sessions");
    } finally { setLoadingSessions(false); }
  }, [sessionsPage]);

  // Tab -> loader
  const dataFetchers = {
    0: null,          // Dashboard handles itself
    1: fetchUsers,
    2: fetchOrders,
    3: fetchDesigns,
    4: null,          // Inventory loads internally
    5: fetchSessions, // Devices
    6: () => setAuditsLoaded(true),
  };
  const handleTabsChange = (index) => {
    setTabIndex(index);
    const f = dataFetchers[index];
    if (typeof f === "function") f();
  };

  // ---------- Users ----------
  const handleViewUser = (user) => { setSelectedUser(user); onViewUserModalOpen(); };
  const handleOpenEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      username: user.username, email: user.email, firstName: user.firstName || "", lastName: user.lastName || "",
      isAdmin: user.isAdmin, newPassword: "", confirmNewPassword: ""
    });
    onEditModalOpen();
  };
  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: type === "checkbox" || type === "switch" ? checked : value }));
  };
  const handleSaveChanges = async () => {
    if (!selectedUser) return;
    if (editFormData.newPassword && editFormData.newPassword !== editFormData.confirmNewPassword) {
      toast({ title: "Password Mismatch", status: "error" }); return;
    }
    const payload = { ...editFormData };
    if (!payload.newPassword) delete payload.newPassword;
    delete payload.confirmNewPassword;
    try {
      const { data: updatedUser } = await client.put(`/admin/users/${selectedUser._id}`, payload);
      toast({ title: "User Updated", status: "success" });
      setUsers((prev) => prev.map((u) => (u._id === updatedUser._id ? updatedUser : u)));
      onEditModalClose();
    } catch (e) {
      toast({ title: "Update Failed", description: e.response?.data?.message, status: "error" });
    }
  };
  const handleOpenDeleteUser = (user) => { setSelectedUser(user); onDeleteUserModalOpen(); };
  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await client.delete(`/admin/users/${selectedUser._id}`);
      toast({ title: "User Deleted", status: "success" });
      setUsers((prev) => prev.filter((u) => u._id !== selectedUser._id));
      onDeleteUserModalClose();
    } catch (e) {
      toast({ title: "Delete Failed", description: e.response?.data?.message, status: "error" });
    }
  };

  // ---------- Orders ----------
  const handleOpenDeleteOrderDialog = (order) => { setOrderToDelete(order); onDeleteOrderModalOpen(); };
  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      await client.delete(`/admin/orders/${orderToDelete._id}`);
      toast({ title: "Order Deleted", status: "success" });
      setOrders((prev) => prev.filter((o) => o._id !== orderToDelete._id));
      onDeleteOrderModalClose();
    } catch (e) {
      toast({ title: "Delete Failed", description: e.response?.data?.message, status: "error" });
      onDeleteOrderModalOpen();
    }
  };
  const handleViewOrder = async (orderId) => {
    setLoadingSelectedOrder(true); onOpenViewOrderModal();
    try {
      const { data } = await client.get(`/admin/orders/${orderId}`);
      setSelectedOrder(data);
    } catch (e) {
      toast({ title: "Error Fetching Order", description: e.response?.data?.message, status: "error" });
      onCloseViewOrderModal();
    } finally {
      setLoadingSelectedOrder(false);
    }
  };
  const handleStatusChange = async (orderId, newStatus) => {
    const original = [...orders];
    setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, orderStatus: newStatus } : o)));
    try {
      await client.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      toast({ title: "Status Updated", status: "success", duration: 2000 });
    } catch (e) {
      setOrders(original);
      toast({ title: "Update Failed", description: e.response?.data?.message, status: "error" });
    }
  };

  // ---------- Designs ----------
  const [selectedDesign, setSelectedDesign] = useState(null);
  const handleViewDesign = (design) => { setSelectedDesign(design); onOpenViewDesignModal(); };
  const handleOpenDeleteDesignDialog = (design) => { setDesignToDelete(design); onOpenDeleteDesignModal(); };
  const confirmDeleteDesign = async () => {
    if (!designToDelete) return;
    try {
      await client.delete(`/admin/designs/${designToDelete._id}`);
      toast({ title: "Design Deleted", status: "success" });
      setDesigns((prev) => prev.filter((d) => d._id !== designToDelete._id));
      onCloseDeleteDesignModal();
    } catch (e) {
      toast({ title: "Delete Failed", description: e.response?.data?.message, status: "error" });
    }
  };

  // ---------- Devices actions ----------
  const forceKickToLogin = () => {
    try {
      localStorage.removeItem("tftp_token");
      localStorage.removeItem("token");
      localStorage.removeItem("tftp_session");
    } catch {}
    delete client.defaults.headers.common.Authorization;
    delete client.defaults.headers.common["X-Session-Id"];
    window.location.assign("/login?redirect=/admin");
  };

  const revokeSession = async (jti) => {
    try {
      await client.delete(`/admin/sessions/${jti}`);
      toast({ title: "Session revoked", status: "success" });

      // if this was MY session, log me out now
      const mySession = localStorage.getItem("tftp_session");
      if (mySession && mySession === jti) return forceKickToLogin();

      await fetchSessions();
    } catch {
      toast({ title: "Failed to revoke session", status: "error" });
    }
  };
  const revokeAllForUser = async (userId) => {
    try {
      await client.delete(`/admin/sessions/user/${userId}`);
      toast({ title: "All sessions revoked for user", status: "success" });

      // if I revoked all for myself, logout now
      // (lightweight check: if any session belongs to me & equals stored sid)
      const mine = localStorage.getItem("tftp_session");
      if (mine) return forceKickToLogin();

      await fetchSessions();
    } catch {
      toast({ title: "Failed to revoke user sessions", status: "error" });
    }
  };

  // ---------- Panels (styled to match) ----------
  const UsersPanel = () => (
    <Box p={{ base: 2, md: 4 }} layerStyle="cardBlue" w="100%">
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="md">User Management</Heading>
        <Button size="sm" leftIcon={<FaSync />} onClick={() => { setUsers([]); fetchUsers(); }} isLoading={loadingUsers}>Refresh</Button>
      </HStack>
      {loadingUsers ? (
        <VStack p={10}><Spinner /></VStack>
      ) : usersError ? (
        <Alert status="error"><AlertIcon />{usersError}</Alert>
      ) : (
        <TableContainer w="100%">
          <Table variant="simple" size="sm" w="100%">
            <Thead>
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
              {users.map((user) => (
                <Tr key={user._id}>
                  <Td fontSize="xs" title={user._id}>{String(user._id).substring(0, 8)}...</Td>
                  <Td>{user.username}</Td>
                  <Td>{user.email}</Td>
                  <Td>{`${user.firstName || ""} ${user.lastName || ""}`.trim()}</Td>
                  <Td><Tag size="sm" colorScheme={user.isAdmin ? "green" : "gray"}>{user.isAdmin ? "Yes" : "No"}</Tag></Td>
                  <Td>{fmtDate(user.createdAt)}</Td>
                  <Td>
                    <Tooltip label="View User Details"><ChakraIconButton size="xs" variant="ghost" icon={<Icon as={FaEye} />} onClick={() => handleViewUser(user)} /></Tooltip>
                    <Tooltip label="Edit User"><ChakraIconButton size="xs" variant="ghost" icon={<Icon as={FaEdit} />} onClick={() => handleOpenEditUser(user)} /></Tooltip>
                    <Tooltip label="Delete User"><ChakraIconButton size="xs" variant="ghost" colorScheme="red" icon={<Icon as={FaTrashAlt} />} onClick={() => handleOpenDeleteUser(user)} /></Tooltip>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const OrdersPanel = () => {
    const getStatusColor = (status) => {
      if (status === "Delivered") return "green.200";
      if (status === "Shipped") return "blue.200";
      if (status === "Cancelled") return "red.200";
      return "gray.200";
    };
    return (
      <Box p={{ base: 2, md: 4 }} layerStyle="cardBlue" w="100%">
        <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
          <Heading size="md">Order Management</Heading>
          <Button size="sm" leftIcon={<FaSync />} onClick={() => { setOrders([]); fetchOrders(); }} isLoading={loadingOrders}>Refresh</Button>
        </HStack>
        {loadingOrders ? (
          <VStack p={10}><Spinner /></VStack>
        ) : ordersError ? (
          <Alert status="error"><AlertIcon />{ordersError}</Alert>
        ) : (
          <TableContainer w="100%">
            <Table variant="simple" size="sm" w="100%">
              <Thead>
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
                {orders.map((order) => (
                  <Tr key={order._id}>
                    <Td fontSize="xs">{String(order._id).substring(0, 8)}...</Td>
                    <Td>{order.user?.email}</Td>
                    <Td>{fmtDate(order.createdAt)}</Td>
                    <Td>{money(order.totalAmount)}</Td>
                    <Td><Tag size="sm" colorScheme={order.paymentStatus === "Succeeded" ? "green" : "orange"}>{order.paymentStatus}</Tag></Td>
                    <Td>
                      <Select size="xs" variant="outline" color="brand.textDark" value={order.orderStatus} onChange={(e) => handleStatusChange(order._id, e.target.value)} bg={getStatusColor(order.orderStatus)} borderRadius="md" maxW="140px">
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </Select>
                    </Td>
                    <Td>{order.orderItems?.length || 0}</Td>
                    <Td>
                      <Tooltip label="View Order Details"><ChakraIconButton size="xs" variant="ghost" icon={<Icon as={FaEye} />} onClick={() => handleViewOrder(order._id)} /></Tooltip>
                      <Tooltip label="Delete Order"><ChakraIconButton size="xs" variant="ghost" colorScheme="red" icon={<Icon as={FaTrashAlt} />} onClick={() => handleOpenDeleteOrderDialog(order)} /></Tooltip>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };

  const DesignsPanel = () => (
    <Box p={{ base: 2, md: 4 }} layerStyle="cardBlue" w="100%">
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="md">Design Management</Heading>
        <Button size="sm" leftIcon={<FaSync />} onClick={() => { setDesigns([]); fetchDesigns(); }} isLoading={loadingDesigns}>Refresh</Button>
      </HStack>
      {loadingDesigns ? (
        <VStack p={10}><Spinner /></VStack>
      ) : designsError ? (
        <Alert status="error"><AlertIcon />{designsError}</Alert>
      ) : (
        <TableContainer w="100%">
          <Table variant="simple" size="sm" w="100%">
            <Thead>
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
              {designs.map((design) => {
                const meta = design.settings || {};
                const mode = meta.mode || (meta.imageStrength != null ? "i2i" : "t2i");
                const ar = meta.aspectRatio || "—";
                const cfg = meta.cfgScale ?? "—";
                const stp = meta.steps ?? "—";
                const str = meta.imageStrength != null ? Math.round(meta.imageStrength * 100) + "%" : "—";
                const previewSrc = design.thumbUrl || design.publicUrl || design.imageDataUrl || "";
                return (
                  <Tr key={design._id}>
                    <Td>{previewSrc ? <Image src={previewSrc} boxSize="56px" objectFit="cover" borderRadius="md" /> : <Box boxSize="56px" borderWidth="1px" borderRadius="md" />}</Td>
                    <Td fontSize="xs" maxW="380px" whiteSpace="normal">{design.prompt}</Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <HStack spacing={2}>
                          <Badge colorScheme={mode === "i2i" ? "purple" : "blue"}>{mode.toUpperCase()}</Badge>
                          <Badge>{ar}</Badge>
                        </HStack>
                        <HStack spacing={3} fontSize="xs" color="whiteAlpha.800">
                          <Text>CFG {cfg}</Text>
                          <Text>Steps {stp}</Text>
                          <Text>Strength {str}</Text>
                        </HStack>
                      </VStack>
                    </Td>
                    <Td>{design.user?.username || "N/A"}</Td>
                    <Td>{new Date(design.createdAt).toLocaleDateString()}</Td>
                    <Td>
                      {design.isSubmittedForContest && design.contestSubmissionMonth ? (
                        <VStack align="center" spacing={0}>
                          <Tag size="sm" colorScheme="blue" borderRadius="full">{design.votes || 0} Votes</Tag>
                          <Text fontSize="xs" color="brand.textMuted">{monthName(design.contestSubmissionMonth)}</Text>
                        </VStack>
                      ) : (<Text fontSize="xs" color="brand.textMuted">N/A</Text>)}
                    </Td>
                    <Td>
                      <Tooltip label="View Design"><ChakraIconButton size="xs" variant="ghost" icon={<Icon as={FaEye} />} onClick={() => handleViewDesign(design)} /></Tooltip>
                      <Tooltip label="Delete Design"><ChakraIconButton size="xs" variant="ghost" colorScheme="red" icon={<Icon as={FaTrashAlt} />} onClick={() => handleOpenDeleteDesignDialog(design)} /></Tooltip>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const DevicesPanel = () => (
    <Box p={{ base: 2, md: 4 }} layerStyle="cardBlue" w="100%">
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="md">Devices / Active Sessions</Heading>
        <Button leftIcon={<FaSync />} size="sm" onClick={fetchSessions} isLoading={loadingSessions}>Refresh</Button>
      </HStack>

      {loadingSessions ? (
        <VStack p={10}><Spinner /></VStack>
      ) : sessionsError ? (
        <Alert status="error"><AlertIcon />{sessionsError}</Alert>
      ) : (
        <TableContainer w="100%">
          <Table size="sm" variant="simple" w="100%">
            <Thead>
              <Tr>
                <Th>User</Th>
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
                    {i.user?._id && (
                      <Tooltip label="Revoke ALL for this user">
                        <ChakraIconButton ml={2} size="xs" icon={<FaUserSlash />} aria-label="Revoke all" onClick={() => revokeAllForUser(i.user?._id)} />
                      </Tooltip>
                    )}
                  </Td>
                  <Td>{i.ip || "—"}</Td>
                  <Td><Text maxW="360px" noOfLines={1} title={i.userAgent}>{i.userAgent || "—"}</Text></Td>
                  <Td>{fmtDate(i.createdAt)}</Td>
                  <Td>{fmtDate(i.lastSeenAt || i.createdAt)}</Td>
                  <Td>{fmtDate(i.expiresAt)}</Td>
                  <Td>{i.revokedAt ? <Badge colorScheme="red">Revoked</Badge> : (new Date(i.expiresAt) < new Date() ? <Badge>Expired</Badge> : <Badge colorScheme="green">Active</Badge>)}</Td>
                  <Td isNumeric>
                    {!i.revokedAt && (
                      <Tooltip label="Revoke this session">
                        <ChakraIconButton size="sm" icon={<FaTrashAlt />} aria-label="Revoke" onClick={() => revokeSession(i.jti)} />
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

  // Auto-populate devices when visiting the tab the first time
  useEffect(() => {
    if (tabIndex === 5 && sessions.length === 0 && !loadingSessions) fetchSessions();
  }, [tabIndex, sessions.length, loadingSessions, fetchSessions]);

  return (
    <Box w="100%" pb={10}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="pageTitle" color="brand.textLight" w="100%">Admin Console</Heading>

        <Box bg="brand.paper" borderRadius="xl" shadow="xl" p={{ base: 2, md: 4 }} w="100%">
          <Tabs variant="soft-rounded" colorScheme="brandPrimary" isLazy onChange={handleTabsChange} index={tabIndex}>
            <TabList mb="1em" flexWrap="wrap">
              <Tab _selected={{ color: "white", bg: "brand.primary" }}><Icon as={FaTachometerAlt} mr={2} /> Dashboard</Tab>
              <Tab _selected={{ color: "white", bg: "brand.primary" }}><Icon as={FaUsersCog} mr={2} /> Users</Tab>
              <Tab _selected={{ color: "white", bg: "brand.primary" }}><Icon as={FaBoxOpen} mr={2} /> Orders</Tab>
              <Tab _selected={{ color: "white", bg: "brand.primary" }}><Icon as={FaPalette} mr={2} /> Designs</Tab>
              <Tab _selected={{ color: "white", bg: "brand.primary" }}><Icon as={FaWarehouse} mr={2} /> Inventory</Tab>
              <Tab _selected={{ color: "white", bg: "brand.primary" }}><Icon as={FaKey} mr={2} /> Devices</Tab>
              <Tab _selected={{ color: "white", bg: "brand.primary" }}><Icon as={FaInfoCircle} mr={2} /> Audit Logs</Tab>
            </TabList>

            <TabPanels>
              <TabPanel px={0} py={2}><AdminDashboard token={token} onViewOrder={handleViewOrder} /></TabPanel>
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

      {/* Modals … (unchanged from your version) */}
      {/* ... keep your modal code exactly as you pasted earlier ... */}
    </Box>
  );
}
