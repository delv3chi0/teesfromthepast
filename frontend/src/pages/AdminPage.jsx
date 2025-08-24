// frontend/src/pages/AdminPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Heading, Text, VStack, Tabs, TabList, TabPanels, Tab, TabPanel, Icon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Spinner, Alert, AlertIcon,
  Button, useToast, Tag, Image, Select,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure,
  FormControl, FormLabel, Input, Switch, InputGroup, InputRightElement, IconButton as ChakraIconButton,
  Divider, Tooltip, Flex, HStack, Badge, Code, Checkbox, Menu, MenuButton, MenuList, MenuItem
} from "@chakra-ui/react";
import {
  FaUsersCog, FaBoxOpen, FaPalette, FaEdit, FaTrashAlt, FaEye,
  FaWarehouse, FaTachometerAlt, FaInfoCircle, FaSync, FaUserSlash, FaKey, FaCopy, FaChevronDown,
  FaShieldAlt, FaTimesCircle, FaPaperPlane, FaIdBadge
} from "react-icons/fa";

import { client, setAuthHeader } from "../api/client";
import { useAuth } from "../context/AuthProvider";
import InventoryPanel from "../components/admin/InventoryPanel.jsx";
import AdminDashboard from "./admin/AdminDashboard.jsx";
import AdminAuditLogs from "./AdminAuditLogs.jsx";

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");
const money = (c) => (typeof c === "number" ? `$${(c / 100).toFixed(2)}` : "—");
const monthName = (yyyymm) => {
  if (!yyyymm || typeof yyyymm !== "string" || yyyymm.length !== 7) return "N/A";
  const [y, m] = yyyymm.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1, 1);
  return date.toLocaleString("default", { month: "short", year: "numeric" });
};
const shortId = (id) => (id ? String(id).slice(-6).toUpperCase() : "—");
const hasAddr = (a) => !!(a && (a.street1 || a.city || a.state || a.zipCode || a.country || a.recipientName));

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
  const [resendLoading, setResendLoading] = useState(false);

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
  // pagination for Designs
  const [designsVisible, setDesignsVisible] = useState(8);

  // Devices / Sessions
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [sessionsPage] = useState(1);

  // Bulk selection on Devices tab
  const [selectedJtis, setSelectedJtis] = useState([]);
  const allChecked = sessions.length > 0 && selectedJtis.length === sessions.length;
  const isIndeterminate = selectedJtis.length > 0 && selectedJtis.length < sessions.length;

  // Devices auto-refresh
  const [autoRefreshMs, setAutoRefreshMs] = useState(0);
  const autoRefTimer = useRef(null);

  // Audit logs
  const [auditsLoaded, setAuditsLoaded] = useState(false);

  // Modals
  const { isOpen: isViewUserModalOpen, onOpen: onViewUserModalOpen, onClose: onViewUserModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isDeleteUserModalOpen, onOpen: onDeleteUserModalOpen, onClose: onDeleteUserModalClose } = useDisclosure();
  const { isOpen: isViewOrderModalOpen, onOpen: onOpenViewOrderModal, onClose: onCloseViewOrderModal } = useDisclosure();
  const { isOpen: isDeleteOrderModalOpen, onOpen: onDeleteOrderModalOpen, onClose: onDeleteOrderModalClose } = useDisclosure();
  const { isOpen: isViewDesignModalOpen, onOpen: onOpenViewDesignModal, onClose: onCloseViewDesignModal } = useDisclosure();

  // Devices Info Modal
  const { isOpen: isDeviceInfoOpen, onOpen: onDeviceInfoOpen, onClose: onDeviceInfoClose } = useDisclosure();
  const [deviceDetail, setDeviceDetail] = useState(null);

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
      const { data } = await client.get("/admin/sessions", {
        params: { page: sessionsPage, limit: 100, activeOnly: true }
      });
      const items = data?.items || [];
      setSessions(items);
      // prune selections that no longer exist
      setSelectedJtis((sel) => sel.filter((id) => items.some((s) => s.jti === id)));
    } catch {
      setSessionsError("Failed to fetch sessions");
    } finally { setLoadingSessions(false); }
  }, [sessionsPage]);

  // Auto-refresh effect
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

  // Tab -> loader
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

  const adminResendVerification = async (email) => {
    if (!email) return;
    setResendLoading(true);
    try {
      await client.post("/auth/resend-verification", { email });
      toast({ title: "Verification email sent", description: email, status: "success" });
    } catch (e) {
      toast({ title: "Send failed", description: e?.response?.data?.message || "Unknown error", status: "error" });
    } finally { setResendLoading(false); }
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
  const handleOpenDeleteDesignDialog = (design) => { setDesignToDelete(design); };
  const confirmDeleteDesign = async () => {
    if (!designToDelete) return;
    try {
      await client.delete(`/admin/designs/${designToDelete._id}`);
      toast({ title: "Design Deleted", status: "success" });
      setDesigns((prev) => prev.filter((d) => d._id !== designToDelete._id));
      setDesignToDelete(null); // fixed: close properly
    } catch (e) {
      toast({ title: "Delete Failed", description: e.response?.data?.message, status: "error" });
    }
  };

  // ---------- Devices actions ----------
  const SESSION_KEY = "tftp_session_id"; // keep consistent with client.js
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

  // Selection helpers (Devices)
  const toggleSelectAll = (checked) => {
    if (checked) setSelectedJtis(sessions.map((s) => s.jti));
    else setSelectedJtis([]);
  };
  const toggleSelectOne = (jti, checked) => {
    setSelectedJtis((prev) => checked ? [...new Set([...prev, jti])] : prev.filter((id) => id !== jti));
  };
  const revokeSelected = async () => {
    if (selectedJtis.length === 0) return;
    try {
      await Promise.all(selectedJtis.map((id) => client.delete(`/admin/sessions/${id}`)));
      toast({ title: `Revoked ${selectedJtis.length} session(s)`, status: "success" });
      setSelectedJtis([]);
      await fetchSessions();
    } catch {
      toast({ title: "Failed to revoke some sessions", status: "error" });
    }
  };

  // ---------- Panels ----------
  const UsersPanel = () => (
    <Box p={{ base: 2, md: 4 }} layerStyle="cardBlue" w="100%">
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="md">User Management</Heading>
        <Button
          size="sm"
          leftIcon={<FaSync />}
          onClick={() => { setUsers([]); fetchUsers(); }}
          isLoading={loadingUsers}
          variant="outline"
          color="black"
          borderColor="black"
        >
          Refresh
        </Button>
      </HStack>

      {loadingUsers ? (
        <VStack p={10}><Spinner /></VStack>
      ) : usersError ? (
        <Alert status="error"><AlertIcon />{usersError}</Alert>
      ) : (
        <TableContainer w="100%" overflowX="auto" borderRadius="md" borderWidth="1px" borderColor="rgba(0,0,0,0.08)">
          <Table variant="simple" size="sm" w="100%">
            <Thead position="sticky" top={0} zIndex={1} bg="brand.cardBlue">
              <Tr>
                <Th><Icon as={FaIdBadge} mr={2} />ID</Th>
                <Th>Username</Th>
                <Th>Email</Th>
                <Th>Verified</Th>
                <Th>Name</Th>
                <Th>Admin</Th>
                <Th>Joined</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {users.map((user) => (
                <Tr key={user._id}>
                  <Td>
                    <HStack spacing={2}>
                      <Badge variant="subtle">{shortId(user._id)}</Badge>
                      <Tooltip label="Copy full ID">
                        <ChakraIconButton
                          size="xs"
                          variant="ghost"
                          icon={<FaCopy />}
                          onClick={() => { navigator.clipboard.writeText(String(user._id)); toast({ title: "ID copied", status: "success", duration: 1000 }); }}
                          aria-label="Copy ID"
                        />
                      </Tooltip>
                    </HStack>
                  </Td>
                  <Td>{user.username}</Td>
                  <Td>{user.email}</Td>
                  <Td>
                    {user.emailVerifiedAt ? (
                      <Tag size="sm" colorScheme="green" borderRadius="full">
                        <Icon as={FaShieldAlt} mr={1} /> Verified
                      </Tag>
                    ) : (
                      <Tag size="sm" colorScheme="gray" borderRadius="full">
                        <Icon as={FaTimesCircle} mr={1} /> Unverified
                      </Tag>
                    )}
                  </Td>
                  <Td>{`${user.firstName || ""} ${user.lastName || ""}`.trim() || "—"}</Td>
                  <Td><Tag size="sm" colorScheme={user.isAdmin ? "green" : "gray"}>{user.isAdmin ? "Yes" : "No"}</Tag></Td>
                  <Td>{fmtDate(user.createdAt)}</Td>
                  <Td>
                    <Tooltip label="View User Details">
                      <ChakraIconButton size="xs" variant="ghost" icon={<Icon as={FaEye} />} onClick={() => handleViewUser(user)} />
                    </Tooltip>
                    <Tooltip label="Edit User">
                      <ChakraIconButton size="xs" variant="ghost" icon={<Icon as={FaEdit} />} onClick={() => handleOpenEditUser(user)} />
                    </Tooltip>
                    <Tooltip label="Delete User">
                      <ChakraIconButton size="xs" variant="ghost" colorScheme="red" icon={<Icon as={FaTrashAlt} />} onClick={() => handleOpenDeleteUser(user)} />
                    </Tooltip>
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
          <Button
            size="sm"
            leftIcon={<FaSync />}
            onClick={() => { setOrders([]); fetchOrders(); }}
            isLoading={loadingOrders}
            variant="outline"
            color="black"
            borderColor="black"
          >
            Refresh
          </Button>
        </HStack>
        {loadingOrders ? (
          <VStack p={10}><Spinner /></VStack>
        ) : ordersError ? (
          <Alert status="error"><AlertIcon />{ordersError}</Alert>
        ) : (
          <TableContainer w="100%" overflowX="auto" borderRadius="md" borderWidth="1px" borderColor="rgba(0,0,0,0.08)">
            <Table variant="simple" size="sm" w="100%">
              <Thead position="sticky" top={0} zIndex={1} bg="brand.cardBlue">
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
                    <Td fontSize="xs" title={order._id}>{String(order._id).substring(0, 8)}…</Td>
                    <Td>{order.user?.email || "—"}</Td>
                    <Td>{fmtDate(order.createdAt)}</Td>
                    <Td>{money(order.totalAmount)}</Td>
                    <Td><Tag size="sm" colorScheme={order.paymentStatus === "Succeeded" ? "green" : "orange"}>{order.paymentStatus}</Tag></Td>
                    <Td>
                      <Select
                        size="xs"
                        variant="outline"
                        value={order.orderStatus}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        bg={getStatusColor(order.orderStatus)}
                        borderRadius="md"
                        maxW="160px"
                      >
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </Select>
                    </Td>
                    <Td>{order.orderItems?.length || 0}</Td>
                    <Td>
                      <Tooltip label="View Order Details">
                        <ChakraIconButton size="xs" variant="ghost" icon={<Icon as={FaEye} />} onClick={() => handleViewOrder(order._id)} />
                      </Tooltip>
                      <Tooltip label="Delete Order">
                        <ChakraIconButton size="xs" variant="ghost" colorScheme="red" icon={<Icon as={FaTrashAlt} />} onClick={() => handleOpenDeleteOrderDialog(order)} />
                      </Tooltip>
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

  // sort newest first and slice by designsVisible
  const sortedDesigns = useMemo(() => {
    const arr = Array.isArray(designs) ? [...designs] : [];
    arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return arr;
  }, [designs]);
  const visibleDesigns = sortedDesigns.slice(0, designsVisible);

  const DesignsPanel = () => (
    <Box p={{ base: 2, md: 4 }} layerStyle="cardBlue" w="100%">
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="md">Design Management</Heading>
        <HStack>
          <Button
            size="sm"
            leftIcon={<FaSync />}
            onClick={() => { setDesigns([]); setDesignsVisible(8); fetchDesigns(); }}
            isLoading={loadingDesigns}
            variant="outline"
            color="black"
            borderColor="black"
          >
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDesignsVisible(sortedDesigns.length)}>Expand all</Button>
          <Button size="sm" variant="outline" onClick={() => setDesignsVisible((v) => Math.min(v + 20, sortedDesigns.length))}>Load 20 more</Button>
          <Button size="sm" variant="outline" onClick={() => setDesignsVisible(8)}>Collapse to 8</Button>
        </HStack>
      </HStack>
      {loadingDesigns ? (
        <VStack p={10}><Spinner /></VStack>
      ) : designsError ? (
        <Alert status="error"><AlertIcon />{designsError}</Alert>
      ) : (
        <>
          <TableContainer w="100%" overflowX="auto" borderRadius="md" borderWidth="1px" borderColor="rgba(0,0,0,0.08)">
            <Table variant="simple" size="sm" w="100%">
              <Thead position="sticky" top={0} zIndex={1} bg="brand.cardBlue">
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
                {visibleDesigns.map((design) => {
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
                          <HStack spacing={3} fontSize="xs">
                            <Text>CFG {cfg}</Text>
                            <Text>Steps {stp}</Text>
                            <Text>Strength {str}</Text>
                          </HStack>
                        </VStack>
                      </Td>
                      <Td>{design.user?.username || "N/A"}</Td>
                      <Td>{design.createdAt ? new Date(design.createdAt).toLocaleDateString() : "N/A"}</Td>
                      <Td>
                        {design.isSubmittedForContest && design.contestSubmissionMonth ? (
                          <VStack align="center" spacing={0}>
                            <Tag size="sm" colorScheme="blue" borderRadius="full">{design.votes || 0} Votes</Tag>
                            <Text fontSize="xs" color="brand.textMuted">{monthName(design.contestSubmissionMonth)}</Text>
                          </VStack>
                        ) : (<Text fontSize="xs" color="brand.textMuted">N/A</Text>)}
                      </Td>
                      <Td>
                        <Tooltip label="View Design">
                          <ChakraIconButton size="xs" variant="ghost" icon={<Icon as={FaEye} />} onClick={() => handleViewDesign(design)} />
                        </Tooltip>
                        <Tooltip label="Delete Design">
                          <ChakraIconButton size="xs" variant="ghost" colorScheme="red" icon={<Icon as={FaTrashAlt} />} onClick={() => handleOpenDeleteDesignDialog(design)} />
                        </Tooltip>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>

          {designsVisible < sortedDesigns.length && (
            <VStack pt={4}>
              <Button onClick={() => setDesignsVisible((v) => Math.min(v + 20, sortedDesigns.length))}>
                Load 20 more (showing {designsVisible} of {sortedDesigns.length})
              </Button>
            </VStack>
          )}
        </>
      )}
    </Box>
  );

  const DevicesPanel = () => {
    // common checkbox styling: black when checked, readable border when not
    const checkboxSx = {
      ".chakra-checkbox__control": {
        bg: "white",
        borderColor: "blackAlpha.700",
      },
      ".chakra-checkbox__control[data-checked]": {
        bg: "black",
        borderColor: "black",
        color: "white",
      },
    };

    const AutoRefreshMenu = () => (
      <Menu>
        <MenuButton
          as={Button}
          size="sm"
          variant="outline"
          rightIcon={<FaChevronDown />}
          color="black"
          borderColor="black"
        >
          Auto-refresh: {autoRefreshMs ? `Every ${autoRefreshMs / 1000}s` : "Off"}
        </MenuButton>
        <MenuList bg="brand.primary" color="white" borderColor="blackAlpha.600">
          <MenuItem bg="brand.primary" _hover={{ bg: "blackAlpha.700" }} onClick={() => setAutoRefreshMs(0)}>Off</MenuItem>
          <MenuItem bg="brand.primary" _hover={{ bg: "blackAlpha.700" }} onClick={() => setAutoRefreshMs(5000)}>Every 5s</MenuItem>
          <MenuItem bg="brand.primary" _hover={{ bg: "blackAlpha.700" }} onClick={() => setAutoRefreshMs(15000)}>Every 15s</MenuItem>
          <MenuItem bg="brand.primary" _hover={{ bg: "blackAlpha.700" }} onClick={() => setAutoRefreshMs(30000)}>Every 30s</MenuItem>
          <MenuItem bg="brand.primary" _hover={{ bg: "blackAlpha.700" }} onClick={() => setAutoRefreshMs(60000)}>Every 60s</MenuItem>
        </MenuList>
      </Menu>
    );

    return (
      <Box p={{ base: 2, md: 4 }} layerStyle="cardBlue" w="100%">
        <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
          <Heading size="md">Devices / Active Sessions</Heading>

          <HStack gap={2}>
            <AutoRefreshMenu />
            <Button
              size="sm"
              variant="outline"
              leftIcon={<FaSync />}
              onClick={fetchSessions}
              isLoading={loadingSessions}
              color="black"
              borderColor="black"
            >
              Refresh
            </Button>
            <Button
              size="sm"
              colorScheme="red"
              variant="solid"
              isDisabled={selectedJtis.length === 0}
              onClick={revokeSelected}
            >
              Revoke selected ({selectedJtis.length})
            </Button>
          </HStack>
        </HStack>

        {loadingSessions ? (
          <VStack p={10}><Spinner /></VStack>
        ) : sessionsError ? (
          <Alert status="error"><AlertIcon />{sessionsError}</Alert>
        ) : (
          <TableContainer w="100%" overflowX="auto" borderRadius="md" borderWidth="1px" borderColor="rgba(0,0,0,0.08)">
            <Table size="sm" variant="simple" w="100%">
              <Thead position="sticky" top={0} zIndex={1} bg="brand.cardBlue">
                <Tr>
                  <Th>
                    <Checkbox
                      isChecked={allChecked}
                      isIndeterminate={isIndeterminate}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      colorScheme="blackAlpha"
                      sx={checkboxSx}
                    />
                  </Th>
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
                {sessions.map((i) => {
                  const isChecked = selectedJtis.includes(i.jti);
                  return (
                    <Tr key={i.jti}>
                      <Td>
                        <Checkbox
                          isChecked={isChecked}
                          onChange={(e) => toggleSelectOne(i.jti, e.target.checked)}
                          colorScheme="blackAlpha"
                          sx={checkboxSx}
                        />
                      </Td>
                      <Td>
                        <Text fontWeight="bold">{i.user?.username || "(unknown)"}</Text>
                        <Text fontSize="xs" color="gray.600">{i.user?.email || "—"}</Text>
                        {i.user?._id && (
                          <Tooltip label="Revoke ALL for this user">
                            <ChakraIconButton
                              ml={1}
                              size="xs"
                              icon={<FaUserSlash />}
                              aria-label="Revoke all"
                              onClick={() => revokeAllForUser(i.user?._id)}
                              variant="ghost"
                            />
                          </Tooltip>
                        )}
                      </Td>
                      <Td>
                        <HStack spacing={2} align="start">
                          <Code fontSize="xs" p={1} whiteSpace="normal" wordBreak="break-all">
                            {i.jti}
                          </Code>
                          <Tooltip label="Copy Session ID">
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
                      <Td>{i.ip || "—"}</Td>
                      <Td>
                        <Text whiteSpace="normal" wordBreak="break-word">{i.userAgent || "—"}</Text>
                      </Td>
                      <Td>{fmtDate(i.createdAt)}</Td>
                      <Td>{fmtDate(i.lastSeenAt || i.createdAt)}</Td>
                      <Td>{fmtDate(i.expiresAt)}</Td>
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

        {/* Device / Client Details */}
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
            <ModalFooter><Button onClick={onDeviceInfoClose}>Close</Button></ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    );
  };

  // Auto-populate devices when visiting the tab the first time
  useEffect(() => {
    if (tabIndex === 5 && sessions.length === 0 && !loadingSessions) fetchSessions();
  }, [tabIndex, sessions.length, loadingSessions, fetchSessions]);

  const AddressBlock = ({ title, addr }) => {
    if (!hasAddr(addr)) return (
      <Box>
        <Heading as="h4" size="sm" mb={1}>{title}</Heading>
        <Text color="whiteAlpha.700">—</Text>
      </Box>
    );
    return (
      <Box>
        <Heading as="h4" size="sm" mb={1}>{title}</Heading>
        <VStack align="start" spacing={0}>
          {addr.recipientName && <Text>{addr.recipientName}</Text>}
          <Text>
            {[addr.street1, addr.street2].filter(Boolean).join(", ")}
          </Text>
          <Text>
            {[addr.city, addr.state, addr.zipCode].filter(Boolean).join(", ")}
          </Text>
          <Text>{addr.country}</Text>
          {addr.phone && <Text>📞 {addr.phone}</Text>}
        </VStack>
      </Box>
    );
  };

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

      {/* View User: now shows verified + addresses */}
      <Modal isOpen={isViewUserModalOpen} onClose={onViewUserModalClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>User Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedUser ? (
              <VStack align="stretch" spacing={4}>
                <HStack justify="space-between" align="center">
                  <HStack spacing={3}>
                    <Badge>{shortId(selectedUser._id)}</Badge>
                    <Text fontWeight="bold">{selectedUser.username}</Text>
                    {selectedUser.emailVerifiedAt ? (
                      <Tag size="sm" colorScheme="green" borderRadius="full"><Icon as={FaShieldAlt} mr={1}/>Verified</Tag>
                    ) : (
                      <Tag size="sm" colorScheme="gray" borderRadius="full"><Icon as={FaTimesCircle} mr={1}/>Unverified</Tag>
                    )}
                  </HStack>
                  {!selectedUser.emailVerifiedAt && (
                    <Button
                      size="sm"
                      leftIcon={<FaPaperPlane />}
                      isLoading={resendLoading}
                      onClick={() => adminResendVerification(selectedUser.email)}
                    >
                      Resend verification
                    </Button>
                  )}
                </HStack>

                <Divider />

                <VStack align="stretch" spacing={1}>
                  <Text><b>Email:</b> {selectedUser.email}</Text>
                  <Text><b>Name:</b> {(selectedUser.firstName || "") + " " + (selectedUser.lastName || "")}</Text>
                  <Text><b>Admin:</b> {selectedUser.isAdmin ? "Yes" : "No"}</Text>
                  <Text><b>Created:</b> {fmtDate(selectedUser.createdAt)}</Text>
                  <Text><b>Updated:</b> {fmtDate(selectedUser.updatedAt)}</Text>
                  <Text><b>Verified at:</b> {fmtDate(selectedUser.emailVerifiedAt)}</Text>
                </VStack>

                <Divider />

                <HStack align="start" spacing={8}>
                  <AddressBlock title="Shipping Address" addr={selectedUser.shippingAddress} />
                  <AddressBlock title="Billing Address" addr={selectedUser.billingAddress} />
                </HStack>
              </VStack>
            ) : <Text>No user selected.</Text>}
          </ModalBody>
          <ModalFooter><Button onClick={onViewUserModalClose}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={onEditModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl><FormLabel>Username</FormLabel><Input name="username" value={editFormData.username} onChange={handleEditFormChange} /></FormControl>
              <FormControl><FormLabel>Email</FormLabel><Input name="email" value={editFormData.email} onChange={handleEditFormChange} /></FormControl>
              <FormControl display="flex" alignItems="center"><FormLabel mb="0">Admin</FormLabel><Switch name="isAdmin" isChecked={editFormData.isAdmin} onChange={(e)=>handleEditFormChange({ target: { name:"isAdmin", type:"switch", checked:e.target.checked }})} /></FormControl>
              <FormControl>
                <FormLabel>New Password</FormLabel>
                <InputGroup>
                  <Input name="newPassword" type={showNewPasswordInModal ? "text" : "password"} value={editFormData.newPassword} onChange={handleEditFormChange} />
                  <InputRightElement><Button size="xs" onClick={() => setShowNewPasswordInModal(v=>!v)}>{showNewPasswordInModal ? "Hide" : "Show"}</Button></InputRightElement>
                </InputGroup>
              </FormControl>
              <FormControl>
                <FormLabel>Confirm New Password</FormLabel>
                <InputGroup>
                  <Input name="confirmNewPassword" type={showConfirmNewPasswordInModal ? "text" : "password"} value={editFormData.confirmNewPassword} onChange={handleEditFormChange} />
                  <InputRightElement><Button size="xs" onClick={() => setShowConfirmNewPasswordInModal(v=>!v)}>{showConfirmNewPasswordInModal ? "Hide" : "Show"}</Button></InputRightElement>
                </InputGroup>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onEditModalClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleSaveChanges}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteUserModalOpen} onClose={onDeleteUserModalClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>Are you sure you want to delete this user?</ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onDeleteUserModalClose}>Cancel</Button>
            <Button colorScheme="red" onClick={confirmDeleteUser}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isViewOrderModalOpen} onClose={onCloseViewOrderModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Order</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {loadingSelectedOrder ? <Spinner /> : (
              <Box as="pre" whiteSpace="pre-wrap">{JSON.stringify(selectedOrder, null, 2)}</Box>
            )}
          </ModalBody>
          <ModalFooter><Button onClick={onCloseViewOrderModal}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteOrderModalOpen} onClose={onDeleteOrderModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Order</ModalHeader>
          <ModalCloseButton />
          <ModalBody>Are you sure you want to delete this order?</ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onDeleteOrderModalClose}>Cancel</Button>
            <Button colorScheme="red" onClick={confirmDeleteOrder}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isViewDesignModalOpen} onClose={onCloseViewDesignModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Design</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedDesign ? (
              <VStack align="stretch" spacing={3}>
                <Image src={selectedDesign.publicUrl || selectedDesign.thumbUrl} borderRadius="md" />
                <Box as="pre" whiteSpace="pre-wrap" fontSize="sm">{selectedDesign.prompt}</Box>
              </VStack>
            ) : <Text>No design selected.</Text>}
          </ModalBody>
          <ModalFooter><Button onClick={onCloseViewDesignModal}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={!!designToDelete} onClose={() => setDesignToDelete(null)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Design</ModalHeader>
          <ModalCloseButton />
          <ModalBody>Are you sure you want to delete this design?</ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={() => setDesignToDelete(null)}>Cancel</Button>
            <Button colorScheme="red" onClick={confirmDeleteDesign}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
