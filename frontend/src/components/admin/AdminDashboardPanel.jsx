// frontend/src/components/admin/AdminDashboardPanel.jsx
import React, { useEffect, useState } from 'react';
import { Box, Heading, Text, VStack, Spinner, Alert, AlertIcon, SimpleGrid, Stat, StatLabel, StatNumber, Flex, Icon, Table, Thead, Tbody, Tr, Th, Td, TableContainer, Tooltip, IconButton as ChakraIconButton } from '@chakra-ui/react';
import { FaDollarSign, FaBoxes, FaUserPlus, FaEye } from 'react-icons/fa';
import { client } from '../../api/client';
import { useAuth } from '../../context/AuthProvider';
import { useToast } from '@chakra-ui/react';

const StatCard = ({ title, stat, icon, helpText }) => ( <Stat p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="white"><Flex justifyContent="space-between"><Box><StatLabel color="gray.500">{title}</StatLabel><StatNumber>{stat}</StatNumber>{helpText && <Text fontSize="sm" color="gray.500">{helpText}</Text>}</Box><Box my="auto" color="gray.400"><Icon as={icon} w={8} h={8} /></Box></Flex></Stat> );

const AdminDashboardPanel = () => {
  const { token } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    const fetchSummary = async () => {
      if (!token) return;
      try {
        const { data } = await client.get('/admin/orders/summary', { headers: { Authorization: `Bearer ${token}` } });
        setSummary(data);
      } catch (err) {
        setError('Could not load dashboard data.');
        toast({ title: "Error", description: err.response?.data?.message || 'Failed to load summary', status: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [token, toast]);

  if (loading) return <VStack justifyContent="center" minH="300px"><Spinner size="xl" /></VStack>;
  if (error) return <Alert status="error"><AlertIcon />{error}</Alert>;
  if (!summary) return <Text p={4}>No summary data available.</Text>;

  return (
    <VStack spacing={6} align="stretch" p={{ base: 2, md: 4 }}>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        <StatCard title="Total Revenue" stat={`$${(summary.totalRevenue / 100).toFixed(2)}`} icon={FaDollarSign} helpText="All successful orders"/>
        <StatCard title="Total Orders" stat={summary.totalOrders} icon={FaBoxes} helpText="All orders placed"/>
        <StatCard title="New Users" stat={summary.newUserCount} icon={FaUserPlus} helpText="In the last 7 days"/>
      </SimpleGrid>
      {/* Note: The "View Order" button here will be implemented next if desired */}
      <Box mt={8}><Heading size="md" mb={4}>Recent Orders</Heading><TableContainer borderWidth="1px" borderRadius="lg" bg="white"><Table size="sm"><Thead><Tr><Th>ID</Th><Th>User</Th><Th>Date</Th><Th isNumeric>Total</Th><Th>Status</Th></Tr></Thead><Tbody>{summary.recentOrders.map(order => (<Tr key={order._id}><Td fontSize="xs">{order._id.substring(0,8)}...</Td><Td>{order.user?.email}</Td><Td>{new Date(order.createdAt).toLocaleDateString()}</Td><Td isNumeric>${(order.totalAmount/100).toFixed(2)}</Td><Td><Tag size="sm">{order.orderStatus}</Tag></Td></Tr>))}</Tbody></Table></TableContainer></Box>
    </VStack>
  );
};

export default AdminDashboardPanel;
