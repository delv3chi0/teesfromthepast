import React, { useCallback, useState } from "react";
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
import { client } from "../api/client";
import { useAuth } from "../context/AuthProvider";
import InventoryPanel from "../components/admin/InventoryPanel.jsx";
import AdminDashboard from "./admin/AdminDashboard.jsx";
import AdminAuditLogs from "./admin/AdminAuditLogs.jsx";

// Helper function for month formatting (copied from contest/MyDesigns)
const getMonthDisplayName = (yyyymm) => {
  if (!yyyymm || typeof yyyymm !== "string" || yyyymm.length !== 7) return "N/A";
  const [year, month] = yyyymm.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleString("default", { month: "short", year: "numeric" });
};

const AdminPage = () => {
  const toast = useToast();
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingSelectedOrder, setLoadingSelectedOrder] = useState(false);

  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [designsError, setDesignsError] = useState("");
  const [selectedDesign, setSelectedDesign] = useState(null);

  // Devices (Sessions)
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [sessionsPage] = useState(1);

  // Audit logs
  const [auditsLoaded, setAuditsLoaded] = useState(false); // just to avoid double load

  const [orderToDelete, setOrderToDelete] = useState(null);
  const [designToDelete, setDesignToDelete] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);

  const { isOpen: isDeleteOrderModalOpen, onOpen: onDeleteOrderModalOpen, onClose: onDeleteOrderModalClose } = useDisclosure();
  const { isOpen: isViewUserModalOpen, onOpen: onViewUserModalOpen, onClose: onViewUserModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isDeleteUserModalOpen, onOpen: onDeleteUserModalOpen, onClose: onDeleteUserModalClose } = useDisclosure();
  const { isOpen: isViewOrderModalOpen, onOpen: onOpenViewOrderModal, onClose: onCloseViewOrderModal } = useDisclosure();
  const { isOpen: isViewDesignModalOpen, onOpen: onOpenViewDesignModal, onClose: onCloseViewDesignModal } = useDisclosure();
  const { isOpen: isDeleteDesignModalOpen, onOpen: onOpenDeleteDesignModal, onClose: onCloseDeleteDesignModal } = useDisclosure();

  const [editFormData, setEditFormData] = useState({
    username: "", email: "", firstName: "", lastName: "", isAdmin: false, newPassword: "", confirmNewPassword: ""
  });
  const [showNewPasswordInModal, setShowNewPasswordInModal] = useState(false);
  const [showConfirmNewPasswordInModal, setShowConfirmNewPasswordInModal] = useState(false);

  // ---- Lazy data loaders per-tab ----
  const dataFetchers = {
    0: useCallback(async () => {/* dashboard loads itself */}, []),
    1: useCallback(async () => {
      if (users.length > 0) return;
      setLoadingUsers(true); setUsersError("");
      try {
        const { data } = await client.get("/admin/users", { headers: { Authorization: `Bearer ${token}` } });
        setUsers(data);
      } catch (e) { setUsersError("Failed to fetch users"); }
      finally { setLoadingUsers(false); }
    }, [token, users.length]),
    2: useCallback(async () => {
      if (orders.length > 0) return;
      setLoadingOrders(true); setOrdersError("");
      try {
        const { data } = await client.get("/admin/orders", { headers: { Authorization: `Bearer ${token}` } });
        setOrders(data);
      } catch (e) { setOrdersError("Failed to fetch orders"); }
      finally { setLoadingOrders(false); }
    }, [token, orders.length]),
    3: useCallback(async () => {
      if (designs.length > 0) return;
      setLoadingDesigns(true); setDesignsError("");
      try {
        const { data } = await client.get("/admin/designs", { headers: { Authorization: `Bearer ${token}` } });
        setDesigns(data);
      } catch (e) { setDesignsError("Failed to fetch designs"); }
      finally { setLoadingDesigns(false); }
    }, [token, designs.length]),

    // Devices tab — fetch ONLY ACTIVE sessions by default
    4: useCallback(async () => {
      if (sessions.length > 0) return;
      setLoadingSessions(true); setSessionsError("");
      try {
        const { data } = await client.get("/admin/sessions", {
          headers: { Authorization: `Bearer ${token}` },
          params: { page: sessionsPage, limit: 100, activeOnly: 1 }
        });
        setSessions((data.items || []).filter(i => !i.revokedAt && new Date(i.expiresAt) > new Date()));
      } catch (e) {
        setSessionsError("Failed to fetch sessions");
      } finally {
        setLoadingSessions(false);
      }
    }, [token, sessions.length, sessionsPage]),

    5: useCallback(async () => {
      if (!auditsLoaded) setAuditsLoaded(true); // component fetches itself
    }, [auditsLoaded]),
  };

  const handleTabsChange = (index) => {
    setTabIndex(index);
    const fetcher = dataFetchers[index];
    if (fetcher) fetcher();
  };

  // Users
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
      const { data: updatedUser } = await client.put(`/admin/users/${selectedUser._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
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
      await client.delete(`/admin/users/${selectedUser._id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "User Deleted", status: "success" });
      setUsers((prev) => prev.filter((u) => u._id !== selectedUser._id));
      onDeleteUserModalClose();
    } catch (e) {
      toast({ title: "Delete Failed", description: e.response?.data?.message, status: "error" });
    }
  };

  // Orders
  const handleOpenDeleteOrderDialog = (order) => { setOrderToDelete(order); onDeleteOrderModalOpen(); };
  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      await client.delete(`/admin/orders/${orderToDelete._id}`, { headers: { Authorization: `Bearer ${token}` } });
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
      const { data } = await client.get(`/admin/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
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
      await client.put(`/admin/orders/${orderId}/status`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "Status Updated", status: "success", duration: 2000 });
    } catch (e) {
      setOrders(original);
      toast({ title: "Update Failed", description: e.response?.data?.message, status: "error" });
    }
  };

  // Designs
  const handleViewDesign = (design) => { setSelectedDesign(design); onOpenViewDesignModal(); };
  const handleOpenDeleteDesignDialog = (design) => { setDesignToDelete(design); onOpenDeleteDesignModal(); };
  const confirmDeleteDesign = async () => {
    if (!designToDelete) return;
    try {
      await client.delete(`/admin/designs/${designToDelete._id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "Design Deleted", status: "success" });
      setDesigns((prev) => prev.filter((d) => d._id !== designToDelete._id));
      onCloseDeleteDesignModal();
    } catch (e) {
      toast({ title: "Delete Failed", description: e.response?.data?.message, status: "error" });
    }
  };

  // Devices panel actions
  const pullActiveSessions = async () => {
    const { data } = await client.get("/admin/sessions", {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: sessionsPage, limit: 100, activeOnly: 1 },
    });
    return (data.items || []).filter(i => !i.revokedAt && new Date(i.expiresAt) > new Date());
  };

  const revokeSession = async (jti) => {
    try {
      await client.delete(`/admin/sessions/${jti}`, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "Session revoked", status: "success" });
      const fresh = await pullActiveSessions();
      setSessions(fresh);
    } catch (e) {
      toast({ title: "Failed to revoke session", status: "error" });
    }
  };
  const revokeAllForUser = async (userId) => {
    try {
      await client.delete(`/admin/sessions/user/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "All sessions revoked for user", status: "success" });
      const fresh = await pullActiveSessions();
      setSessions(fresh);
    } catch (e) {
      toast({ title: "Failed to revoke user sessions", status: "error" });
    }
  };

  const UsersPanel = () => (
    <Box p={{ base: 2, md: 4 }} layerStyle="cardBlue" w="100%">
      <Heading size="md" mb={4}>User Management</Heading>
      {loadingUsers ? (
        <VStack p={10}><Spinner/></VStack>
      ) : usersError ? (
        <Alert status="error"><AlertIcon/>{usersError}</Alert>
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
                  <Td fontSize="xs" title={user._id}>{user._id.substring(0, 8)}...</Td>
                  <Td>{user.username}</Td>
                  <Td>{user.email}</Td>
                  <Td>{`${user.firstName || ""} ${user.lastName || ""}`.trim()}</Td>
                  <Td><Tag size="sm" colorScheme={user.isAdmin ? "green" : "gray"}>{user.isAdmin ? "Yes" : "No"}</Tag></Td>
                  <Td>{new Date(user.createdAt).toLocaleDateString()}</Td>
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
        <Heading size="md" mb={4}>Order Management</Heading>
        {loadingOrders ? (
          <VStack p={10}><Spinner/></VStack>
        ) : ordersError ? (
          <Alert status="error"><AlertIcon/>{ordersError}</Alert>
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
                    <Td fontSize="xs">{order._id.substring(0, 8)}...</Td>
                    <Td>{order.user?.email}</Td>
                    <Td>{new Date(order.createdAt).toLocaleDateString()}</Td>
                    <Td>${(order.totalAmount / 100).toFixed(2)}</Td>
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
      <Heading size="md" mb={4}>Design Management</Heading>
      {loadingDesigns ? (
        <VStack p={10}><Spinner/></VStack>
      ) : designsError ? (
        <Alert status="error"><AlertIcon/>{designsError}</Alert>
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
                    <Td>
                      {previewSrc ? (
                        <Image src={previewSrc} boxSize="56px" objectFit="cover" borderRadius="md" />
                      ) : (
                        <Box boxSize="56px" borderWidth="1px" borderRadius="md" />
                      )}
                    </Td>
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
                          <Text fontSize="xs" color="brand.textMuted">{getMonthDisplayName(design.contestSubmissionMonth)}</Text>
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
        <Button
          leftIcon={<FaSync />}
          size="sm"
          onClick={async () => {
            setLoadingSessions(true);
            try {
              const fresh = await pullActiveSessions();
              setSessions(fresh);
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
                <Th>IP</Th>
                <Th>User Agent</Th>
                <Th>Created</Th>
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
                        <ChakraIconButton
                          ml={2}
                          size="xs"
                          icon={<FaUserSlash />}
                          aria-label="Revoke all"
                          onClick={() => revokeAllForUser(i.user?._id)}
                        />
                      </Tooltip>
                    )}
                  </Td>
                  <Td>{i.ip || "-"}</Td>
                  <Td><Text maxW="360px" noOfLines={1} title={i.userAgent}>{i.userAgent || "-"}</Text></Td>
                  <Td>{new Date(i.createdAt).toLocaleString()}</Td>
                  <Td>{new Date(i.expiresAt).toLocaleString()}</Td>
                  <Td>
                    {i.revokedAt
                      ? <Badge colorScheme="red">Revoked</Badge>
                      : (new Date(i.expiresAt) < new Date() ? <Badge>Expired</Badge> : <Badge colorScheme="green">Active</Badge>)
                    }
                  </Td>
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

  return (
    <Box w="100%" pb={10}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="pageTitle" color="brand.textLight" w="100%">Admin Console</Heading>

        <Box bg="brand.paper" borderRadius="xl" shadow="xl" p={{ base: 2, md: 4 }} w="100%">
          <Tabs variant="soft-rounded" colorScheme="brandPrimary" isLazy onChange={handleTabsChange} index={tabIndex}>
            <TabList mb="1em" flexWrap="wrap">
              <Tab _selected={{ color: "white", bg: "brand.primary" }}><Icon as={FaTachometerAlt} mr={2}/> Dashboard</Tab>
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

      {/* --- MODALS (unchanged) --- */}
      <Modal isOpen={isViewUserModalOpen} onClose={onViewUserModalClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>User: {selectedUser?.username}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="start">
              <Text><strong>ID:</strong> {selectedUser?._id}</Text>
              <Text><strong>Username:</strong> {selectedUser?.username}</Text>
              <Text><strong>Email:</strong> {selectedUser?.email}</Text>
            </VStack>
          </ModalBody>
          <ModalFooter><Button onClick={onViewUserModalClose}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit User: {selectedUser?.username}</ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto" maxHeight="70vh">
            <Box layerStyle="darkModalInnerSection">
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Username</FormLabel>
                  <Input name="username" value={editFormData.username} onChange={handleEditFormChange} />
                </FormControl>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input type="email" name="email" value={editFormData.email} onChange={handleEditFormChange} />
                </FormControl>
                <FormControl>
                  <FormLabel>First Name</FormLabel>
                  <Input name="firstName" value={editFormData.firstName} onChange={handleEditFormChange} />
                </FormControl>
                <FormControl>
                  <FormLabel>Last Name</FormLabel>
                  <Input name="lastName" value={editFormData.lastName} onChange={handleEditFormChange} />
                </FormControl>
                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="isAdmin" mb="0">Admin Status</FormLabel>
                  <Switch id="isAdmin" name="isAdmin" isChecked={editFormData.isAdmin} onChange={handleEditFormChange} />
                </FormControl>
                <Divider my={4} />
                <Heading size="sm">Change Password</Heading>
                <FormControl>
                  <FormLabel>New Password</FormLabel>
                  <InputGroup>
                    <Input name="newPassword" type={showNewPasswordInModal ? "text" : "password"} value={editFormData.newPassword} onChange={handleEditFormChange} />
                    <InputRightElement>
                      <ChakraIconButton variant="ghost" icon={showNewPasswordInModal ? <FaEyeSlash /> : <FaEye />} onClick={() => setShowNewPasswordInModal(!showNewPasswordInModal)} />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
                <FormControl>
                  <FormLabel>Confirm New Password</FormLabel>
                  <InputGroup>
                    <Input name="confirmNewPassword" type={showConfirmNewPasswordInModal ? "text" : "password"} value={editFormData.confirmNewPassword} onChange={handleEditFormChange} />
                    <InputRightElement>
                      <ChakraIconButton variant="ghost" icon={showConfirmNewPasswordInModal ? <FaEyeSlash /> : <FaEye />} onClick={() => setShowConfirmNewPasswordInModal(!showConfirmNewPasswordInModal)} />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
              </VStack>
            </Box>
          </ModalBody>
          <ModalFooter><Button onClick={onEditModalClose} mr={3}>Cancel</Button><Button onClick={handleSaveChanges} colorScheme="brandAccentOrange">Save</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteUserModalOpen} onClose={onDeleteUserModalClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Deletion</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Delete <strong>{selectedUser?.username}</strong>?</Text>
            <Text mt={2} color="red.500">This action cannot be undone.</Text>
          </ModalBody>
          <ModalFooter><Button onClick={onDeleteUserModalClose} mr={3}>Cancel</Button><Button onClick={confirmDeleteUser} colorScheme="red">Delete</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteOrderModalOpen} onClose={onDeleteOrderModalClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Deletion</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Delete order <strong>{orderToDelete?._id}</strong>?</Text>
            <Alert mt={4} status="warning"><AlertIcon/>This does not issue a refund in Stripe.</Alert>
          </ModalBody>
          <ModalFooter><Button onClick={onDeleteOrderModalClose} mr={3}>Cancel</Button><Button colorScheme="red" onClick={confirmDeleteOrder}>Delete</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isViewOrderModalOpen} onClose={() => { onCloseViewOrderModal(); setSelectedOrder(null); }} size="4xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Order Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {loadingSelectedOrder ? (<VStack justifyContent="center" minH="300px"><Spinner size="xl" /></VStack>) : selectedOrder && (
              <VStack spacing={6} align="stretch">
                <Box layerStyle="darkModalInnerSection">
                  <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
                    <GridItem>
                      <Heading size="sm" mb={2}>Customer</Heading>
                      <Text><strong>ID:</strong> {selectedOrder._id}</Text>
                      <Text><strong>Username:</strong> {selectedOrder.user?.username || "N/A"}</Text>
                      <Text><strong>Email:</strong> {selectedOrder.user?.email}</Text>
                    </GridItem>
                    <GridItem>
                      <Heading size="sm" mb={2}>Summary</Heading>
                      <Text><strong>ID:</strong> {selectedOrder._id}</Text>
                      <Text><strong>Date:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</Text>
                      <Text><strong>Total:</strong> <Tag colorScheme="green">${(selectedOrder.totalAmount / 100).toFixed(2)}</Tag></Text>
                      <Text><strong>Payment:</strong> {selectedOrder.paymentStatus}</Text>
                      <Text><strong>Status:</strong> {selectedOrder.orderStatus}</Text>
                    </GridItem>
                  </Grid>
                </Box>

                <Box layerStyle="darkModalInnerSection">
                  <Heading size="sm" mb={2}>Shipping Address</Heading>
                  <Text>{selectedOrder.shippingAddress?.recipientName}</Text>
                  <Text>{selectedOrder.shippingAddress?.street1}</Text>
                  {selectedOrder.shippingAddress?.street2 && <Text>{selectedOrder.shippingAddress.street2}</Text>}
                  <Text>{selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} {selectedOrder.shippingAddress?.zipCode}</Text>
                  <Text>{selectedOrder.shippingAddress?.country}</Text>
                </Box>
                <Divider />
                <Box layerStyle="darkModalInnerSection">
                  <Heading size="sm" mb={4}>Items ({selectedOrder.orderItems?.length || 0})</Heading>
                  <VStack spacing={4} align="stretch">
                    {selectedOrder.orderItems?.map((item, index) => {
                      const thumb = item.designId?.thumbUrl || item.designId?.publicUrl || item.designId?.imageDataUrl;
                      return (
                        <Flex key={index} p={3} borderWidth="1px" borderRadius="md" alignItems="center" flexWrap="wrap">
                          <Image src={thumb || "https://via.placeholder.com/100"} boxSize="100px" objectFit="cover" borderRadius="md" mr={4} mb={{ base: 2, md: 0 }} />
                          <VStack align="start" spacing={1} fontSize="sm">
                            <Text fontWeight="bold">{item.productName}</Text>
                            <Text><strong>SKU:</strong> {item.variantSku}</Text>
                            <Text><strong>Color:</strong> {item.color} | <strong>Size:</strong> {item.size}</Text>
                            <Text><strong>Quantity:</strong> {item.quantity}</Text>
                            <Text><strong>Price/Item:</strong> ${(item.priceAtPurchase / 100).toFixed(2)}</Text>
                            <Tooltip label={item.designId?.prompt}>
                              <Text isTruncated maxW="400px"><strong>Prompt:</strong> {item.designId?.prompt || "N/A"}</Text>
                            </Tooltip>
                          </VStack>
                        </Flex>
                      );
                    })}
                  </VStack>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter><Button onClick={() => { onCloseViewOrderModal(); setSelectedOrder(null); }}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isViewDesignModalOpen} onClose={onCloseViewDesignModal} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Design Preview</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedDesign && (
              <VStack layerStyle="darkModalInnerSection">
                <Image src={selectedDesign.publicUrl || selectedDesign.imageDataUrl || selectedDesign.thumbUrl} maxW="100%" maxH="60vh" objectFit="contain" />
                <VStack align="start" spacing={1} w="100%">
                  <Text fontSize="md" mt={2} p={2} borderRadius="md"><strong>Prompt:</strong> {selectedDesign.prompt}</Text>
                  {selectedDesign.negativePrompt && (
                    <Text fontSize="sm" color="whiteAlpha.800"><strong>Negative:</strong> {selectedDesign.negativePrompt}</Text>
                  )}
                  <HStack spacing={3} fontSize="sm" color="whiteAlpha.800">
                    <Badge>{(selectedDesign.settings?.mode || "t2i").toUpperCase()}</Badge>
                    {selectedDesign.settings?.aspectRatio && <Badge>{selectedDesign.settings.aspectRatio}</Badge>}
                    {selectedDesign.settings?.cfgScale != null && <Badge>CFG {selectedDesign.settings.cfgScale}</Badge>}
                    {selectedDesign.settings?.steps != null && <Badge>Steps {selectedDesign.settings.steps}</Badge>}
                    {selectedDesign.settings?.imageStrength != null && <Badge>Strength {Math.round(selectedDesign.settings.imageStrength * 100)}%</Badge>}
                  </HStack>
                </VStack>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter><Button onClick={onCloseViewDesignModal}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteDesignModalOpen} onClose={onCloseDeleteDesignModal} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Deletion</ModalHeader>
          <ModalCloseButton />
          <ModalBody>Are you sure you want to delete this design? This cannot be undone.</ModalBody>
          <ModalFooter><Button variant="ghost" mr={3} onClick={onCloseDeleteDesignModal}>Cancel</Button><Button colorScheme="red" onClick={confirmDeleteDesign}>Delete</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AdminPage;
