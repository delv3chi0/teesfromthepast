// frontend/src/pages/AdminPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, Text, VStack, Tabs, TabList, TabPanels, Tab, TabPanel, Icon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Spinner, Alert, AlertIcon,
  Button, useToast, Tag, Image,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure,
  FormControl, FormLabel, Input, Switch, InputGroup, InputRightElement, IconButton as ChakraIconButton,
  Divider, Tooltip, SimpleGrid, Flex, Grid, GridItem
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
  
  // --- NEW STATE FOR ORDER VIEW MODAL ---
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

  // --- NEW DISCLOSURE FOR ORDER VIEW MODAL ---
  const { isOpen: isViewOrderModalOpen, onOpen: onViewOrderModalOpen, onClose: onViewOrderModalClose } = useDisclosure();

  const [editFormData, setEditFormData] = useState({
    username: '', email: '', firstName: '', lastName: '', isAdmin: false, newPassword: '', confirmNewPassword: '',
  });
  const [showNewPasswordInModal, setShowNewPasswordInModal] = useState(false);
  const [showConfirmNewPasswordInModal, setShowConfirmNewPasswordInModal] = useState(false);

  const fetchUsers = useCallback(async () => { /* ... No changes here ... */ }, [token]);
  const fetchOrders = useCallback(async () => { /* ... No changes here ... */ }, [token]);
  const fetchDesigns = useCallback(async () => { /* ... No changes here ... */ }, [token]);
  useEffect(() => { /* ... No changes here ... */ }, [token, fetchUsers, fetchOrders, fetchDesigns]);
  
  // --- USER MANAGEMENT FUNCTIONS (NO CHANGES) ---
  const handleViewUser = (user) => { setSelectedUser(user); onViewUserModalOpen(); };
  const handleOpenEditUser = (user) => { /* ... No changes here ... */ };
  const handleEditFormChange = (e) => { /* ... No changes here ... */ };
  const handleSaveChanges = async () => { /* ... No changes here ... */ };
  const handleOpenDeleteUser = (user) => { setSelectedUser(user); onDeleteModalOpen(); };
  const confirmDeleteUser = async () => { /* ... No changes here ... */ };
  const handleOpenDeleteOrderDialog = (order) => { /* ... No changes here ... */ };
  const confirmDeleteOrder = async () => { /* ... No changes here ... */ };

  // === NEW FUNCTION START: handleViewOrder ===
  const handleViewOrder = async (orderId) => {
    setLoadingSelectedOrder(true);
    onViewOrderModalOpen();
    try {
      const { data } = await client.get(`/admin/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedOrder(data);
    } catch (e) {
      toast({ title: "Error Fetching Order", description: e.response?.data?.message || "Could not load order details.", status: "error" });
      onViewOrderModalClose(); // Close modal on error
    } finally {
      setLoadingSelectedOrder(false);
    }
  };
  // === NEW FUNCTION END ===

  const UsersPanel = () => (
    <Box p={{ base: 2, md: 4 }}>
      <Heading size="md" mb={4} color="brand.textDark">User Management</Heading>
      {loadingUsers && ( <VStack justifyContent="center" alignItems="center" minH="200px"><Spinner size="xl" color="brand.primary" /><Text mt={2} color="brand.textDark">Loading users...</Text></VStack> )}
      {!loadingUsers && usersError && ( <Alert status="error" borderRadius="md"><AlertIcon />{usersError}</Alert> )}
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
                    {/* === MODIFIED: Enabled the View Order button === */}
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

  const DesignsPanel = () => ( /* ... No changes here ... */ );

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

      {/* --- ALL USER MODALS (NO CHANGES) --- */}
      {selectedUser && ( <Modal isOpen={isViewUserModalOpen} onClose={onViewUserModalClose}>{/* ... */}</Modal> )}
      {selectedUser && ( <Modal isOpen={isEditModalOpen} onClose={onEditModalClose}>{/* ... */}</Modal> )}
      {selectedUser && ( <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose}>{/* ... */}</Modal> )}
      {orderToDelete && ( <Modal isOpen={isDeleteOrderModalOpen} onClose={onDeleteOrderModalClose}>{/* ... */}</Modal> )}

      {/* === NEW MODAL START: View Order Details === */}
      <Modal isOpen={isViewOrderModalOpen} onClose={onViewOrderModalClose} size="4xl" scrollBehavior="inside">
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
                <Grid templateColumns="repeat(2, 1fr)" gap={6}>
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
                      <Flex key={index} p={3} borderWidth="1px" borderRadius="md" alignItems="center">
                        <Image
                          src={item.designId?.imageDataUrl || 'https://via.placeholder.com/100?text=No+Design'}
                          boxSize="100px"
                          objectFit="cover"
                          borderRadius="md"
                          mr={4}
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
            <Button onClick={onViewOrderModalClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* === NEW MODAL END === */}
    </Box>
  );
};

export default AdminPage;
