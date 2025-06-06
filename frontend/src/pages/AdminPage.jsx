// frontend/src/pages/AdminPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, Text, VStack, Tabs, TabList, TabPanels, Tab, TabPanel, Icon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Spinner, Alert, AlertIcon,
  Button, useToast, Tag, Image,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure,
  FormControl, FormLabel, Input, Switch, InputGroup, InputRightElement, IconButton as ChakraIconButton,
  Divider, Tooltip
} from '@chakra-ui/react';
import { FaUsersCog, FaBoxOpen, FaPalette, FaEdit, FaTrashAlt, FaEye, FaKey, FaEyeSlash, FaWarehouse } from 'react-icons/fa';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import InventoryPanel from '../components/admin/InventoryPanel.jsx'; 

const AdminPage = () => {
  const toast = useToast();
  const { token } = useAuth();

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState('');

  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [designsError, setDesignsError] = useState('');

  const [orderToDelete, setOrderToDelete] = useState(null);
  const { isOpen: isDeleteOrderModalOpen, onOpen: onDeleteOrderModalOpen, onClose: onDeleteOrderModalClose } = useDisclosure();
  
  const { isOpen: isViewModalOpen, onOpen: onViewModalOpen, onClose: onViewModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();
  
  const [editFormData, setEditFormData] = useState({
    username: '', email: '', firstName: '', lastName: '', isAdmin: false, newPassword: '', confirmNewPassword: '',
  });
  const [showNewPasswordInModal, setShowNewPasswordInModal] = useState(false);
  const [showConfirmNewPasswordInModal, setShowConfirmNewPasswordInModal] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!token) { setUsersError("Auth token missing."); setLoadingUsers(false); return; }
    setLoadingUsers(true); setUsersError('');
    try { const r = await client.get('/admin/users', { headers: { Authorization: `Bearer ${token}` } }); setUsers(r.data); }
    catch (e) { setUsersError(e.response?.data?.message || 'Failed to fetch users.'); if (e.response?.status === 403) setUsersError('Access Denied.'); }
    finally { setLoadingUsers(false); }
  }, [token]);

  const fetchOrders = useCallback(async () => {
    if (!token) { setOrdersError("Auth token missing."); setLoadingOrders(false); return; }
    setLoadingOrders(true); setOrdersError('');
    try { const r = await client.get('/admin/orders', { headers: { Authorization: `Bearer ${token}` } }); setOrders(r.data || []); }
    catch (e) { setOrdersError(e.response?.data?.message || 'Failed to fetch orders.'); }
    finally { setLoadingOrders(false); }
  }, [token]);

  const fetchDesigns = useCallback(async () => {
    if (!token) { setDesignsError("Auth token missing."); setLoadingDesigns(false); return; }
    setLoadingDesigns(true); setDesignsError('');
    try { const r = await client.get('/admin/designs', { headers: { Authorization: `Bearer ${token}` } }); setDesigns(r.data || []); }
    catch (e) { setDesignsError(e.response?.data?.message || 'Failed to fetch designs.'); }
    finally { setLoadingDesigns(false); }
  }, [token]);

  useEffect(() => {
    if (token) { fetchUsers(); fetchOrders(); fetchDesigns(); }
  }, [token, fetchUsers, fetchOrders, fetchDesigns]);

  const handleViewUser = (user) => { setSelectedUser(user); onViewModalOpen(); };

  const handleOpenEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      username: user.username, email: user.email,
      firstName: user.firstName || '', lastName: user.lastName || '',
      isAdmin: user.isAdmin, newPassword: '', confirmNewPassword: '',
    });
    setShowNewPasswordInModal(false); setShowConfirmNewPasswordInModal(false);
    onEditModalOpen();
  };

  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: type === 'checkbox' || type === 'switch' ? checked : value }));
  };

  const handleSaveChanges = async () => {
    if (!selectedUser) return;
    if (editFormData.newPassword && editFormData.newPassword !== editFormData.confirmNewPassword) {
      toast({ title: "Password Mismatch", description: "New passwords do not match.", status: "error", duration: 3000, isClosable: true }); return;
    }
    if (editFormData.newPassword && editFormData.newPassword.length < 6) {
      toast({ title: "Password Too Short", description: "New password must be at least 6 characters.", status: "error", duration: 3000, isClosable: true }); return;
    }
    const payload = { ...editFormData };
    if (!payload.newPassword) {
      delete payload.newPassword;
    }
    delete payload.confirmNewPassword;

    try {
      const { data: updatedUser } = await client.put(`/admin/users/${selectedUser._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "User Updated", description: `User ${updatedUser.username}'s details have been updated.`, status: "success", duration: 4000, isClosable: true });
      setUsers(prev => prev.map(u => u._id === updatedUser._id ? updatedUser : u));
      onEditModalClose(); setSelectedUser(null);
    } catch (e) {
      toast({ title: "Update Failed", description: e.response?.data?.message || "Could not update user details.", status: "error", duration: 5000, isClosable: true });
      console.error("Admin User Update Error:", e.response?.data || e.message);
    }
  };

  const handleOpenDeleteUser = (user) => { setSelectedUser(user); onDeleteModalOpen(); };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await client.delete(`/admin/users/${selectedUser._id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "User Deleted", description: `User ${selectedUser.username} has been removed.`, status: "success", duration: 3000, isClosable: true });
      setUsers(prev => prev.filter(u => u._id !== selectedUser._id));
      onDeleteModalClose(); setSelectedUser(null);
    } catch (e) {
      toast({ title: "Delete Failed", description: e.response?.data?.message || "Could not delete user.", status: "error", duration: 5000, isClosable: true });
      console.error("Admin User Delete Error:", e.response?.data || e.message);
    }
  };

  const handleOpenDeleteOrderDialog = (order) => {
    setOrderToDelete(order);
    onDeleteOrderModalOpen();
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
        await client.delete(`/admin/orders/${orderToDelete._id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: "Order Deleted", description: `Order ${orderToDelete._id} has been removed.`, status: "success", duration: 3000, isClosable: true });
        fetchOrders(); // Refresh the orders list
        onDeleteOrderModalClose();
    } catch (e) {
        toast({ title: "Delete Failed", description: e.response?.data?.message || "Could not delete order.", status: "error", duration: 5000, isClosable: true });
        onDeleteOrderModalClose();
    }
  };

  const UsersPanel = () => (
    <Box p={{ base: 2, md: 4 }}>
      <Heading size="md" mb={4} color="brand.textDark">User Management</Heading>
      {loadingUsers && ( <VStack justifyContent="center" alignItems="center" minH="200px"><Spinner size="xl" color="brand.primary" /><Text mt={2} color="brand.textDark">Loading users...</Text></VStack> )}
      {!loadingUsers && usersError && ( <Alert status="error" borderRadius="md"><AlertIcon />{usersError}</Alert> )}
      {!loadingUsers && !usersError && users.length === 0 && ( <Text color="brand.textDark">No users found.</Text> )}
      {!loadingUsers && !usersError && users.length > 0 && (
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>ID</Th><Th>Username</Th><Th>Email</Th><Th>Name</Th><Th>Admin</Th><Th>Joined</Th><Th>Actions</Th></Tr></Thead>
            <Tbody>
              {users.map((user) => (
                <Tr key={user._id}>
                  <Td fontSize="xs" title={user._id}>{user._id.substring(0, 8)}...</Td>
                  <Td>{user.username}</Td><Td>{user.email}</Td>
                  <Td>{user.firstName || ''} {user.lastName || ''}</Td>
                  <Td><Tag size="sm" colorScheme={user.isAdmin ? 'green' : 'gray'} borderRadius="full">{user.isAdmin ? 'Yes' : 'No'}</Tag></Td>
                  <Td fontSize="xs">{new Date(user.createdAt).toLocaleDateString()}</Td>
                  <Td>
                    <Tooltip label="View User Details" placement="top"><ChakraIconButton size="xs" variant="ghost" colorScheme="blue" icon={<Icon as={FaEye} />} onClick={() => handleViewUser(user)} mr={1} aria-label="View User"/></Tooltip>
                    <Tooltip label="Edit User" placement="top"><ChakraIconButton size="xs" variant="ghost" colorScheme="yellow" icon={<Icon as={FaEdit} />} onClick={() => handleOpenEditUser(user)} mr={1} aria-label="Edit User"/></Tooltip>
                    <Tooltip label="Delete User" placement="top"><ChakraIconButton size="xs" variant="ghost" colorScheme="red" icon={<Icon as={FaTrashAlt} />} onClick={() => handleOpenDeleteUser(user)} aria-label="Delete User"/></Tooltip>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const OrdersPanel = () => (
    <Box p={{ base: 2, md: 4 }}>
      <Heading size="md" mb={4} color="brand.textDark">Order Management</Heading>
      {loadingOrders && ( <VStack justifyContent="center" alignItems="center" minH="200px"><Spinner size="xl" color="brand.primary" /><Text mt={2} color="brand.textDark">Loading orders...</Text></VStack> )}
      {!loadingOrders && ordersError && ( <Alert status="error" borderRadius="md"><AlertIcon />{ordersError}</Alert> )}
      {!loadingOrders && !ordersError && orders.length === 0 && ( <Text color="brand.textDark">No orders found.</Text> )}
      {!loadingOrders && !ordersError && orders.length > 0 && (
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>Order ID</Th><Th>User Email</Th><Th>Date</Th><Th>Total</Th><Th>Pay Status</Th><Th>Order Status</Th><Th># Items</Th><Th>Actions</Th></Tr></Thead>
            <Tbody>
              {orders.map((order) => (
                <Tr key={order._id}>
                  <Td fontSize="xs" title={order._id}>{order._id?.substring(0, 8)}...</Td>
                  <Td>{order.user?.email || 'N/A'}</Td>
                  <Td>{new Date(order.createdAt).toLocaleDateString()}</Td>
                  <Td>{typeof order.totalAmount === 'number' ? `$${(order.totalAmount / 100).toFixed(2)}` : '$0.00'}</Td>
                  <Td><Tag size="sm" colorScheme={order.paymentStatus === 'Succeeded' ? 'green' : 'orange'} borderRadius="full">{order.paymentStatus || 'N/A'}</Tag></Td>
                  <Td><Tag size="sm" colorScheme={order.orderStatus === 'Delivered' ? 'green' : order.orderStatus === 'Shipped' ? 'blue' : 'gray'} borderRadius="full">{order.orderStatus || 'N/A'}</Tag></Td>
                  <Td>{order.orderItems?.length || 0}</Td>
                  <Td>
                    <Tooltip label="View Order Details (Not Implemented)"><ChakraIconButton isDisabled size="xs" variant="ghost" colorScheme="blue" icon={<Icon as={FaEye} />} mr={1} aria-label="View Order"/></Tooltip>
                    <Tooltip label="Delete Order"><ChakraIconButton size="xs" variant="ghost" colorScheme="red" icon={<Icon as={FaTrashAlt} />} onClick={() => handleOpenDeleteOrderDialog(order)} aria-label="Delete Order"/></Tooltip>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const DesignsPanel = () => (
    <Box p={{ base: 2, md: 4 }}>
      <Heading size="md" mb={4} color="brand.textDark">Design Management</Heading>
      {loadingDesigns && ( <VStack justifyContent="center" alignItems="center" minH="200px"><Spinner size="xl" color="brand.primary" /><Text mt={2} color="brand.textDark">Loading designs...</Text></VStack> )}
      {!loadingDesigns && designsError && ( <Alert status="error" borderRadius="md"><AlertIcon />{designsError}</Alert> )}
      {!loadingDesigns && !designsError && designs.length === 0 && ( <Text color="brand.textDark">No designs found.</Text> )}
      {!loadingDesigns && !designsError && designs.length > 0 && (
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>Preview</Th><Th maxW="200px">Prompt</Th><Th>Creator</Th><Th>Created</Th><Th>Contest?</Th><Th>Votes</Th><Th>Actions</Th></Tr></Thead>
            <Tbody>
              {designs.map((design) => (
                <Tr key={design._id}>
                  <Td><Image src={design.imageDataUrl} fallbackSrc="https://via.placeholder.com/50?text=Design" alt="Design" boxSize="50px" objectFit="cover" borderRadius="md"/></Td>
                  <Td maxW="200px" whiteSpace="normal" wordBreak="break-word" fontSize="xs">{design.prompt}</Td>
                  <Td>{design.user?.username || 'N/A'}</Td>
                  <Td>{new Date(design.createdAt).toLocaleDateString()}</Td>
                  <Td><Tag size="sm" colorScheme={design.isContestSubmission ? 'purple' : 'gray'} borderRadius="full">{design.isContestSubmission ? 'Yes' : 'No'}</Tag></Td>
                  <Td>{design.votes || 0}</Td>
                  <Td>
                    <Tooltip label="View Design (Not Implemented)"><ChakraIconButton isDisabled size="xs" variant="ghost" colorScheme="blue" icon={<Icon as={FaEye} />} mr={1} aria-label="View Design"/></Tooltip>
                    <Tooltip label="Delete Design (Not Implemented)"><ChakraIconButton isDisabled size="xs" variant="ghost" colorScheme="red" icon={<Icon as={FaTrashAlt} />} aria-label="Delete Design"/></Tooltip>
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
        <Heading as="h1" size="pageTitle" color="brand.textLight" textAlign="left" w="100%" mb={{ base: 4, md: 6 }}>Admin Dashboard</Heading>
        <Box bg="brand.paper" borderRadius="xl" shadow="xl" p={{ base: 2, md: 4 }}>
          <Tabs variant="soft-rounded" colorScheme="brandPrimary" isLazy>
            <TabList mb="1em" flexWrap="wrap">
                <Tab _selected={{ color: 'white', bg: 'brand.primary' }} borderRadius="full" m={1}><Icon as={FaUsersCog} mr={2} /> Users</Tab>
                <Tab _selected={{ color: 'white', bg: 'brand.primary' }} borderRadius="full" m={1}><Icon as={FaBoxOpen} mr={2} /> Orders</Tab>
                <Tab _selected={{ color: 'white', bg: 'brand.primary' }} borderRadius="full" m={1}><Icon as={FaPalette} mr={2} /> Designs</Tab>
                <Tab _selected={{ color: 'white', bg: 'brand.primary' }} borderRadius="full" m={1}><Icon as={FaWarehouse} mr={2} /> Inventory</Tab>
            </TabList>
            <TabPanels>
                <TabPanel px={0} py={2}><UsersPanel /></TabPanel>
                <TabPanel px={0} py={2}><OrdersPanel /></TabPanel>
                <TabPanel px={0} py={2}><DesignsPanel /></TabPanel>
                <TabPanel px={0} py={2}><InventoryPanel /></TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </VStack>

      {/* View User Modal */}
      {selectedUser && ( <Modal isOpen={isViewModalOpen} /* ... */ >{/* ... */}</Modal> )}

      {/* Edit User Modal */}
      {selectedUser && ( <Modal isOpen={isEditModalOpen} /* ... */ >{/* ... */}</Modal> )}

      {/* Delete User Confirmation Modal */}
      {selectedUser && ( <Modal isOpen={isDeleteModalOpen} /* ... */ >{/* ... */}</Modal> )}

      {/* --- NEW: Delete Order Confirmation Modal --- */}
      {orderToDelete && (
          <Modal isOpen={isDeleteOrderModalOpen} onClose={onDeleteOrderModalClose} isCentered>
              <ModalOverlay />
              <ModalContent bg="brand.paper">
                  <ModalHeader color="brand.textDark">Confirm Order Deletion</ModalHeader>
                  <ModalCloseButton />
                  <ModalBody color="brand.textDark">
                      <Text>Are you sure you want to delete order <strong>{orderToDelete._id}</strong> placed by <strong>{orderToDelete.user?.email || 'N/A'}</strong>?</Text>
                      <Alert status="warning" mt={4}>
                          <AlertIcon />
                          This action only removes the order record from your database. It does NOT issue a refund in Stripe.
                      </Alert>
                  </ModalBody>
                  <ModalFooter>
                      <Button variant="ghost" onClick={onDeleteOrderModalClose} mr={3}>Cancel</Button>
                      <Button colorScheme="red" onClick={confirmDeleteOrder}>Delete Order</Button>
                  </ModalFooter>
              </ModalContent>
          </Modal>
      )}
    </Box>
  );
};

export default AdminPage;
