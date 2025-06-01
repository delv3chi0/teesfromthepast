// frontend/src/pages/AdminPage.jsx
import React, { useEffect, useState } from 'react';
import {
  Box, Heading, Text, VStack, Tabs, TabList, TabPanels, Tab, TabPanel, Icon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Spinner, Alert, AlertIcon,
  Button, useToast, Tag, // Added Tag for isAdmin status
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure,
  FormControl, FormLabel, Input, Switch // For edit modal
} from '@chakra-ui/react';
import { FaUsersCog, FaBoxOpen, FaPalette, FaEdit, FaTrashAlt, FaEye } from 'react-icons/fa';
import { client } from '../api/client'; // Your configured Axios client
import { useAuth } from '../context/AuthProvider'; // To get token for API calls

const AdminPage = () => {
  console.log("[AdminPage] Rendering Admin Page...");
  const toast = useToast();
  const { token } = useAuth(); // Needed for authenticated API calls

  // State for Users Tab
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null); // For view/edit/delete modals

  // Modal disclosures
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
  });


  // Fetch Users
  const fetchUsers = async () => {
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
        headers: { Authorization: `Bearer ${token}` } // Ensure token is sent
      });
      console.log("[AdminPage] Users fetched successfully:", response.data);
      setUsers(response.data);
    } catch (error) {
      console.error("[AdminPage] Error fetching users:", error.response?.data?.message || error.message);
      setUsersError(error.response?.data?.message || 'Failed to fetch users. Ensure you are logged in as an admin.');
      if (error.response?.status === 403) {
        setUsersError('Access Denied. You might not have admin privileges to view users.');
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    // Fetch users when the component mounts or token changes (if initially null)
    fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Dependency on token ensures it runs if token becomes available

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

  const OrdersPanel = () => ( /* Placeholder */
    <Box p={4}>
      <Heading size="md" mb={4}>Order Management</Heading>
      <Text>Order management interface will be here.</Text>
    </Box>
  );

  const DesignsPanel = () => ( /* Placeholder */
    <Box p={4}>
      <Heading size="md" mb={4}>Design Management</Heading>
      <Text>Design management interface will be here.</Text>
    </Box>
  );

  return (
    <Box pt={{ base: "20px", md: "20px", xl: "20px" }} px={{ base: "2", md: "4" }} w="100%">
      <VStack spacing={6} align="stretch">
        <Heading
          as="h1"
          fontSize={{ base: "2xl", md: "3xl" }}
          color="brand.textLight"
          textAlign="left"
          w="100%"
        >
          Admin Dashboard
        </Heading>

        <Box bg="brand.paper" borderRadius="xl" shadow="xl" p={{ base: 2, md: 4 }}>
          <Tabs variant="soft-rounded" colorScheme="brandPrimary" isLazy>
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
              <TabPanel px={0} py={2}> {/* Adjusted padding for TabPanel */}
                <UsersPanel />
              </TabPanel>
              <TabPanel px={0} py={2}>
                <OrdersPanel />
              </TabPanel>
              <TabPanel px={0} py={2}>
                <DesignsPanel />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </VStack>

      {/* View User Modal */}
      {selectedUser && (
        <Modal isOpen={isViewModalOpen} onClose={onViewModalClose} size="xl">
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
                <Text><strong>Admin:</strong> {selectedUser.isAdmin ? 'Yes' : 'No'}</Text>
                <Text><strong>Joined:</strong> {new Date(selectedUser.createdAt).toLocaleString()}</Text>
                <Text><strong>Last Updated:</strong> {new Date(selectedUser.updatedAt).toLocaleString()}</Text>
                {/* Add more fields as needed, e.g., shipping/billing addresses */}
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
                  <Input name="username" value={editFormData.username} onChange={handleEditFormChange} bg="white"/>
                </FormControl>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input type="email" name="email" value={editFormData.email} onChange={handleEditFormChange} bg="white"/>
                </FormControl>
                <FormControl>
                  <FormLabel>First Name</FormLabel>
                  <Input name="firstName" value={editFormData.firstName} onChange={handleEditFormChange} bg="white"/>
                </FormControl>
                <FormControl>
                  <FormLabel>Last Name</FormLabel>
                  <Input name="lastName" value={editFormData.lastName} onChange={handleEditFormChange} bg="white"/>
                </FormControl>
                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="isAdmin" mb="0">
                    Administrator Status
                  </FormLabel>
                  <Switch id="isAdmin" name="isAdmin" isChecked={editFormData.isAdmin} onChange={handleEditFormChange} colorScheme="green" />
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
