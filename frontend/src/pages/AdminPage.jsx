// frontend/src/pages/AdminPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, Text, VStack, Tabs, TabList, TabPanels, Tab, TabPanel, Icon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Spinner, Alert, AlertIcon,
  Button, useToast, Tag, Image,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure,
  FormControl, FormLabel, Input, Switch, InputGroup, InputRightElement, IconButton as ChakraIconButton, // For password visibility
  Divider, // For visual separation in modal
} from '@chakra-ui/react';
import { FaUsersCog, FaBoxOpen, FaPalette, FaEdit, FaTrashAlt, FaEye, FaKey, FaEyeSlash } from 'react-icons/fa'; // Added FaKey, FaEyeSlash
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

  // State for Designs Tab
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [designsError, setDesignsError] = useState('');

  const { isOpen: isViewModalOpen, onOpen: onViewModalOpen, onClose: onViewModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();

  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    isAdmin: false,
    newPassword: '', // For admin changing user password
    confirmNewPassword: '', // Confirmation for the new password
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);


  const fetchUsers = useCallback(async () => {
    if (!token) { /* ... */ return; } setLoadingUsers(true); setUsersError('');
    try { const response = await client.get('/admin/users', { headers: { Authorization: `Bearer ${token}` } }); setUsers(response.data); }
    catch (error) { setUsersError(error.response?.data?.message || 'Failed to fetch users.'); if (error.response?.status === 403) { setUsersError('Access Denied.'); } }
    finally { setLoadingUsers(false); }
  }, [token]);

  const fetchOrders = useCallback(async () => {
    if (!token) { /* ... */ return; } setLoadingOrders(true); setOrdersError('');
    try { const response = await client.get('/admin/orders', { headers: { Authorization: `Bearer ${token}` } }); setOrders(response.data.orders || response.data || []); }
    catch (error) { setOrdersError(error.response?.data?.message || 'Failed to fetch orders.'); }
    finally { setLoadingOrders(false); }
  }, [token]);

  const fetchDesigns = useCallback(async () => {
    if (!token) { /* ... */ return; } setLoadingDesigns(true); setDesignsError('');
    try { const response = await client.get('/admin/designs', { headers: { Authorization: `Bearer ${token}` } }); setDesigns(response.data.designs || response.data || []); }
    catch (error) { setDesignsError(error.response?.data?.message || 'Failed to fetch designs.'); }
    finally { setLoadingDesigns(false); }
  }, [token]);

  useEffect(() => {
    if (token) { fetchUsers(); fetchOrders(); fetchDesigns(); }
  }, [token, fetchUsers, fetchOrders, fetchDesigns]);

  const handleViewUser = (user) => { setSelectedUser(user); onViewModalOpen(); };

  const handleOpenEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      isAdmin: user.isAdmin,
      newPassword: '', // Reset password fields
      confirmNewPassword: '',
    });
    setShowNewPassword(false); // Reset password visibility
    setShowConfirmNewPassword(false);
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

    // Password validation
    if (editFormData.newPassword && editFormData.newPassword !== editFormData.confirmNewPassword) {
      toast({ title: "Password Mismatch", description: "New passwords do not match.", status: "error", duration: 5000, isClosable: true });
      return;
    }
    if (editFormData.newPassword && editFormData.newPassword.length < 6) { // Example: min length 6
        toast({ title: "Password Too Short", description: "New password must be at least 6 characters long.", status: "error", duration: 5000, isClosable: true });
        return;
    }

    const payload = { ...editFormData };
    if (!payload.newPassword) { // Don't send password fields if not changing
      delete payload.newPassword;
      delete payload.confirmNewPassword;
    }
    // confirmNewPassword is not needed in the payload to backend
    if (payload.confirmNewPassword) delete payload.confirmNewPassword;


    console.log(`[AdminPage] Attempting to save changes for user ID: ${selectedUser._id}`, payload);
    try {
      // IMPORTANT: Your backend MUST securely hash payload.newPassword if it's present.
      // DO NOT store plaintext passwords.
      const { data: updatedUser } = await client.put(`/admin/users/${selectedUser._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({
        title: "User Updated",
        description: `User ${updatedUser.username} has been updated. ${payload.newPassword ? 'Password has been changed.' : ''}`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      setUsers(prevUsers => prevUsers.map(u => u._id === updatedUser._id ? updatedUser : u));
      onEditModalClose();
      setSelectedUser(null);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error.response?.data?.message || "Could not update user.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleOpenDeleteUser = (user) => { /* ... */ };
  const confirmDeleteUser = async () => { /* ... */ };

  const UsersPanel = () => ( /* ... existing unchanged UsersPanel code ... */ );
  const OrdersPanel = () => ( /* ... existing OrdersPanel code with currency fix ... */ );
  const DesignsPanel = () => ( /* ... existing DesignsPanel code ... */ );

  // --- PASTE PREVIOUSLY PROVIDED UsersPanel, OrdersPanel, DesignsPanel here ---
  // UsersPanel component definition (from previous response)
  const UsersPanel = () => (
    <Box p={{ base: 2, md: 4 }}>
      <Heading size="md" mb={4}>User Management</Heading>
      {loadingUsers && ( <VStack justifyContent="center" alignItems="center" minH="200px"><Spinner size="xl" /><Text>Loading users...</Text></VStack> )}
      {!loadingUsers && usersError && ( <Alert status="error"><AlertIcon />{usersError}</Alert> )}
      {!loadingUsers && !usersError && users.length === 0 && ( <Text>No users found.</Text> )}
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
                  <Td><Tag size="sm" colorScheme={user.isAdmin ? 'green' : 'gray'}>{user.isAdmin ? 'Yes' : 'No'}</Tag></Td>
                  <Td fontSize="xs">{new Date(user.createdAt).toLocaleDateString()}</Td>
                  <Td>
                    <Button size="xs" variant="ghost" colorScheme="blue" onClick={() => handleViewUser(user)} mr={1}><Icon as={FaEye} /></Button>
                    <Button size="xs" variant="ghost" colorScheme="yellow" onClick={() => handleOpenEditUser(user)} mr={1}><Icon as={FaEdit} /></Button>
                    <Button size="xs" variant="ghost" colorScheme="red" onClick={() => handleOpenDeleteUser(user)}><Icon as={FaTrashAlt} /></Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  // OrdersPanel component definition (from previous response, with currency fix)
  const OrdersPanel = () => (
    <Box p={{ base: 2, md: 4 }}>
      <Heading size="md" mb={4}>Order Management</Heading>
      {loadingOrders && ( <VStack justifyContent="center" alignItems="center" minH="200px"><Spinner size="xl" /><Text>Loading orders...</Text></VStack> )}
      {!loadingOrders && ordersError && ( <Alert status="error"><AlertIcon />{ordersError}</Alert> )}
      {!loadingOrders && !ordersError && orders.length === 0 && ( <Text>No orders found.</Text> )}
      {!loadingOrders && !ordersError && orders.length > 0 && (
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>Order ID</Th><Th>User Email</Th><Th>Date</Th><Th>Total</Th><Th>Status</Th><Th># Items</Th><Th>Actions</Th></Tr></Thead>
            <Tbody>
              {orders.map((order) => (
                <Tr key={order._id}>
                  <Td fontSize="xs" title={order._id}>{order._id?.substring(0, 8)}...</Td>
                  <Td>{order.user?.email || order.userId || 'N/A'}</Td>
                  <Td>{new Date(order.createdAt).toLocaleDateString()}</Td>
                  <Td>{typeof order.totalAmount === 'number' ? `$${(order.totalAmount / 100).toFixed(2)}` : '$0.00'}</Td>
                  <Td><Tag size="sm" colorScheme={order.orderStatus === 'Delivered' ? 'green' : order.orderStatus === 'Shipped' ? 'blue' : 'gray'}>{order.orderStatus || 'N/A'}</Tag></Td>
                  <Td>{order.items?.length || 0}</Td>
                  <Td><Button size="xs" variant="ghost" colorScheme="blue" onClick={() => alert(`View Order: ${order._id}`)}><Icon as={FaEye} /></Button></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  // DesignsPanel component definition (from previous response)
  const DesignsPanel = () => (
    <Box p={{ base: 2, md: 4 }}>
      <Heading size="md" mb={4}>Design Management</Heading>
      {loadingDesigns && ( <VStack justifyContent="center" alignItems="center" minH="200px"><Spinner size="xl" /><Text>Loading designs...</Text></VStack> )}
      {!loadingDesigns && designsError && ( <Alert status="error"><AlertIcon />{designsError}</Alert> )}
      {!loadingDesigns && !designsError && designs.length === 0 && ( <Text>No designs found.</Text> )}
      {!loadingDesigns && !designsError && designs.length > 0 && (
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>Preview</Th><Th>Prompt</Th><Th>Creator</Th><Th>Created</Th><Th>Contest?</Th><Th>Votes</Th><Th>Actions</Th></Tr></Thead>
            <Tbody>
              {designs.map((design) => (
                <Tr key={design._id}>
                  <Td><Image src={design.imageDataUrl} fallbackSrc="https://via.placeholder.com/50" alt="Design" boxSize="50px" objectFit="cover" /></Td>
                  <Td maxW="200px" whiteSpace="normal" fontSize="xs">{design.prompt}</Td>
                  <Td>{design.user?.username || design.userId || 'N/A'}</Td>
                  <Td>{new Date(design.createdAt).toLocaleDateString()}</Td>
                  <Td><Tag size="sm" colorScheme={design.isContestSubmission ? 'purple' : 'gray'}>{design.isContestSubmission ? 'Yes' : 'No'}</Tag></Td>
                  <Td>{design.votes || 0}</Td>
                  <Td>
                    <Button size="xs" variant="ghost" colorScheme="blue" onClick={() => alert(`View Design: ${design._id}`)} mr={1}><Icon as={FaEye} /></Button>
                    <Button size="xs" variant="ghost" colorScheme="red" onClick={() => alert(`Delete Design: ${design._id}`)}><Icon as={FaTrashAlt} /></Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
  // --- END OF PASTED PANELS ---


  return (
    <Box pt={{ base: "20px", md: "20px", xl: "20px" }} px={{ base: "2", md: "4" }} w="100%">
      <VStack spacing={6} align="stretch">
        <Heading as="h1" fontSize={{ base: "2xl", md: "3xl" }} color="brand.textLight" textAlign="left" w="100%">
          Admin Dashboard
        </Heading>
        <Box bg="brand.paper" borderRadius="xl" shadow="xl" p={{ base: 2, md: 4 }}>
          <Tabs variant="soft-rounded" colorScheme="brandPrimary" isLazy>
            <TabList mb="1em" flexWrap="wrap">
              <Tab _selected={{ color: 'white', bg: 'brand.primary' }} borderRadius="full" m={1}><Icon as={FaUsersCog} mr={2} /> Users</Tab>
              <Tab _selected={{ color: 'white', bg: 'brand.primary' }} borderRadius="full" m={1}><Icon as={FaBoxOpen} mr={2} /> Orders</Tab>
              <Tab _selected={{ color: 'white', bg: 'brand.primary' }} borderRadius="full" m={1}><Icon as={FaPalette} mr={2} /> Designs</Tab>
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
      {selectedUser && ( <Modal isOpen={isViewModalOpen} onClose={onViewModalClose} size="xl" scrollBehavior="inside"> {/* ... unchanged ... */} </Modal> )}
      {/* --- PASTE PREVIOUSLY PROVIDED View User Modal here, ensure it's complete --- */}
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
                {selectedUser.address && (
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
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button onClick={onViewModalClose} bg="brand.secondary" _hover={{bg: "brand.secondaryDark"}}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
      {/* --- END OF View User Modal --- */}


      {/* Edit User Modal - MODIFIED for password change */}
      {selectedUser && (
        <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="xl">
          <ModalOverlay />
          <ModalContent bg="brand.paper">
            <ModalHeader color="brand.textDark">Edit User: {selectedUser.username}</ModalHeader>
            <ModalCloseButton />
            <ModalBody color="brand.textDark" overflowY="auto" maxHeight="70vh">
              <VStack spacing={4} align="stretch">
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
                  <FormLabel htmlFor="isAdmin-switch-edit" mb="0">Administrator Status</FormLabel>
                  <Switch id="isAdmin-switch-edit" name="isAdmin" isChecked={editFormData.isAdmin} onChange={handleEditFormChange} colorScheme="green" />
                </FormControl>

                <Divider my={4} />
                <Heading size="sm" color="brand.textDark">Change User Password (Optional)</Heading>
                <Text fontSize="xs" color="gray.500">Only fill these fields if you want to change this user's password. The user will not be notified of this change automatically.</Text>

                <FormControl>
                  <FormLabel htmlFor="newPassword">New Password</FormLabel>
                  <InputGroup>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={editFormData.newPassword}
                      onChange={handleEditFormChange}
                      placeholder="Enter new password"
                      bg="white" borderColor="gray.300"
                    />
                    <InputRightElement>
                      <ChakraIconButton
                        variant="ghost"
                        icon={showNewPassword ? <FaEyeSlash /> : <FaEye />}
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
                <FormControl>
                  <FormLabel htmlFor="confirmNewPassword">Confirm New Password</FormLabel>
                   <InputGroup>
                    <Input
                      id="confirmNewPassword"
                      name="confirmNewPassword"
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      value={editFormData.confirmNewPassword}
                      onChange={handleEditFormChange}
                      placeholder="Confirm new password"
                      bg="white" borderColor="gray.300"
                    />
                    <InputRightElement>
                      <ChakraIconButton
                        variant="ghost"
                        icon={showConfirmNewPassword ? <FaEyeSlash /> : <FaEye />}
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
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
      {selectedUser && ( <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose} isCentered> {/* ... unchanged ... */} </Modal>)}
      {/* --- PASTE PREVIOUSLY PROVIDED Delete User Modal here, ensure it's complete --- */}
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
      {/* --- END OF Delete User Modal --- */}

    </Box>
  );
};

export default AdminPage;
