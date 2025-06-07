// frontend/src/pages/AdminPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, Text, VStack, Tabs, TabList, TabPanels, Tab, TabPanel, Icon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Spinner, Alert, AlertIcon,
  Button, useToast, Tag, Image, Select, // Added Select to imports
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

  const fetchUsers = useCallback(async () => { /* ... Unchanged ... */ }, [token]);
  const fetchOrders = useCallback(async () => { /* ... Unchanged ... */ }, [token]);
  const fetchDesigns = useCallback(async () => { /* ... Unchanged ... */ }, [token]);
  useEffect(() => { if (token) { fetchUsers(); fetchOrders(); fetchDesigns(); } }, [token, fetchUsers, fetchOrders, fetchDesigns]);
  
  const handleViewUser = (user) => { setSelectedUser(user); onViewUserModalOpen(); };
  const handleOpenEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({ username: user.username, email: user.email, firstName: user.firstName || '', lastName: user.lastName || '', isAdmin: user.isAdmin, newPassword: '', confirmNewPassword: '' });
    setShowNewPasswordInModal(false); setShowConfirmNewPasswordInModal(false);
    onEditModalOpen();
  };
  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: type === 'checkbox' || type === 'switch' ? checked : value }));
  };
  const handleSaveChanges = async () => { /* ... Unchanged ... */ };
  const handleOpenDeleteUser = (user) => { setSelectedUser(user); onDeleteModalOpen(); };
  const confirmDeleteUser = async () => { /* ... Unchanged ... */ };
  const handleOpenDeleteOrderDialog = (order) => { setOrderToDelete(order); onDeleteOrderModalOpen(); };
  const confirmDeleteOrder = async () => { /* ... Unchanged ... */ };
  const handleViewOrder = async (orderId) => {
    setLoadingSelectedOrder(true);
    onViewOrderModalOpen();
    try {
      const { data } = await client.get(`/admin/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedOrder(data);
    } catch (e) {
      toast({ title: "Error Fetching Order", description: e.response?.data?.message || "Could not load order details.", status: "error" });
      onViewOrderModalClose();
    } finally {
      setLoadingSelectedOrder(false);
    }
  };

  // === NEW FUNCTION START: handleStatusChange ===
  const handleStatusChange = async (orderId, newStatus) => {
    const originalOrders = [...orders];
    const orderToUpdate = orders.find(o => o._id === orderId);
    const oldStatus = orderToUpdate?.orderStatus;

    // Optimistically update the UI
    setOrders(prevOrders =>
      prevOrders.map(o => (o._id === orderId ? { ...o, orderStatus: newStatus } : o))
    );

    try {
      await client.put(`/api/admin/orders/${orderId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}.`,
        status: "success",
        duration: 2000
      });
    } catch (e) {
      // If error, revert the UI change and show error toast
      setOrders(originalOrders);
      toast({
        title: "Update Failed",
        description: e.response?.data?.message || `Could not update status to ${newStatus}.`,
        status: "error"
      });
    }
  };
  // === NEW FUNCTION END ===

  const UsersPanel = () => ( /* ... Unchanged ... */ );

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
                      <Td>
                        {/* === MODIFIED: Replaced Tag with interactive Select dropdown === */}
                        <Select
                          size="xs"
                          value={order.orderStatus}
                          onChange={(e) => handleStatusChange(order._id, e.target.value)}
                          bg={getStatusColor(order.orderStatus)}
                          borderColor={getStatusColor(order.orderStatus)}
                          borderRadius="full"
                          maxW="120px"
                        >
                          <option value="Processing">Processing</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </Select>
                      </Td>
                      <Td>{order.orderItems?.length || 0}</Td>
                      <Td>
                        <Tooltip label="View Order Details"><ChakraIconButton size="xs" variant="ghost" colorScheme="blue" icon={<Icon as={FaEye} />} mr={1} aria-label="View Order" onClick={() => handleViewOrder(order._id)}/></Tooltip>
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
  };

  const DesignsPanel = () => ( /* ... Unchanged ... */ );

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

      {/* --- ALL MODALS (UNCHANGED EXCEPT FOR VIEW ORDER MODAL) --- */}
      {/* View User Modal */}
      {selectedUser && ( <Modal isOpen={isViewUserModalOpen} onClose={onViewUserModalClose} size="xl" scrollBehavior="inside"> {/* ... */} </Modal> )}
      {/* Edit User Modal */}
      {selectedUser && ( <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="xl"> {/* ... */} </Modal> )}
      {/* Delete User Confirmation Modal */}
      {selectedUser && ( <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose} isCentered> {/* ... */} </Modal> )}
      {/* Delete Order Confirmation Modal */}
      {orderToDelete && ( <Modal isOpen={isDeleteOrderModalOpen} onClose={onDeleteOrderModalClose} isCentered> {/* ... */} </Modal> )}

      {/* View Order Details Modal */}
      <Modal isOpen={isViewOrderModalOpen} onClose={() => { onViewOrderModalClose(); setSelectedOrder(null); }} size="4xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent bg="brand.paper" color="brand.textDark">
          <ModalHeader>Order Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {loadingSelectedOrder && (
              <VStack justifyContent="center" alignItems="center" minH="300px">
                <Spinner size="xl" />
                <Text mt={3}>Loading Order Details...</Text>
              </VStack>
            )}
            {!loadingSelectedOrder && selectedOrder && (
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
                  <Heading size="sm" mb={4}>Items in this Order ({selectedOrder.orderItems.length})</Heading>
                  <VStack spacing={4} align="stretch">
                    {selectedOrder.orderItems.map((item, index) => (
                      <Flex key={index} p={3} borderWidth="1px" borderRadius="md" alignItems="center" flexWrap="wrap">
                        <Image
                          src={item.designId?.imageDataUrl || 'https://via.placeholder.com/100?text=No+Design'}
                          boxSize="100px"
                          objectFit="cover"
                          borderRadius="md"
                          mr={4}
                          mb={{base: 2, md: 0}}
                        />
                        <VStack align="start" spacing={1} fontSize="sm">
                           <Text fontWeight="bold">{item.productName}</Text>
                           <Text><strong>SKU:</strong> {item.variantSku}</Text>
                           <Text><strong>Color:</strong> {item.color} | <strong>Size:</strong> {item.size}</Text>
                           <Text><strong>Quantity:</strong> {item.quantity}</Text>
                           <Text><strong>Price/Item:</strong> ${(item.priceAtPurchase / 100).toFixed(2)}</Text>
                           <Tooltip label={item.designId?.prompt} placement="bottom-start">
                             <Text isTruncated maxW="400px"><strong>Prompt:</strong> {item.designId?.prompt || 'N/A'}</Text>
                           </Tooltip>
                        </VStack>
                      </Flex>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => { onViewOrderModalClose(); setSelectedOrder(null); }}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AdminPage;
