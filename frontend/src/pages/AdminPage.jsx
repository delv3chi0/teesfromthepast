// frontend/src/pages/AdminPage.jsx
// (IDENTICAL to the version I sent earlier, EXCEPT: a Details modal added to Devices panel)

import React, { useCallback, useMemo, useState } from "react";
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

// Small UA parser (simple + dependency-free)
function parseUA(ua = "") {
  const osMatch = ua.match(/\(([^)]+)\)/);
  const os = osMatch ? osMatch[1] : "";
  let browser = "Unknown";
  if (/Chrome\/\d+/.test(ua) && !/Edg\//.test(ua)) browser = "Chrome";
  if (/Edg\/\d+/.test(ua)) browser = "Edge";
  if (/Firefox\/\d+/.test(ua)) browser = "Firefox";
  if (/Safari\/\d+/.test(ua) && /Version\/\d+/.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
  const versionMatch = ua.match(/(?:Chrome|Edg|Firefox|Version)\/([\d.]+)/);
  const version = versionMatch ? versionMatch[1] : "";
  return { browser, version, os, raw: ua };
}

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

  // Session details modal
  const [sessionDetail, setSessionDetail] = useState(null);
  const { isOpen: isSessionDetailsOpen, onOpen: onOpenSessionDetails, onClose: onCloseSessionDetails } = useDisclosure();

  // Audit logs
  const [auditsLoaded, setAuditsLoaded] = useState(false);

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

  const dataFetchers = {
    0: useCallback(async () => {}, []),
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
      if (!auditsLoaded) setAuditsLoaded(true);
    }, [auditsLoaded]),
  };

  const handleTabsChange = (index) => {
    setTabIndex(index);
    const fetcher = dataFetchers[index];
    if (fetcher) fetcher();
  };

  // --- Users/Orders/Designs handlers are identical to the earlier version; omitted here for brevity ---
  // (Use the ones from the previous AdminPage I gave you.)

  // Devices helpers
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
    } catch {
      toast({ title: "Failed to revoke session", status: "error" });
    }
  };

  const revokeAllForUser = async (userId) => {
    try {
      await client.delete(`/admin/sessions/user/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "All sessions revoked for user", status: "success" });
      const fresh = await pullActiveSessions();
      setSessions(fresh);
    } catch {
      toast({ title: "Failed to revoke user sessions", status: "error" });
    }
  };

  const openSessionDetails = (row) => {
    setSessionDetail(row);
    onOpenSessionDetails();
  };

  const SessionDetailsBody = useMemo(() => {
    if (!sessionDetail) return null;
    const ua = parseUA(sessionDetail.userAgent || "");
    return (
      <VStack align="stretch" spacing={4}>
        <Box>
          <Heading size="sm" mb={2}>User</Heading>
          <Text><strong>Username:</strong> {sessionDetail.user?.username || "(unknown)"} </Text>
          <Text><strong>Email:</strong> {sessionDetail.user?.email || "-"}</Text>
        </Box>
        <Box>
          <Heading size="sm" mb={2}>Session</Heading>
          <Text><strong>Created:</strong> {new Date(sessionDetail.createdAt).toLocaleString()}</Text>
          <Text><strong>Expires:</strong> {new Date(sessionDetail.expiresAt).toLocaleString()}</Text>
          <Text><strong>Status:</strong> {sessionDetail.revokedAt ? "Revoked" : (new Date(sessionDetail.expiresAt) > new Date() ? "Active" : "Expired")}</Text>
          <Text><strong>IP:</strong> {sessionDetail.ip || "-"}</Text>
        </Box>
        <Box>
          <Heading size="sm" mb={2}>Device</Heading>
          <Text><strong>Browser:</strong> {ua.browser} {ua.version}</Text>
          <Text><strong>OS:</strong> {ua.os}</Text>
          <Text><strong>User Agent:</strong> {ua.raw}</Text>
        </Box>
      </VStack>
    );
  }, [sessionDetail]);

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
            } catch {
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
                  </Td>
                  <Td>{i.ip || "-"}</Td>
                  <Td>
                    <Text maxW="360px" noOfLines={1} title={i.userAgent}>{i.userAgent || "-"}</Text>
                    <Button size="xs" ml={2} variant="ghost" onClick={() => openSessionDetails(i)}>
                      <FaInfoCircle style={{ marginRight: 6 }} /> Details
                    </Button>
                  </Td>
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
                    {i.user?._id && (
                      <Tooltip label="Revoke ALL for this user">
                        <ChakraIconButton ml={2} size="sm" icon={<FaUserSlash />} aria-label="Revoke all" onClick={() => revokeAllForUser(i.user._id)} />
                      </Tooltip>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      {/* Session Details Modal */}
      <Modal isOpen={isSessionDetailsOpen} onClose={onCloseSessionDetails} size="3xl" isCentered>
        <ModalOverlay />
        <ModalContent bg="brand.secondary">
          <ModalHeader color="brand.textLight">Session Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>{SessionDetailsBody}</ModalBody>
          <ModalFooter><Button onClick={onCloseSessionDetails}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );

  // ---- rest of AdminPage (Users/Orders/Designs modals etc.) is identical to the previous version I sent ----
  // To keep this message readable, use the same rest-of-file content from my last AdminPage drop-in.

  return (
    <Box w="100%" pb={10}>
      {/* ... use the same Tab scaffold and panels as the previous version,
           but ensure the DevicesPanel here is used ... */}
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
              {/* keep your existing panels; ensure DevicesPanel here */}
              <TabPanel px={0} py={2}><AdminDashboard token={token} /></TabPanel>
              <TabPanel px={0} py={2}>{/* Users Panel here (unchanged) */}</TabPanel>
              <TabPanel px={0} py={2}>{/* Orders Panel here (unchanged) */}</TabPanel>
              <TabPanel px={0} py={2}>{/* Designs Panel here (unchanged) */}</TabPanel>
              <TabPanel px={0} py={2}><InventoryPanel /></TabPanel>
              <TabPanel px={0} py={2}><DevicesPanel /></TabPanel>
              <TabPanel px={0} py={2}><AdminAuditLogs token={token} /></TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </VStack>
    </Box>
  );
};

export default AdminPage;
