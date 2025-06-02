// frontend/src/pages/AdminPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, Text, VStack, Tabs, TabList, TabPanels, Tab, TabPanel, Icon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Spinner, Alert, AlertIcon,
  Button, useToast, Tag, Image, // Added Image for design previews
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure,
  FormControl, FormLabel, Input, Switch
} from '@chakra-ui/react';
import { FaUsersCog, FaBoxOpen, FaPalette, FaEdit, FaTrashAlt, FaEye } from 'react-icons/fa';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';

const AdminPage = () => {
  console.log("[AdminPage] Rendering Admin Page...");
  const toast = useToast();
  const { token } = useAuth();

  // State for Users Tab
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  // State for Orders Tab
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  // Add selectedOrder and modal states for orders later

  // State for Designs Tab
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [designsError, setDesignsError] = useState('');
  // Add selectedDesign and modal states for designs later

  // Modal disclosures for Users
  const { isOpen: isViewModalOpen, onOpen: onViewModalOpen, onClose: onViewModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();

  // State for editing user
  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    isAdmin: false,
    // Add other editable user fields here if needed
  });

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    if (!token) {
      setUsersError("Authentication token not found. Cannot fetch users.");
      setLoadingUsers(false);
      return;
    }
    setLoadingUsers(true);
    setUsersError('');
    try {
      console.log("[AdminPage] Fetching users from /api/admin/users...");
      const response = await client.get('/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("[AdminPage] Users fetched successfully:", response.data);
      setUsers(response.data);
    } catch (error) {
      console.error("[AdminPage] Error fetching users:", error.response?.data?.message || error.message);
      setUsersError(error.response?.data?.message || 'Failed to fetch users.');
      if (error.response?.status === 403) {
        setUsersError('Access Denied. You might not have admin privileges to view users.');
      }
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    if (!token) {
      setOrdersError("Authentication token not found. Cannot fetch orders.");
      setLoadingOrders(false);
      return;
    }
    setLoadingOrders(true);
    setOrdersError('');
    try {
      console.log("[AdminPage] Fetching orders from /admin/orders...");
      // TODO: Implement pagination if needed: client.get('/api/admin/orders?page=1&limit=20')
      const response = await client.get('/admin/orders', { // Ensure this endpoint exists and is protected
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("[AdminPage] Orders fetched successfully:", response.data);
      // Adjust 'response.data.orders' if your API returns data differently (e.g., just response.data if it's an array)
      setOrders(response.data.orders || response.data || []);
    } catch (error) {
      console.error("[AdminPage] Error fetching orders:", error.response?.data?.message || error.message);
      setOrdersError(error.response?.data?.message || 'Failed to fetch orders.');
    } finally {
      setLoadingOrders(false);
    }
  }, [token]);

  // Fetch Designs
  const fetchDesigns = useCallback(async () => {
    if (!token) {
      setDesignsError("Authentication token not found. Cannot fetch designs.");
      setLoadingDesigns(false);
      return;
    }
    setLoadingDesigns(true);
    setDesignsError('');
    try {
      console.log("[AdminPage] Fetching designs from /admin/designs...");
      // TODO: Implement pagination if needed
      const response = await client.get('/admin/designs', { 
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("[AdminPage] Designs fetched successfully:", response.data);
      // Adjust 'response.data.designs' if your API returns data differently
      setDesigns(response.data.designs || response.data || []);
    } catch (error) {
      console.error("[AdminPage] Error fetching designs:", error.response?.data?.message || error.message);
      setDesignsError(error.response?.data?.message || 'Failed to fetch designs.');
    } finally {
      setLoadingDesigns(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) { // Only fetch if token is available
      fetchUsers();
      fetchOrders();
      fetchDesigns();
    }
  }, [token, fetchUsers, fetchOrders, fetchDesigns]); // Add fetch functions to dependency array

  // Handlers for User Actions
  const handleViewUser = (user) => {
    setSelectedUser(user);
    onViewModalOpen();
  };

  const handleOpenEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      isAdmin: user.isAdmin,
      // Pre-fill other editable fields if added
    });
    onEditModalOpen();
  };

  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' || type === 'switch' ? checked : value,
    }));
  };

  const handleSaveChanges = async () => {
    if (!selectedUser) return;
    console.log(`[AdminPage] Attempting to save changes for user ID: ${selectedUser._id}`, editFormData);
    try {
      const { data: updatedUser } = await client.put(`/admin/users/${selectedUser._id}`, editFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({
        title: "User Updated",
        description: `User ${updatedUser.username} has been updated successfully.`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      setUsers(prevUsers => prevUsers.map(u => u._id === updatedUser._id ? updatedUser : u));
      onEditModalClose();
      setSelectedUser(null);
    } catch (error) {
      console.error("[AdminPage] Error updating user:", error.response?.data?.message || error.message);
      toast({
        title: "Update Failed",
        description: error.response?.data?.message || "Could not update user.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleOpenDeleteUser = (user) => {
    setSelectedUser(user);
    onDeleteModalOpen();
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    console.log(`[AdminPage] Attempting to delete user ID: ${selectedUser._id}`);
    try {
      await client.delete(`/admin/users/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({
        title: "User Deleted",
        description: `User ${selectedUser.username} has been deleted successfully.`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      setUsers(prevUsers => prevUsers.filter(u => u._id !== selectedUser._id));
      onDeleteModalClose();
      setSelectedUser(null);
    } catch (error) {
      console.error("[AdminPage] Error deleting user:", error.response?.data?.message || error.message);
      toast({
        title: "Delete Failed",
        description: error.response?.data?.message || "Could not delete user.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Panel Components
  const UsersPanel = () => (
    <Box p={{ base: 2, md: 4 }}>
      <Heading size="md" mb={4}>User Management</Heading>
      {loadingUsers && (
        <VStack justifyContent="center" alignItems="center" minH="200px">
          <Spinner size="xl" thickness="4px" color="brand.primary" />
          <Text mt={3}>Loading users...</Text>
        </VStack>
      )}
      {!loadingUsers && usersError && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {usersError}
        </Alert>
      )}
      {!loadingUsers && !usersError && users.length === 0 && (
        <Text>No users found.</Text>
      )}
      {!loadingUsers && !usersError && users.length > 0 && (
        <TableContainer>
          <Table variant="simple" size="sm">
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
                  <Td>{user.firstName || ''} {user.lastName || ''}</Td>
                  <Td>
                    <Tag size="sm" colorScheme={user.isAdmin ? 'green' : 'gray'} borderRadius="full">
                      {user.isAdmin ? 'Yes' : 'No'}
                    </Tag>
                  </Td>
                  <Td fontSize="xs">{new Date(user.createdAt).toLocaleDateString()}</Td>
                  <Td>
                    <Button size="xs" variant="ghost" colorScheme="blue" onClick={() => handleViewUser(user)} mr={1} title="View">
                      <Icon as={FaEye} />
                    </Button>
                    <Button size="xs" variant="ghost" colorScheme="yellow" onClick={() => handleOpenEditUser(user)} mr={1} title="Edit">
                      <Icon as={FaEdit} />
                    </Button>
                    <Button size="xs" variant="ghost" colorScheme="red" onClick={() => handleOpenDeleteUser(user)} title="Delete">
                      <Icon as={FaTrashAlt} />
                    </Button>
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
      <Heading size="md" mb={4}>Order Management</Heading>
      {loadingOrders && (
        <VStack justifyContent="center" alignItems="center" minH="200px">
          <Spinner size="xl" thickness="4px" color="brand.primary" />
          <Text mt={3}>Loading orders...</Text>
        </VStack>
      )}
      {!loadingOrders && ordersError && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {ordersError}
        </Alert>
      )}
      {!loadingOrders && !ordersError && orders.length === 0 && (
        <Text>No orders found.</Text>
      )}
      {!loadingOrders && !ordersError && orders.length > 0 && (
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Order ID</Th>
                <Th>User Email</Th>
                <Th>Date</Th>
                <Th>Total</Th>
                <Th>Status</Th>
                <Th># Items</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {orders.map((order) => (
                <Tr key={order._id}>
                  <Td fontSize="xs" title={order._id}>{order._id?.substring(0, 8)}...</Td>
                  {/* Adjust order.user.email based on how your API populates user data for an order */}
                  <Td>{order.user?.email || order.userId || 'N/A'}</Td>
                  <Td>{new Date(order.createdAt).toLocaleDateString()}</Td>
                  <Td>${order.totalAmount?.toFixed(2) || '0.00'}</Td>
                  <Td>
                    <Tag size="sm" colorScheme={
                      order.orderStatus === 'Delivered' ? 'green' :
                      order.orderStatus === 'Shipped' ? 'blue' :
                      order.orderStatus === 'Processing' ? 'yellow' :
                      order.orderStatus === 'Pending' ? 'orange' : 'gray'
                    } borderRadius="full">
                      {order.orderStatus || 'N/A'}
                    </Tag>
                  </Td>
                  <Td>{order.items?.length || 0}</Td>
                  <Td>
                    <Button size="xs" variant="ghost" colorScheme="blue" onClick={() => alert(`View Order: ${order._id}`)} mr={1} title="View Order">
                      <Icon as={FaEye} />
                    </Button>
                    {/* Add Edit Status button later */}
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
      <Heading size="md" mb={4}>Design Management</Heading>
      {loadingDesigns && (
        <VStack justifyContent="center" alignItems="center" minH="200px">
          <Spinner size="xl" thickness="4px" color="brand.primary" />
          <Text mt={3}>Loading designs...</Text>
        </VStack>
      )}
      {!loadingDesigns && designsError && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {designsError}
        </Alert>
      )}
      {!loadingDesigns && !designsError && designs.length === 0 && (
        <Text>No designs found.</Text>
      )}
      {!loadingDesigns && !designsError && designs.length > 0 && (
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Preview</Th>
                <Th maxW="200px">Prompt</Th>
                <Th>Creator</Th>
                <Th>Created At</Th>
                <Th>Contest?</Th>
                <Th>Votes</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {designs.map((design) => (
                <Tr key={design._id}>
                  <Td>
                    {design.imageDataUrl ? (
                        <Image src={design.imageDataUrl} alt="Design preview" boxSize="50px" objectFit="cover" borderRadius="md" />
                    ) : (
                        <Box boxSize="50px" bg="gray.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                            <Text fontSize="xs" color="gray.500">No Preview</Text>
                        </Box>
                    )}
                  </Td>
                  <Td maxW="200px" whiteSpace="normal" wordBreak="break-word" fontSize="xs">{design.prompt}</Td>
                  {/* Adjust design.user.username based on how your API populates user data for a design */}
                  <Td>{design.user?.username || design.userId || 'N/A'}</Td>
                  <Td>{new Date(design.createdAt).toLocaleDateString()}</Td>
                  <Td>
                    <Tag size="sm" colorScheme={design.isContestSubmission ? 'purple' : 'gray'} borderRadius="full">
                        {design.isContestSubmission ? 'Yes' : 'No'}
                    </Tag>
                  </Td>
                  <Td>{design.votes || 0}</Td>
                  <Td>
                    <Button size="xs" variant="ghost" colorScheme="blue" onClick={() => alert(`View Design: ${design._id}`)} mr={1} title="View Design">
                      <Icon as={FaEye} />
                    </Button>
                    <Button size="xs" variant="ghost" colorScheme="red" onClick={() => alert(`Delete Design: ${design._id}`)} title="Delete Design">
                      <Icon as={FaTrashAlt} />
                    </Button>
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
    <Box pt={{ base: "20px", md: "20px", xl: "20px" }} px={{ base: "2", md: "4" }} w="100%">
      <VStack spacing={6} align="stretch">
        <Heading
          as="h1"
          fontSize={{ base: "2xl", md: "3xl" }}
          color="brand.textLight" // Assuming this is for a dark orange background from MainLayout
          textAlign="left"
          w="100%"
        >
          Admin Dashboard
        </Heading>

        <Box bg="brand.paper" borderRadius="xl" shadow="xl" p={{ base: 2, md: 4 }}> {/* Ensure brand.paper is defined */}
          <Tabs variant="soft-rounded" colorScheme="brandPrimary" isLazy> {/* Ensure brandPrimary colorScheme is defined */}
            <TabList mb="1em" flexWrap="wrap">
              <Tab _selected={{ color: 'white', bg: 'brand.primary' }} borderRadius="full" m={1}>
                <Icon as={FaUsersCog} mr={2} /> Users
              </Tab>
              <Tab _selected={{ color: 'white', bg: 'brand.primary' }} borderRadius="full" m={1}>
                <Icon as={FaBoxOpen} mr={2} /> Orders
              </Tab>
              <Tab _selected={{ color: 'white', bg: 'brand.primary' }} borderRadius="full" m={1}>
                <Icon as={FaPalette} mr={2} /> Designs
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0} py={2}><UsersPanel /></TabPanel>
              <TabPanel px={0} py={2}><OrdersPanel /></TabPanel>
              <TabPanel px={0} py={2}><DesignsPanel /></TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </VStack>

      {/* View User Modal */}
      {selectedUser && (
        <Modal isOpen={isViewModalOpen} onClose={onViewModalClose} size="xl" scrollBehavior="inside">
          <ModalOverlay />
          <ModalContent bg="brand.paper">
            <ModalHeader color="brand.textDark">User Details: {selectedUser.username}</ModalHeader>
            <ModalCloseButton />
            <ModalBody color="brand.textDark">
              <VStack spacing={3} align="start">
                <Text><strong>ID:</strong> {selectedUser._id}</Text>
                <Text><strong>Username:</strong> {selectedUser.username}</Text>
                <Text><strong>Email:</strong> {selectedUser.email}</Text>
                <Text><strong>First Name:</strong> {selectedUser.firstName || 'N/A'}</Text>
                <Text><strong>Last Name:</strong> {selectedUser.lastName || 'N/A'}</Text>
                <Text><strong>Admin:</strong> <Tag size="sm" colorScheme={selectedUser.isAdmin ? 'green' : 'gray'} borderRadius="full">{selectedUser.isAdmin ? 'Yes' : 'No'}</Tag></Text>
                <Text><strong>Avatar URL:</strong> {selectedUser.avatarUrl || 'N/A'}</Text>
                <Text><strong>Stripe Customer ID:</strong> {selectedUser.stripeCustomerId || 'N/A'}</Text>
                {selectedUser.address && ( // Example for nested address object
                  <Box border="1px solid" borderColor="gray.200" p={3} borderRadius="md" w="100%">
                    <Text fontWeight="bold" mb={2}>Primary Address:</Text>
                    <Text>Street: {selectedUser.address.street || 'N/A'}</Text>
                    <Text>City: {selectedUser.address.city || 'N/A'}</Text>
                    <Text>State: {selectedUser.address.state || 'N/A'}</Text>
                    <Text>Zip Code: {selectedUser.address.zipCode || 'N/A'}</Text>
                    <Text>Country: {selectedUser.address.country || 'N/A'}</Text>
                  </Box>
                )}
                <Text><strong>Joined:</strong> {new Date(selectedUser.createdAt).toLocaleString()}</Text>
                <Text><strong>Last Updated:</strong> {new Date(selectedUser.updatedAt).toLocaleString()}</Text>
                {/* Add other fields from your User model here */}
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button onClick={onViewModalClose} bg="brand.secondary" _hover={{bg: "brand.secondaryDark"}}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Edit User Modal */}
      {selectedUser && (
        <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="xl">
          <ModalOverlay />
          <ModalContent bg="brand.paper">
            <ModalHeader color="brand.textDark">Edit User: {selectedUser.username}</ModalHeader>
            <ModalCloseButton />
            <ModalBody color="brand.textDark">
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Username</FormLabel>
                  <Input name="username" value={editFormData.username} onChange={handleEditFormChange} bg="white" borderColor="gray.300"/>
                </FormControl>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input type="email" name="email" value={editFormData.email} onChange={handleEditFormChange} bg="white" borderColor="gray.300"/>
                </FormControl>
                <FormControl>
                  <FormLabel>First Name</FormLabel>
                  <Input name="firstName" value={editFormData.firstName} onChange={handleEditFormChange} bg="white" borderColor="gray.300"/>
                </FormControl>
                <FormControl>
                  <FormLabel>Last Name</FormLabel>
                  <Input name="lastName" value={editFormData.lastName} onChange={handleEditFormChange} bg="white" borderColor="gray.300"/>
                </FormControl>
                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="isAdmin-switch" mb="0">
                    Administrator Status
                  </FormLabel>
                  <Switch id="isAdmin-switch" name="isAdmin" isChecked={editFormData.isAdmin} onChange={handleEditFormChange} colorScheme="green" />
                </FormControl>
                 {/* Add form controls for other editable user fields here */}
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button onClick={onEditModalClose} mr={3} variant="ghost">Cancel</Button>
              <Button onClick={handleSaveChanges} bg="brand.primary" color="white" _hover={{bg: "brand.primaryDark"}}>Save Changes</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Delete User Confirmation Modal */}
      {selectedUser && (
        <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose} isCentered>
            <ModalOverlay />
            <ModalContent bg="brand.paper">
                <ModalHeader color="brand.textDark">Confirm Deletion</ModalHeader>
                <ModalCloseButton />
                <ModalBody color="brand.textDark">
                    <Text>Are you sure you want to delete user <strong>{selectedUser.username}</strong> (ID: {selectedUser._id})?</Text>
                    <Text mt={2} color="red.500" fontWeight="bold">This action cannot be undone.</Text>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={onDeleteModalClose} mr={3} variant="ghost">Cancel</Button>
                    <Button onClick={confirmDeleteUser} colorScheme="red">Delete User</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
      )}
    </Box>
  );
};

export default AdminPage;
