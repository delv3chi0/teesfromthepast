// frontend/src/pages/AdminPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, Text, VStack, Tabs, TabList, TabPanels, Tab, TabPanel, Icon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Spinner, Alert, AlertIcon,
  Button, useToast, Tag, Image, Select, // Added Select
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure,
  FormControl, FormLabel, Input, Switch, InputGroup, InputRightElement, IconButton as ChakraIconButton,
  Divider, Tooltip, Grid, GridItem, Flex
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
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingSelectedOrder, setLoadingSelectedOrder] = useState(false);

  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [designsError, setDesignsError] = useState('');

  const [orderToDelete, setOrderToDelete] = useState(null);
  const { isOpen: isDeleteOrderModalOpen, onOpen: onDeleteOrderModalOpen, onClose: onDeleteOrderModalClose } = useDisclosure();
  
  const { isOpen: isViewUserModalOpen, onOpen: onViewUserModalOpen, onClose: onViewUserModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();
  const { isOpen: isViewOrderModalOpen, onOpen: onViewOrderModalOpen, onClose: onViewOrderModalClose } = useDisclosure();

  const [editFormData, setEditFormData] = useState({
    username: '', email: '', firstName: '', lastName: '', isAdmin: false, newPassword: '', confirmNewPassword: '',
  });
  const [showNewPasswordInModal, setShowNewPasswordInModal] = useState(false);
  const [showConfirmNewPasswordInModal, setShowConfirmNewPasswordInModal] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!token) { setUsersError("Auth token missing."); setLoadingUsers(false); return; }
    setLoadingUsers(true); setUsersError('');
    try { const r = await client.get('/admin/users', { headers: { Authorization: `Bearer ${token}` } }); setUsers(r.data); }
    catch (e) { setUsersError(e.response?.data?.message || 'Failed to fetch users.'); }
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

  const handleViewUser = (user) => { setSelectedUser(user); onViewUserModalOpen(); };

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
      toast({ title: "Password Mismatch", status: "error" }); return;
    }
    if (editFormData.newPassword && editFormData.newPassword.length < 6) {
      toast({ title: "Password Too Short", status: "error" }); return;
    }
    const payload = { ...editFormData };
    if (!payload.newPassword) {
      delete payload.newPassword;
    }
    delete payload.confirmNewPassword;
    try {
      const { data: updatedUser } = await client.put(`/admin/users/${selectedUser._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "User Updated", status: "success" });
      setUsers(prev => prev.map(u => u._id === updatedUser._id ? updatedUser : u));
      onEditModalClose(); setSelectedUser(null);
    } catch (e) {
      toast({ title: "Update Failed", description: e.response?.data?.message, status: "error" });
    }
  };

  const handleOpenDeleteUser = (user) => { setSelectedUser(user); onDeleteModalOpen(); };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await client.delete(`/admin/users/${selectedUser._id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "User Deleted", status: "success" });
      setUsers(prev => prev.filter(u => u._id !== selectedUser._id));
      onDeleteModalClose(); setSelectedUser(null);
    } catch (e) {
      toast({ title: "Delete Failed", description: e.response?.data?.message, status: "error" });
    }
  };

  const handleOpenDeleteOrderDialog = (order) => {
    setOrderToDelete(order);
    onDeleteOrderModalOpen();
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
        await client.delete(`/admin/orders/${orderToDelete._id}`, { headers: { Authorization: `Bearer ${token}` } });
        toast({ title: "Order Deleted", status: "success" });
        fetchOrders();
        onDeleteOrderModalClose();
    } catch (e) {
        toast({ title: "Delete Failed", description: e.response?.data?.message, status: "error" });
        onDeleteOrderModalClose();
    }
  };
  
  const handleViewOrder = async (orderId) => {
    setLoadingSelectedOrder(true);
    onViewOrderModalOpen();
    try {
      const { data } = await client.get(`/admin/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedOrder(data);
    } catch (e) {
      toast({ title: "Error Fetching Order", description: e.response?.data?.message, status: "error" });
      onViewOrderModalClose();
    } finally {
      setLoadingSelectedOrder(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    const originalOrders = [...orders];
    setOrders(prevOrders => prevOrders.map(o => (o._id === orderId ? { ...o, orderStatus: newStatus } : o)));
    try {
      await client.put(`/admin/orders/${orderId}/status`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "Status Updated", description: `Order status changed to ${newStatus}.`, status: "success", duration: 2000 });
    } catch (e) {
      setOrders(originalOrders);
      toast({ title: "Update Failed", description: e.response?.data?.message, status: "error" });
    }
  };

  const UsersPanel = () => (
    <Box p={{ base: 2, md: 4 }}>
      <Heading size="md" mb={4} color="brand.textDark">User Management</Heading>
      {loadingUsers ? <VStack justifyContent="center" alignItems="center" minH="200px"><Spinner size="xl" /></VStack> : 
      usersError ? <Alert status="error" borderRadius="md"><AlertIcon />{usersError}</Alert> : 
      !users.length ? <Text color="brand.textDark">No users found.</Text> : (
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>ID</Th><Th>Username</Th><Th>Email</Th><Th>Name</Th><Th>Admin</Th><Th>Joined</Th><Th>Actions</Th></Tr></Thead>
            <Tbody>
              {users.map((user) => (
                <Tr key={user._id}>
                  <Td fontSize="xs" title={user._id}>{user._id.substring(0, 8)}...</Td>
                  <Td>{user.username}</Td><Td>{user.email}</Td>
                  <Td>{user.firstName || ''} {user.lastName || ''}</Td>
                  <Td><Tag size="sm" colorScheme={user.isAdmin ? 'green' : 'gray'}>{user.isAdmin ? 'Yes' : 'No'}</Tag></Td>
                  <Td fontSize="xs">{new Date(user.createdAt).toLocaleDateString()}</Td>
                  <Td>
                    <Tooltip label="View User Details"><ChakraIconButton size="xs" variant="ghost" icon={<Icon as={FaEye} />} onClick={() => handleViewUser(user)}/></Tooltip>
                    <Tooltip label="Edit User"><ChakraIconButton size="xs" variant="ghost" icon={<Icon as={FaEdit} />} onClick={() => handleOpenEditUser(user)}/></Tooltip>
                    <Tooltip label="Delete User"><ChakraIconButton size="xs" variant="ghost" icon={<Icon as={FaTrashAlt} />} onClick={() => handleOpenDeleteUser(user)}/></Tooltip>
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
        switch (status) {
            case 'Delivered': return 'green.200';
            case 'Shipped': return 'blue.200';
            case 'Cancelled': return 'red.200';
            case 'Processing':
            default: return 'gray.200';
        }
    };
    
    return (
      <Box p={{ base: 2, md: 4 }}>
        <Heading size="md" mb={4} color="brand.textDark">Order Management</Heading>
        {loadingOrders ? <VStack justifyContent="center" alignItems="center" minH="200px"><Spinner size="xl" /></VStack> :
        ordersError ? <Alert status="error" borderRadius="md"><AlertIcon />{ordersError}</Alert> :
        !orders.length ? <Text>No orders found.</Text> : (
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
                    <Td><Tag size="sm" colorScheme={order.paymentStatus === 'Succeeded' ? 'green' : 'orange'}>{order.paymentStatus || 'N/A'}</Tag></Td>
                    <Td>
                      <Select size="xs" value={order.orderStatus} onChange={(e) => handleStatusChange(order._id, e.target.value)} bg={getStatusColor(order.orderStatus)} borderColor={getStatusColor(order.orderStatus)} borderRadius="md" maxW="120px">
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </Select>
                    </Td>
                    <Td>{order.orderItems?.length || 0}</Td>
                    <Td>
                      <Tooltip label="View Order Details"><ChakraIconButton size="xs" variant="ghost" icon={<Icon as={FaEye} />} onClick={() => handleViewOrder(order._id)}/></Tooltip>
                      <Tooltip label="Delete Order"><ChakraIconButton size="xs" variant="ghost" icon={<Icon as={FaTrashAlt} />} onClick={() => handleOpenDeleteOrderDialog(order)}/></Tooltip>
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
    <Box p={{ base: 2, md: 4 }}>
      <Heading size="md" mb={4} color="brand.textDark">Design Management</Heading>
      {loadingDesigns ? <VStack justifyContent="center" alignItems="center" minH="200px"><Spinner size="xl" /></VStack> :
      designsError ? <Alert status="error" borderRadius="md"><AlertIcon />{designsError}</Alert> :
      !designs.length ? <Text>No designs found.</Text> : (
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>Preview</Th><Th>Prompt</Th><Th>Creator</Th><Th>Created</Th><Th>Contest?</Th><Th>Votes</Th><Th>Actions</Th></Tr></Thead>
            <Tbody>
              {designs.map((design) => (
                <Tr key={design._id}>
                  <Td><Image src={design.imageDataUrl} alt="Design" boxSize="50px" objectFit="cover" borderRadius="md"/></Td>
                  <Td maxW="200px" whiteSpace="normal" fontSize="xs">{design.prompt}</Td>
                  <Td>{design.user?.username || 'N/A'}</Td>
                  <Td>{new Date(design.createdAt).toLocaleDateString()}</Td>
                  <Td><Tag size="sm" colorScheme={design.isContestSubmission ? 'purple' : 'gray'}>{design.isContestSubmission ? 'Yes' : 'No'}</Tag></Td>
                  <Td>{design.votes || 0}</Td>
                  <Td>
                    <Tooltip label="View (Not Implemented)"><ChakraIconButton isDisabled size="xs" variant="ghost" icon={<Icon as={FaEye} />}/></Tooltip>
                    <Tooltip label="Delete (Not Implemented)"><ChakraIconButton isDisabled size="xs" variant="ghost" icon={<Icon as={FaTrashAlt} />}/></Tooltip>
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
              <Tab><Icon as={FaUsersCog} mr={2} /> Users</Tab>
              <Tab><Icon as={FaBoxOpen} mr={2} /> Orders</Tab>
              <Tab><Icon as={FaPalette} mr={2} /> Designs</Tab>
              <Tab><Icon as={FaWarehouse} mr={2} /> Inventory</Tab>
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
      {selectedUser && (
        <Modal isOpen={isViewUserModalOpen} onClose={onViewUserModalClose} size="xl" scrollBehavior="inside">
          <ModalOverlay />
          <ModalContent bg="brand.paper"><ModalHeader>User: {selectedUser.username}</ModalHeader><ModalCloseButton />
            <ModalBody><VStack spacing={3} align="start"><Text><strong>ID:</strong> {selectedUser._id}</Text>{/* ... and so on */}</VStack></ModalBody>
            <ModalFooter><Button onClick={onViewUserModalClose}>Close</Button></ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Edit User Modal */}
      {selectedUser && (
        <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="xl">
          <ModalOverlay />
          <ModalContent bg="brand.paper"><ModalHeader>Edit: {selectedUser.username}</ModalHeader><ModalCloseButton />
            <ModalBody overflowY="auto" maxHeight="70vh"><VStack spacing={4} align="stretch">{/* ... form controls ... */}</VStack></ModalBody>
            <ModalFooter><Button onClick={onEditModalClose} mr={3}>Cancel</Button><Button onClick={handleSaveChanges} colorScheme="brandPrimary">Save</Button></ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Delete User Modal */}
      {selectedUser && (
        <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose} isCentered>
          <ModalOverlay />
          <ModalContent bg="brand.paper"><ModalHeader>Confirm Deletion</ModalHeader><ModalCloseButton />
            <ModalBody><Text>Delete <strong>{selectedUser.username}</strong>?</Text><Text mt={2} color="red.500">This cannot be undone.</Text></ModalBody>
            <ModalFooter><Button onClick={onDeleteModalClose} mr={3}>Cancel</Button><Button onClick={confirmDeleteUser} colorScheme="red">Delete</Button></ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Delete Order Modal */}
      {orderToDelete && (
          <Modal isOpen={isDeleteOrderModalOpen} onClose={onDeleteOrderModalClose} isCentered>
              <ModalOverlay />
              <ModalContent bg="brand.paper"><ModalHeader>Confirm Deletion</ModalHeader><ModalCloseButton />
                  <ModalBody><Text>Delete order <strong>{orderToDelete._id}</strong>?</Text><Alert status="warning" mt={4}><AlertIcon />Does NOT issue a refund in Stripe.</Alert></ModalBody>
                  <ModalFooter><Button onClick={onDeleteOrderModalClose} mr={3}>Cancel</Button><Button colorScheme="red" onClick={confirmDeleteOrder}>Delete</Button></ModalFooter>
              </ModalContent>
          </Modal>
      )}

      {/* View Order Details Modal */}
      <Modal isOpen={isViewOrderModalOpen} onClose={() => { onViewOrderModalClose(); setSelectedOrder(null); }} size="4xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent bg="brand.paper" color="brand.textDark">
          <ModalHeader>Order Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {loadingSelectedOrder ? (<VStack justifyContent="center" minH="300px"><Spinner size="xl" /></VStack>) : 
            selectedOrder && (
              <VStack spacing={6} align="stretch">
                <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)"}} gap={6}>
                  <GridItem>
                    <Heading size="sm" mb={2}>Customer Info</Heading>
                    <Text><strong>Name:</strong> {selectedOrder.user?.firstName || ''} {selectedOrder.user?.lastName || ''}</Text>
                    <Text><strong>Email:</strong> {selectedOrder.user?.email}</Text>
                    <Text><strong>Username:</strong> {selectedOrder.user?.username}</Text>
                  </GridItem>
                  <GridItem>
                    <Heading size="sm" mb={2}>Order Summary</Heading>
                    <Text><strong>Order ID:</strong> {selectedOrder._id}</Text>
                    <Text><strong>Date:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</Text>
                    <Text><strong>Total:</strong> <Tag colorScheme='green' size="md">${(selectedOrder.totalAmount / 100).toFixed(2)}</Tag></Text>
                  </GridItem>
                </Grid>
                <Box>
                    <Heading size="sm" mb={2}>Shipping Address</Heading>
                    <Text>{selectedOrder.shippingAddress.recipientName}</Text>
                    <Text>{selectedOrder.shippingAddress.street1}</Text>
                    {selectedOrder.shippingAddress.street2 && <Text>{selectedOrder.shippingAddress.street2}</Text>}
                    <Text>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}</Text>
                    <Text>{selectedOrder.shippingAddress.country}</Text>
                </Box>
                <Divider />
                <Box>
                  <Heading size="sm" mb={4}>Items ({selectedOrder.orderItems.length})</Heading>
                  <VStack spacing={4} align="stretch">
                    {selectedOrder.orderItems.map((item, index) => (
                      <Flex key={index} p={3} borderWidth="1px" borderRadius="md" alignItems="center" flexWrap="wrap">
                        <Image src={item.designId?.imageDataUrl || 'https://via.placeholder.com/100'} boxSize="100px" objectFit="cover" borderRadius="md" mr={4} mb={{base: 2, md: 0}} />
                        <VStack align="start" spacing={1} fontSize="sm">
                           <Text fontWeight="bold">{item.productName}</Text>
                           <Text><strong>SKU:</strong> {item.variantSku}</Text>
                           <Text><strong>Color:</strong> {item.color} | <strong>Size:</strong> {item.size}</Text>
                           <Text><strong>Quantity:</strong> {item.quantity}</Text>
                           <Text><strong>Price/Item:</strong> ${(item.priceAtPurchase / 100).toFixed(2)}</Text>
                           <Tooltip label={item.designId?.prompt}><Text isTruncated maxW="400px"><strong>Prompt:</strong> {item.designId?.prompt || 'N/A'}</Text></Tooltip>
                        </VStack>
                      </Flex>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter><Button onClick={() => { onViewOrderModalClose(); setSelectedOrder(null); }}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AdminPage;
