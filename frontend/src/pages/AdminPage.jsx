// frontend/src/pages/AdminPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, Text, VStack, Tabs, TabList, TabPanels, Tab, TabPanel, Icon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Spinner, Alert, AlertIcon,
  Button, useToast, Tag, Image, Select,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure,
  FormControl, FormLabel, Input, Switch, InputGroup, InputRightElement, IconButton as ChakraIconButton,
  Divider, Tooltip, Grid, GridItem, Flex, SimpleGrid, Stat, StatLabel, StatNumber, Card, CardBody
} from '@chakra-ui/react';
import { FaUsersCog, FaBoxOpen, FaPalette, FaEdit, FaTrashAlt, FaEye, FaKey, FaEyeSlash, FaWarehouse, FaTachometerAlt, FaDollarSign, FaUserPlus, FaBoxes } from 'react-icons/fa';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import InventoryPanel from '../components/admin/InventoryPanel.jsx';

const DashboardPanel = ({ token, onViewOrder }) => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const toast = useToast();
    useEffect(() => {
        const fetchSummary = async () => {
            if (!token) return; setLoading(true); setError('');
            try {
                const { data } = await client.get('/admin/orders/summary', { headers: { Authorization: `Bearer ${token}` } });
                setSummary(data);
            } catch (err) { setError('Could not load dashboard data.'); toast({ title: "Error loading dashboard", status: 'error'}); } 
            finally { setLoading(false); }
        };
        fetchSummary();
    }, [token, toast]);
    const StatCard = ({ title, stat, icon, helpText }) => ( <Stat p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="brand.primary"><Flex justifyContent="space-between"><Box><StatLabel color="brand.textMuted">{title}</StatLabel><StatNumber>{stat}</StatNumber>{helpText && <Text fontSize="sm" color="brand.textMuted">{helpText}</Text>}</Box><Box my="auto" color="brand.textMuted"><Icon as={icon} w={8} h={8} /></Box></Flex></Stat> );
    if (loading) return <VStack justifyContent="center" alignItems="center" minH="300px"><Spinner size="xl" /></VStack>;
    if (error) return <Alert status="error"><AlertIcon />{error}</Alert>;
    if (!summary) return <Text p={4}>No summary data available.</Text>;
    return (
        <VStack spacing={6} align="stretch" p={{ base: 2, md: 4 }}>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                <StatCard title="Total Revenue" stat={`$${(summary.totalRevenue / 100).toFixed(2)}`} icon={FaDollarSign} helpText="All successful orders"/>
                <StatCard title="Total Orders" stat={summary.totalOrders} icon={FaBoxes} helpText="All orders placed"/>
                <StatCard title="New Users" stat={summary.newUserCount} icon={FaUserPlus} helpText="In the last 7 days"/>
            </SimpleGrid>
            <Box mt={8}>
                <Heading size="md" mb={4}>Recent Orders</Heading>
                <TableContainer borderWidth="1px" borderRadius="lg" bg="brand.primary">
                    <Table variant="simple" size="sm"><Thead><Tr><Th>Order ID</Th><Th>User</Th><Th>Date</Th><Th isNumeric>Total</Th><Th>Status</Th><Th>Actions</Th></Tr></Thead>
                        <Tbody>{summary.recentOrders.map(order => (<Tr key={order._id}><Td fontSize="xs" title={order._id}>{order._id.substring(0,8)}...</Td><Td>{order.user?.email || 'N/A'}</Td><Td>{new Date(order.createdAt).toLocaleDateString()}</Td><Td isNumeric>${(order.totalAmount/100).toFixed(2)}</Td><Td><Tag size="sm" colorScheme={order.orderStatus === 'Delivered' ? 'green' : 'gray'}>{order.orderStatus}</Tag></Td><Td><Tooltip label="View Order Details"><ChakraIconButton size="xs" variant="ghost" icon={<Icon as={FaEye} />} onClick={() => onViewOrder(order._id)}/></Tooltip></Td></Tr>))}</Tbody>
                    </Table>
                </TableContainer>
            </Box>
        </VStack>
    );
};

const AdminPage = () => {
  const toast = useToast();
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingSelectedOrder, setLoadingSelectedOrder] = useState(false);
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [designsError, setDesignsError] = useState('');
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [designToDelete, setDesignToDelete] = useState(null);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const { isOpen: isDeleteOrderModalOpen, onOpen: onDeleteOrderModalOpen, onClose: onDeleteOrderModalClose } = useDisclosure();
  const { isOpen: isViewUserModalOpen, onOpen: onViewUserModalOpen, onClose: onViewUserModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isDeleteUserModalOpen, onOpen: onDeleteUserModalOpen, onClose: onDeleteUserModalClose } = useDisclosure();
  const { isOpen: isViewOrderModalOpen, onOpen: onOpenViewOrderModal, onClose: onCloseViewOrderModal } = useDisclosure();
  const { isOpen: isViewDesignModalOpen, onOpen: onOpenViewDesignModal, onClose: onCloseViewDesignModal } = useDisclosure();
  const { isOpen: isDeleteDesignModalOpen, onOpen: onOpenDeleteDesignModal, onClose: onCloseDeleteDesignModal } = useDisclosure();
  const [editFormData, setEditFormData] = useState({ username: '', email: '', firstName: '', lastName: '', isAdmin: false, newPassword: '', confirmNewPassword: '' });
  const [showNewPasswordInModal, setShowNewPasswordInModal] = useState(false);
  const [showConfirmNewPasswordInModal, setShowConfirmNewPasswordInModal] = useState(false);
  const dataFetchers = {
    1: useCallback(async () => {
      if (users.length > 0) return; setLoadingUsers(true);
      try { const { data } = await client.get('/admin/users', { headers: { Authorization: `Bearer ${token}` }}); setUsers(data); } 
      catch (e) { setUsersError('Failed to fetch users'); } finally { setLoadingUsers(false); }
    }, [token, users.length]),
    2: useCallback(async () => {
      if (orders.length > 0) return; setLoadingOrders(true);
      try { const { data } = await client.get('/admin/orders', { headers: { Authorization: `Bearer ${token}` }}); setOrders(data); } 
      catch (e) { setOrdersError('Failed to fetch orders'); } finally { setLoadingOrders(false); }
    }, [token, orders.length]),
    3: useCallback(async () => {
      if (designs.length > 0) return; setLoadingDesigns(true);
      try { const { data } = await client.get('/admin/designs', { headers: { Authorization: `Bearer ${token}` }}); setDesigns(data); } 
      catch (e) { setDesignsError('Failed to fetch designs'); } finally { setLoadingDesigns(false); }
    }, [token, designs.length]),
  };
  const handleTabsChange = (index) => { setTabIndex(index); const fetcher = dataFetchers[index]; if (fetcher) fetcher(); };
  const handleViewUser = (user) => { setSelectedUser(user); onViewUserModalOpen(); };
  const handleOpenEditUser = (user) => { setSelectedUser(user); setEditFormData({ username: user.username, email: user.email, firstName: user.firstName || '', lastName: user.lastName || '', isAdmin: user.isAdmin, newPassword: '', confirmNewPassword: '' }); onEditModalOpen(); };
  const handleEditFormChange = (e) => { const { name, value, type, checked } = e.target; setEditFormData(prev => ({ ...prev, [name]: type === 'checkbox' || type === 'switch' ? checked : value })); };
  const handleSaveChanges = async () => { if (!selectedUser) return; if (editFormData.newPassword && editFormData.newPassword !== editFormData.confirmNewPassword) { toast({ title: "Password Mismatch", status: "error" }); return; } const payload = { ...editFormData }; if (!payload.newPassword) delete payload.newPassword; delete payload.confirmNewPassword; try { const { data: updatedUser } = await client.put(`/admin/users/${selectedUser._id}`, payload, { headers: { Authorization: `Bearer ${token}` } }); toast({ title: "User Updated", status: "success" }); setUsers(prev => prev.map(u => u._id === updatedUser._id ? updatedUser : u)); onEditModalClose(); } catch (e) { toast({ title: "Update Failed", description: e.response?.data?.message, status: "error" }); } };
  const handleOpenDeleteUser = (user) => { setSelectedUser(user); onDeleteUserModalOpen(); };
  const confirmDeleteUser = async () => { if (!selectedUser) return; try { await client.delete(`/admin/users/${selectedUser._id}`, { headers: { Authorization: `Bearer ${token}` } }); toast({ title: "User Deleted", status: "success" }); setUsers(prev => prev.filter(u => u._id !== selectedUser._id)); onDeleteUserModalClose(); } catch (e) { toast({ title: "Delete Failed", description: e.response?.data?.message, status: "error" }); } };
  const handleOpenDeleteOrderDialog = (order) => { setOrderToDelete(order); onDeleteOrderModalOpen(); };
  const confirmDeleteOrder = async () => { if (!orderToDelete) return; try { await client.delete(`/admin/orders/${orderToDelete._id}`, { headers: { Authorization: `Bearer ${token}` } }); toast({ title: "Order Deleted", status: "success" }); setOrders(prev => prev.filter(o => o._id !== orderToDelete._id)); onDeleteOrderModalClose(); } catch (e) { toast({ title: "Delete Failed", description: e.response?.data?.message, status: "error" }); onDeleteOrderModalClose(); } };
  const handleViewOrder = async (orderId) => { setLoadingSelectedOrder(true); onOpenViewOrderModal(); try { const { data } = await client.get(`/admin/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } }); setSelectedOrder(data); } catch (e) { toast({ title: "Error Fetching Order", status: "error" }); onCloseViewOrderModal(); } finally { setLoadingSelectedOrder(false); } };
  const handleStatusChange = async (orderId, newStatus) => { const originalOrders = [...orders]; setOrders(prevOrders => prevOrders.map(o => (o._id === orderId ? { ...o, orderStatus: newStatus } : o))); try { await client.put(`/admin/orders/${orderId}/status`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } }); toast({ title: "Status Updated", status: "success", duration: 2000 }); } catch (e) { setOrders(originalOrders); toast({ title: "Update Failed", description: e.response?.data?.message, status: "error" }); } };
  const handleViewDesign = (design) => { setSelectedDesign(design); onOpenViewDesignModal(); };
  const handleOpenDeleteDesignDialog = (design) => { setDesignToDelete(design); onOpenDeleteDesignModal(); };
  const confirmDeleteDesign = async () => { if (!designToDelete) return; try { await client.delete(`/admin/designs/${designToDelete._id}`, { headers: { Authorization: `Bearer ${token}` } }); toast({ title: "Design Deleted", status: "success" }); setDesigns(prev => prev.filter(d => d._id !== designToDelete._id)); onCloseDeleteDesignModal(); } catch(e) { toast({ title: "Delete Failed", description: e.response?.data?.message, status: "error" }); } };

  const UsersPanel = () => ( <Box><Heading size="md" mb={4}>User Management</Heading><TableContainer><Table variant="simple" size="sm"><Thead><Tr><Th>ID</Th><Th>Username</Th><Th>Email</Th><Th>Name</Th><Th>Admin</Th><Th>Joined</Th><Th>Actions</Th></Tr></Thead><Tbody>{users.map(user => (<Tr key={user._id}><Td fontSize="xs">{user._id.substring(0,8)}</Td><Td>{user.username}</Td><Td>{user.email}</Td><Td>{`${user.firstName || ''} ${user.lastName || ''}`.trim()}</Td><Td><Tag colorScheme={user.isAdmin?'green':'gray'}>{user.isAdmin?'Yes':'No'}</Tag></Td><Td>{new Date(user.createdAt).toLocaleDateString()}</Td><Td><Tooltip label="View"><ChakraIconButton size="xs" variant="ghost" onClick={() => handleViewUser(user)} icon={<Icon as={FaEye} />}/></Tooltip><Tooltip label="Edit"><ChakraIconButton size="xs" variant="ghost" onClick={() => handleOpenEditUser(user)} icon={<Icon as={FaEdit} />}/></Tooltip><Tooltip label="Delete"><ChakraIconButton size="xs" variant="ghost" colorScheme="red" onClick={() => handleOpenDeleteUser(user)} icon={<Icon as={FaTrashAlt} />}/></Tooltip></Td></Tr>))}</Tbody></Table></TableContainer></Box> );
  const OrdersPanel = () => { const getStatusColor = (status) => { if (status === 'Delivered') return 'green'; if (status === 'Shipped') return 'blue'; if (status === 'Cancelled') return 'red'; return 'purple'; }; return (<Box><Heading size="md" mb={4}>Order Management</Heading><TableContainer><Table variant="simple" size="sm"><Thead><Tr><Th>ID</Th><Th>User</Th><Th>Date</Th><Th>Total</Th><Th>Pay Status</Th><Th>Order Status</Th><Th>Items</Th><Th>Actions</Th></Tr></Thead><Tbody>{orders.map(order => (<Tr key={order._id}><Td fontSize="xs">{order._id.substring(0,8)}</Td><Td>{order.user?.email}</Td><Td>{new Date(order.createdAt).toLocaleDateString()}</Td><Td>${(order.totalAmount/100).toFixed(2)}</Td><Td><Tag colorScheme={order.paymentStatus==='Succeeded'?'green':'orange'}>{order.paymentStatus}</Tag></Td><Td><Select size="xs" value={order.orderStatus} onChange={e => handleStatusChange(order._id, e.target.value)} bg={getStatusColor(order.orderStatus)} borderRadius="md" maxW="120px"><option value="Processing">Processing</option><option value="Shipped">Shipped</option><option value="Delivered">Delivered</option><option value="Cancelled">Cancelled</option></Select></Td><Td>{order.orderItems.length}</Td><Td><Tooltip label="View"><ChakraIconButton size="xs" variant="ghost" icon={<Icon as={FaEye} />} onClick={() => handleViewOrder(order._id)}/></Tooltip><Tooltip label="Delete"><ChakraIconButton size="xs" variant="ghost" colorScheme="red" icon={<Icon as={FaTrashAlt} />} onClick={() => handleOpenDeleteOrderDialog(order)}/></Tooltip></Td></Tr>))}</Tbody></Table></TableContainer></Box>); };
  const DesignsPanel = () => ( <Box><Heading size="md" mb={4}>Design Management</Heading><TableContainer><Table variant="simple" size="sm"><Thead><Tr><Th>Preview</Th><Th>Prompt</Th><Th>Creator</Th><Th>Created</Th><Th>Actions</Th></Tr></Thead><Tbody>{designs.map(design => (<Tr key={design._id}><Td><Image src={design.imageDataUrl} boxSize="50px" objectFit="cover"/></Td><Td fontSize="xs">{design.prompt}</Td><Td>{design.user?.username}</Td><Td>{new Date(design.createdAt).toLocaleDateString()}</Td><Td><Tooltip label="View"><ChakraIconButton size="xs" variant="ghost" icon={<Icon as={FaEye}/>} onClick={() => handleViewDesign(design)}/></Tooltip><Tooltip label="Delete"><ChakraIconButton size="xs" variant="ghost" colorScheme="red" icon={<Icon as={FaTrashAlt}/>} onClick={() => handleOpenDeleteDesignDialog(design)}/></Tooltip></Td></Tr>))}</Tbody></Table></TableContainer></Box> );

  return (
    <Box w="100%">
      <Heading as="h1" size="pageTitle">Admin Console</Heading>
      <Card>
        <CardBody>
          <Tabs variant="enclosed" colorScheme="orange" isLazy onChange={handleTabsChange} index={tabIndex}>
            <TabList>
              <Tab><Icon as={FaTachometerAlt} mr={2}/> Dashboard</Tab>
              <Tab><Icon as={FaUsersCog} mr={2} /> Users</Tab>
              <Tab><Icon as={FaBoxOpen} mr={2} /> Orders</Tab>
              <Tab><Icon as={FaPalette} mr={2} /> Designs</Tab>
              <Tab><Icon as={FaWarehouse} mr={2} /> Inventory</Tab>
            </TabList>
            <TabPanels>
              <TabPanel><DashboardPanel token={token} onViewOrder={handleViewOrder} /></TabPanel>
              <TabPanel>{loadingUsers ? <VStack p={10}><Spinner/></VStack> : usersError ? <Alert status="error">{usersError}</Alert> : <UsersPanel />}</TabPanel>
              <TabPanel>{loadingOrders ? <VStack p={10}><Spinner/></VStack> : ordersError ? <Alert status="error">{ordersError}</Alert> : <OrdersPanel />}</TabPanel>
              <TabPanel>{loadingDesigns ? <VStack p={10}><Spinner/></VStack> : designsError ? <Alert status="error">{designsError}</Alert> : <DesignsPanel />}</TabPanel>
              <TabPanel><InventoryPanel /></TabPanel>
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>
      
      <Modal isOpen={isViewUserModalOpen} onClose={onViewUserModalClose}><ModalOverlay/><ModalContent><ModalHeader>User: {selectedUser?.username}</ModalHeader><ModalCloseButton/><ModalBody><VStack spacing={3} align="start"><Text><strong>ID:</strong> {selectedUser?._id}</Text><Text><strong>Username:</strong> {selectedUser?.username}</Text><Text><strong>Email:</strong> {selectedUser?.email}</Text></VStack></ModalBody><ModalFooter><Button onClick={onViewUserModalClose}>Close</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={isEditModalOpen} onClose={onEditModalClose}><ModalOverlay/><ModalContent><ModalHeader>Edit: {selectedUser?.username}</ModalHeader><ModalCloseButton/><ModalBody><VStack spacing={4} align="stretch"><FormControl><FormLabel>Username</FormLabel><Input name="username" value={editFormData.username} onChange={handleEditFormChange} /></FormControl></VStack></ModalBody><ModalFooter><Button onClick={onEditModalClose}>Cancel</Button><Button onClick={handleSaveChanges}>Save</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={isDeleteUserModalOpen} onClose={onDeleteUserModalClose} isCentered><ModalOverlay/><ModalContent><ModalHeader>Confirm</ModalHeader><ModalCloseButton/><ModalBody>Delete <strong>{selectedUser?.username}</strong>?</ModalBody><ModalFooter><Button onClick={onDeleteUserModalClose}>No</Button><Button onClick={confirmDeleteUser} colorScheme="red">Yes</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={isDeleteOrderModalOpen} onClose={onDeleteOrderModalClose} isCentered><ModalOverlay/><ModalContent><ModalHeader>Confirm</ModalHeader><ModalCloseButton/><ModalBody>Delete order <strong>{orderToDelete?._id}</strong>?</ModalBody><ModalFooter><Button onClick={onDeleteOrderModalClose}>No</Button><Button onClick={confirmDeleteOrder} colorScheme="red">Yes</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={isViewOrderModalOpen} onClose={onCloseViewOrderModal} size="4xl"><ModalOverlay/><ModalContent><ModalHeader>Order Details</ModalHeader><ModalCloseButton/><ModalBody>{loadingSelectedOrder ? <Spinner/> : selectedOrder && <VStack spacing={6} align="stretch">{/* Details */}</VStack>}</ModalBody><ModalFooter><Button onClick={onCloseViewOrderModal}>Close</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={isViewDesignModalOpen} onClose={onCloseViewDesignModal} size="xl" isCentered><ModalOverlay/><ModalContent><ModalHeader>Design Preview</ModalHeader><ModalCloseButton/><ModalBody>{selectedDesign && (<VStack><Image src={selectedDesign.imageDataUrl}/><Text>{selectedDesign.prompt}</Text></VStack>)}</ModalBody><ModalFooter><Button onClick={onCloseViewDesignModal}>Close</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={isDeleteDesignModalOpen} onClose={onCloseDeleteDesignModal} isCentered><ModalOverlay/><ModalContent><ModalHeader>Confirm</ModalHeader><ModalCloseButton/><ModalBody>Delete this design?</ModalBody><ModalFooter><Button onClick={onCloseDeleteDesignModal}>No</Button><Button colorScheme="red" onClick={confirmDeleteDesign}>Yes</Button></ModalFooter></ModalContent></Modal>
    </Box>
  );
};
export default AdminPage;
