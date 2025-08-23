import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Heading, Text, VStack, Tabs, TabList, TabPanels, Tab, TabPanel, Icon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Spinner, Alert, AlertIcon,
  Button, useToast, Tag, Image, Select,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure,
  FormControl, FormLabel, Input, Switch, InputGroup, InputRightElement, IconButton as ChakraIconButton,
  Divider, Tooltip, Grid, GridItem, Flex, HStack, Badge, Code, Checkbox, Menu, MenuButton, MenuList, MenuItem
} from "@chakra-ui/react";
import {
  FaUsersCog, FaBoxOpen, FaPalette, FaEdit, FaTrashAlt, FaEye,
  FaWarehouse, FaTachometerAlt, FaInfoCircle, FaSync, FaUserSlash, FaKey, FaCopy, FaChevronDown
} from "react-icons/fa";

import { client, setAuthHeader } from "../api/client";
import { useAuth } from "../context/AuthProvider";
import InventoryPanel from "../components/admin/InventoryPanel.jsx";
import AdminDashboard from "./admin/AdminDashboard.jsx";
import AdminAuditLogs from "./AdminAuditLogs.jsx";

/* ---------- utils ---------- */
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

  /* ---------- Users ---------- */
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  /* ---------- Orders ---------- */
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingSelectedOrder, setLoadingSelectedOrder] = useState(false);

  /* ---------- Designs ---------- */
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [designsError, setDesignsError] = useState("");
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [designToDelete, setDesignToDelete] = useState(null);

  /* ---------- Sessions / Devices ---------- */
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [sessionsPage] = useState(1);

  // Bulk selection
  const [selectedJtis, setSelectedJtis] = useState([]);
  const allChecked = sessions.length > 0 && selectedJtis.length === sessions.length;
  const isIndeterminate = selectedJtis.length > 0 && selectedJtis.length < sessions.length;

  // Auto-refresh
  const [autoRefreshMs, setAutoRefreshMs] = useState(0);
  const autoRefTimer = useRef(null);

  // Device info modal
  const { isOpen: isDeviceInfoOpen, onOpen: onDeviceInfoOpen, onClose: onDeviceInfoClose } = useDisclosure();
  const [deviceDetail, setDeviceDetail] = useState(null);

  // Audit logs
  const [auditsLoaded, setAuditsLoaded] = useState(false);

  /* ---------- Modal controls ---------- */
  const { isOpen: isViewUserModalOpen, onOpen: onViewUserModalOpen, onClose: onViewUserModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isDeleteUserModalOpen, onOpen: onDeleteUserModalOpen, onClose: onDeleteUserModalClose } = useDisclosure();

  const { isOpen: isViewOrderModalOpen, onOpen: onOpenViewOrderModal, onClose: onCloseViewOrderModal } = useDisclosure();
  const { isOpen: isDeleteOrderModalOpen, onOpen: onDeleteOrderModalOpen, onClose: onDeleteOrderModalClose } = useDisclosure();
  const [orderToDelete, setOrderToDelete] = useState(null);

  const { isOpen: isViewDesignModalOpen, onOpen: onOpenViewDesignModal, onClose: onCloseViewDesignModal } = useDisclosure();

  /* ---------- Edit form ---------- */
  const [editFormData, setEditFormData] = useState({
    username: "", email: "", firstName: "", lastName: "", isAdmin: false, newPassword: "", confirmNewPassword: ""
  });
  const [showNewPasswordInModal, setShowNewPasswordInModal] = useState(false);
  const [showConfirmNewPasswordInModal, setShowConfirmNewPasswordInModal] = useState(false);

  /* ---------- Fetchers ---------- */
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
      const { data } = await client.get("/admin/sessions", {
        params: { page: sessionsPage, limit: 100, activeOnly: true }
      });
      const items = data?.items || [];
      setSessions(items);
      // prune selected if gone
      setSelectedJtis((sel) => sel.filter((id) => items.some((s) => s.jti === id)));
    } catch {
      setSessionsError("Failed to fetch sessions");
    } finally { setLoadingSessions(false); }
  }, [sessionsPage]);

  /* ---------- Auto-refresh effect ---------- */
  useEffect(() => {
    if (autoRefTimer.current) {
      clearInterval(autoRefTimer.current);
      autoRefTimer.current = null;
    }
    if (autoRefreshMs > 0) {
      autoRefTimer.current = setInterval(() => { fetchSessions(); }, autoRefreshMs);
    }
    return () => { if (autoRefTimer.current) clearInterval(autoRefTimer.current); };
  }, [autoRefreshMs, fetchSessions]);

  /* ---------- Tab change -> lazy fetch ---------- */
  const dataFetchers = {
    0: null,
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

  /* ---------- Users actions ---------- */
  const handleViewUser = (user) => { setSelectedUser(user); onViewUserModalOpen(); };
  const handleOpenEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      username: user.username || "", email: user.email || "", firstName: user.firstName || "", lastName: user.lastName || "",
      isAdmin: !!user.isAdmin, newPassword: "", confirmNewPassword: ""
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

  /* ---------- Orders actions ---------- */
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

  /* ---------- Designs actions ---------- */
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

  /* ---------- Devices actions ---------- */
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

      // if this was MY session, log me out now
      const mySession = localStorage.getItem(SESSION_KEY);
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

      const mine = localStorage.getItem(SESSION_KEY);
      if (mine) return forceKickToLogin();

      await fetchSessions();
    } catch {
      toast({ title: "Failed to revoke user sessions", status: "error" });
    }
  };

  const toggleSelectAll = (checked) => {
    setSelectedJtis(checked ? sessions.map((s) => s.jti) : []);
  };
  const toggleSelectOne = (jti, checked) => {
    setSelectedJtis((sel) => {
      const set = new Set(sel);
      if (checked) set.add(jti); else set.delete(jti);
      return Array.from(set);
    });
  };
  const revokeSelected = async () => {
    if (!selectedJtis.length) return;
    const toRevoke = [...selectedJtis];
    setSelectedJtis([]); // optimistic clear
    try {
      // revoke sequentially to keep server happy
      for (const jti of toRevoke) {
        // swallow individual errors but keep going
        try { await client.delete(`/admin/sessions/${jti}`); } catch {}
      }
      toast({ title: `Revoked ${toRevoke.length} session${toRevoke.length > 1 ? "s" : ""}`, status: "success" });
      await fetchSessions();
    } catch {
      toast({ title: "Bulk revoke failed", status: "error" });
    }
  };

  const copySelectedJtis = async () => {
    try {
      await navigator.clipboard.writeText(selectedJtis.join("\n"));
      toast({ title: "Copied JTIs", status: "success", duration: 1200 });
    } catch {
      toast({ title: "Copy failed", status: "error" });
    }
  };

  /* ---------- Panels ---------- */

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
        <TableContainer w="100%" overflowX="auto" borderRadius="md" borderWidth="1px" borderColor="rgba(0,0,0,0.08)">
          <Table variant="simple" size="sm" w="100%" tableLayout="fixed">
            <Thead position="sticky" top={0} zIndex={1} bg="brand.cardBlue">
              <Tr>
                <Th w="140px">ID</Th>
                <Th w="180px">Username</Th>
                <Th w="240px">Email</Th>
                <Th w="200px">Name</Th>
                <Th w="100px">Admin</Th>
                <Th w="160px">Joined</Th>
                <Th w="150px">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {users.map((user) => (
                <Tr key={user._id}>
                  <Td fontSize="xs" title={user._id} noOfLines={1}>{String(user._id).substring(0, 8)}…</Td>
                  <Td noOfLines={1}>{user.username}</Td>
                  <Td noOfLines={1}>{user.email}</Td>
                  <Td noOfLines={1}>{`${user.firstName || ""} ${user.lastName || ""}`.trim()}</Td>
                  <Td><Tag size="sm" colorScheme={user.isAdmin ? "green" : "gray"}>{user.isAdmin ? "Yes" : "No"}</Tag></Td>
                  <Td noOfLines={1}>{fmtDate(user.createdAt)}</Td>
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
          <TableContainer w="100%" overflowX="auto" borderRadius="md" borderWidth="1px" borderColor="rgba(0,0,0,0.08)">
            <Table variant="simple" size="sm" w="100%" tableLayout="fixed">
              <Thead position="sticky" top={0} zIndex={1} bg="brand.cardBlue">
                <Tr>
                  <Th w="140px">ID</Th>
                  <Th w="220px">User</Th>
                  <Th w="160px">Date</Th>
                  <Th w="100px">Total</Th>
                  <Th w="140px">Pay Status</Th>
                  <Th w="160px">Order Status</Th>
                  <Th w="90px">Items</Th>
                  <Th w="150px">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {orders.map((order) => (
                  <Tr key={order._id}>
                    <Td fontSize="xs" noOfLines={1}>{String(order._id).substring(0, 8)}…</Td>
                    <Td noOfLines={1}>{order.user?.email}</Td>
                    <Td noOfLines={1}>{fmtDate(order.createdAt)}</Td>
                    <Td noOfLines={1}>{money(order.totalAmount)}</Td>
                    <Td><Tag size="sm" colorScheme={order.paymentStatus === "Succeeded" ? "green" : "orange"}>{order.paymentStatus}</Tag></Td>
                    <Td>
                      <Select
                        size="xs"
                        variant="outline"
                        color="brand.textDark"
                        value={order.orderStatus}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        bg={getStatusColor(order.orderStatus)}
                        borderRadius="md"
                        maxW="140px"
                      >
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </Select>
                    </Td>
                    <Td noOfLines={1}>{order.orderItems?.length || 0}</Td>
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
        <TableContainer w="100%" overflowX="auto" borderRadius="md" borderWidth="1px" borderColor="rgba(0,0,0,0.08)">
          <Table variant="simple" size="sm" w="100%" tableLayout="fixed">
            <Thead position="sticky" top={0} zIndex={1} bg="brand.cardBlue">
              <Tr>
                <Th w="90px">Preview</Th>
                <Th w="380px">Prompt</Th>
                <Th w="220px">Meta</Th>
                <Th w="180px">Creator</Th>
                <Th w="140px">Created</Th>
                <Th w="150px">Votes (Month)</Th>
                <Th w="140px">Actions</Th>
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
                    <Td>
                      {previewSrc ? (
                        <Image src={previewSrc} boxSize="56px" objectFit="cover" borderRadius="md" />
                      ) : (
                        <Box boxSize="56px" borderWidth="1px" borderRadius="md" />
                      )}
                    </Td>
                    <Td fontSize="xs" whiteSpace="normal">{design.prompt}</Td>
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
                    <Td noOfLines={1}>{design.user?.username || "N/A"}</Td>
                    <Td noOfLines={1}>{new Date(design.createdAt).toLocaleDateString()}</Td>
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

  const DevicesPanel = () => {
    const refreshLabel = useMemo(() => {
      if (!autoRefreshMs) return "Auto-refresh: Off";
      if (autoRefreshMs === 5000) return "Auto-refresh: 5s";
      if (autoRefreshMs === 10000) return "Auto-refresh: 10s";
      if (autoRefreshMs === 30000) return "Auto-refresh: 30s";
      if (autoRefreshMs === 60000) return "Auto-refresh: 60s";
      return `Auto-refresh: ${Math.round(autoRefreshMs / 1000)}s`;
    }, [autoRefreshMs]);

    return (
      <Box p={{ base: 2, md: 4 }} layerStyle="cardBlue" w="100%">
        <HStack justify="space-between" mb={3} flexWrap="wrap" gap={2}>
          <Heading size="md">Devices / Active Sessions</Heading>
          <HStack>
            <Menu>
              <MenuButton as={Button} size="sm" rightIcon={<FaChevronDown />}>
                {refreshLabel}
              </MenuButton>
              <MenuList>
                <MenuItem onClick={() => setAutoRefreshMs(0)}>Off</MenuItem>
                <MenuItem onClick={() => setAutoRefreshMs(5000)}>Every 5s</MenuItem>
                <MenuItem onClick={() => setAutoRefreshMs(10000)}>Every 10s</MenuItem>
                <MenuItem onClick={() => setAutoRefreshMs(30000)}>Every 30s</MenuItem>
                <MenuItem onClick={() => setAutoRefreshMs(60000)}>Every 60s</MenuItem>
              </MenuList>
            </Menu>
            <Button leftIcon={<FaSync />} size="sm" onClick={fetchSessions} isLoading={loadingSessions}>
              Refresh
            </Button>
          </HStack>
        </HStack>

        {/* Bulk actions toolbar */}
        {selectedJtis.length > 0 && (
          <HStack mb={3} spacing={2} flexWrap="wrap">
            <Tag colorScheme="yellow">{selectedJtis.length} selected</Tag>
            <Button size="sm" colorScheme="red" onClick={revokeSelected}>Revoke selected</Button>
            <Button size="sm" variant="outline" leftIcon={<FaCopy />} onClick={copySelectedJtis}>Copy JTIs</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedJtis([])}>Clear</Button>
          </HStack>
        )}

        {loadingSessions ? (
          <VStack p={10}><Spinner /></VStack>
        ) : sessionsError ? (
          <Alert status="error"><AlertIcon />{sessionsError}</Alert>
        ) : (
          <TableContainer w="100%" overflowX="auto" borderRadius="md" borderWidth="1px" borderColor="rgba(0,0,0,0.08)">
            <Table size="sm" variant="simple" w="100%" tableLayout="fixed">
              <Thead position="sticky" top={0} zIndex={1} bg="brand.cardBlue">
                <Tr>
                  <Th w="36px">
                    <Checkbox
                      isChecked={allChecked}
                      isIndeterminate={isIndeterminate}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      aria-label="Select all"
                    />
                  </Th>
                  <Th w="240px">User</Th>
                  <Th w="180px">Session ID</Th>
                  <Th w="130px">IP</Th>
                  <Th w="360px">User Agent</Th>
                  <Th w="160px">Created</Th>
                  <Th w="160px">Last Seen</Th>
                  <Th w="160px">Expires</Th>
                  <Th w="120px">Status</Th>
                  <Th w="150px" isNumeric>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {sessions.map((i) => {
                  const checked = selectedJtis.includes(i.jti);
                  return (
                    <Tr key={i.jti} bg={checked ? "yellow.50" : undefined}>
                      <Td>
                        <Checkbox
                          isChecked={checked}
                          onChange={(e) => toggleSelectOne(i.jti, e.target.checked)}
                          aria-label="Select row"
                        />
                      </Td>
                      <Td>
                        <Text fontWeight="bold" noOfLines={1}>{i.user?.username || "(unknown)"}</Text>
                        <Text fontSize="xs" color="gray.500" noOfLines={1}>{i.user?.email}</Text>
                        {i.user?._id && (
                          <Tooltip label="Revoke ALL for this user">
                            <ChakraIconButton
                              ml={2}
                              size="xs"
                              icon={<FaUserSlash />}
                              aria-label="Revoke all for user"
                              onClick={() => revokeAllForUser(i.user?._id)}
                              variant="ghost"
                            />
                          </Tooltip>
                        )}
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Tooltip label={i.jti}>
                            <Code fontSize="xs">{shortId(i.jti)}</Code>
                          </Tooltip>
                          <Tooltip label="Copy full Session ID">
                            <ChakraIconButton
                              aria-label="Copy"
                              icon={<FaCopy />}
                              size="xs"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(i.jti);
                                toast({ title: "Session ID copied", status: "success", duration: 1200 });
                              }}
                            />
                          </Tooltip>
                        </HStack>
                      </Td>
                      <Td noOfLines={1}>{i.ip || "—"}</Td>
                      <Td>
                        <Text noOfLines={1} title={i.userAgent}>{i.userAgent || "—"}</Text>
                      </Td>
                      <Td noOfLines={1}>{fmtDate(i.createdAt)}</Td>
                      <Td noOfLines={1}>{fmtDate(i.lastSeenAt || i.createdAt)}</Td>
                      <Td noOfLines={1}>{fmtDate(i.expiresAt)}</Td>
                      <Td>
                        {i.revokedAt
                          ? <Badge colorScheme="red">Revoked</Badge>
                          : (new Date(i.expiresAt) < new Date() ? <Badge>Expired</Badge> : <Badge colorScheme="green">Active</Badge>)
                        }
                      </Td>
                      <Td isNumeric>
                        <HStack justify="flex-end" spacing={1}>
                          <Tooltip label="Info">
                            <ChakraIconButton
                              size="sm"
                              icon={<FaInfoCircle />}
                              aria-label="Info"
                              variant="ghost"
                              onClick={() => { setDeviceDetail(i); onDeviceInfoOpen(); }}
                            />
                          </Tooltip>
                          {!i.revokedAt && (
                            <Tooltip label="Revoke this session">
                              <ChakraIconButton
                                size="sm"
                                icon={<FaTrashAlt />}
                                aria-label="Revoke"
                                onClick={() => revokeSession(i.jti)}
                                variant="ghost"
                              />
                            </Tooltip>
                          )}
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>
        )}

        {/* Device info modal */}
        <Modal isOpen={isDeviceInfoOpen} onClose={onDeviceInfoClose} size="lg" isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Device / Client Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {deviceDetail && (
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
              )}
            </ModalBody>
            <ModalFooter>
              <Button onClick={onDeviceInfoClose}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    );
  };

  // Auto-populate devices when visiting the tab the first time
  useEffect(() => {
    if (tabIndex === 5 && sessions.length === 0 && !loadingSessions) fetchSessions();
  }, [tabIndex, sessions.length, loadingSessions, fetchSessions]);

  /* ---------- Render ---------- */
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

      {/* ------- User + Order + Design Modals below ------- */}

      {/* View User */}
      <Modal isOpen={isViewUserModalOpen} onClose={onViewUserModalClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>User Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedUser ? (
              <VStack align="stretch" spacing={2} fontSize="sm">
                <Box><b>ID:</b> {selectedUser._id}</Box>
                <Box><b>Username:</b> {selectedUser.username || "—"}</Box>
                <Box><b>Email:</b> {selectedUser.email || "—"}</Box>
                <Box><b>Name:</b> {(selectedUser.firstName || "") + " " + (selectedUser.lastName || "")}</Box>
                <Box><b>Admin:</b> {selectedUser.isAdmin ? "Yes" : "No"}</Box>
                <Box><b>Joined:</b> {fmtDate(selectedUser.createdAt)}</Box>
              </VStack>
            ) : <Text>No user selected</Text>}
          </ModalBody>
          <ModalFooter><Button onClick={onViewUserModalClose}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit User */}
      <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <FormControl><FormLabel>Username</FormLabel><Input name="username" value={editFormData.username} onChange={handleEditFormChange} /></FormControl>
              <FormControl><FormLabel>Email</FormLabel><Input name="email" value={editFormData.email} onChange={handleEditFormChange} /></FormControl>
              <HStack>
                <FormControl><FormLabel>First Name</FormLabel><Input name="firstName" value={editFormData.firstName} onChange={handleEditFormChange} /></FormControl>
                <FormControl><FormLabel>Last Name</FormLabel><Input name="lastName" value={editFormData.lastName} onChange={handleEditFormChange} /></FormControl>
              </HStack>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Admin</FormLabel>
                <Switch name="isAdmin" isChecked={!!editFormData.isAdmin} onChange={(e) => handleEditFormChange({ target: { name: "isAdmin", value: e.target.checked, type: "switch" } })} />
              </FormControl>
              <Divider />
              <HStack>
                <FormControl>
                  <FormLabel>New Password</FormLabel>
                  <InputGroup>
                    <Input name="newPassword" type={showNewPasswordInModal ? "text" : "password"} value={editFormData.newPassword} onChange={handleEditFormChange} />
                    <InputRightElement width="4.5rem">
                      <Button h="1.75rem" size="sm" onClick={() => setShowNewPasswordInModal(v=>!v)}>
                        {showNewPasswordInModal ? "Hide" : "Show"}
                      </Button>
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
                <FormControl>
                  <FormLabel>Confirm</FormLabel>
                  <InputGroup>
                    <Input name="confirmNewPassword" type={showConfirmNewPasswordInModal ? "text" : "password"} value={editFormData.confirmNewPassword} onChange={handleEditFormChange} />
                    <InputRightElement width="4.5rem">
                      <Button h="1.75rem" size="sm" onClick={() => setShowConfirmNewPasswordInModal(v=>!v)}>
                        {showConfirmNewPasswordInModal ? "Hide" : "Show"}
                      </Button>
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button variant="ghost" onClick={onEditModalClose}>Cancel</Button>
              <Button colorScheme="brandPrimary" onClick={handleSaveChanges}>Save</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete User */}
      <Modal isOpen={isDeleteUserModalOpen} onClose={onDeleteUserModalClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedUser ? <Text>Delete user <b>{selectedUser.username || selectedUser.email}</b>? This cannot be undone.</Text> : <Text>No user selected.</Text>}
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button variant="ghost" onClick={onDeleteUserModalClose}>Cancel</Button>
              <Button colorScheme="red" onClick={confirmDeleteUser}>Delete</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View Order */}
      <Modal isOpen={isViewOrderModalOpen} onClose={onCloseViewOrderModal} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Order Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {loadingSelectedOrder ? (
              <VStack p={8}><Spinner /></VStack>
            ) : selectedOrder ? (
              <VStack align="stretch" spacing={4}>
                <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={3} fontSize="sm">
                  <GridItem><b>Order ID:</b> {selectedOrder._id}</GridItem>
                  <GridItem><b>Placed:</b> {fmtDate(selectedOrder.createdAt)}</GridItem>
                  <GridItem><b>Total:</b> {money(selectedOrder.totalAmount)}</GridItem>
                  <GridItem><b>Status:</b> {selectedOrder.orderStatus}</GridItem>
                  <GridItem><b>Payment:</b> {selectedOrder.paymentStatus}</GridItem>
                  <GridItem><b>Customer:</b> {selectedOrder.user?.email}</GridItem>
                </Grid>
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
          <ModalFooter><Button onClick={onCloseViewOrderModal}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Order */}
      <Modal isOpen={isDeleteOrderModalOpen} onClose={onDeleteOrderModalClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Order</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {orderToDelete ? <Text>Delete order <b>{shortId(orderToDelete._id)}</b>?</Text> : <Text>No order selected.</Text>}
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button variant="ghost" onClick={onDeleteOrderModalClose}>Cancel</Button>
              <Button colorScheme="red" onClick={confirmDeleteOrder}>Delete</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View Design */}
      <Modal isOpen={isViewDesignModalOpen} onClose={onCloseViewDesignModal} size="2xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Design</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedDesign ? (
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" color="whiteAlpha.800">{selectedDesign.prompt || "—"}</Text>
                <Image
                  src={selectedDesign.publicUrl || selectedDesign.imageDataUrl || selectedDesign.thumbUrl}
                  alt="design"
                  objectFit="contain"
                  borderRadius="lg"
                />
              </VStack>
            ) : <Text>No design selected.</Text>}
          </ModalBody>
          <ModalFooter><Button onClick={onCloseViewDesignModal}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Design */}
      <Modal isOpen={!!designToDelete} onClose={() => setDesignToDelete(null)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Design</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {designToDelete ? <Text>Delete this design? This can’t be undone.</Text> : <Text>No design selected.</Text>}
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button variant="ghost" onClick={() => setDesignToDelete(null)}>Cancel</Button>
              <Button colorScheme="red" onClick={confirmDeleteDesign}>Delete</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
