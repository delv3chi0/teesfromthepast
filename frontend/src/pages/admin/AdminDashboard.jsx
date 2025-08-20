// frontend/src/pages/admin/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import {
  Box, Heading, Text, VStack, SimpleGrid, Stat, StatLabel, StatNumber,
  Flex, Icon, Table, Thead, Tbody, Tr, Th, Td, TableContainer, Spinner,
  Alert, AlertIcon, Tag, IconButton as ChakraIconButton, Tooltip
} from "@chakra-ui/react";
import { FaDollarSign, FaBoxes, FaUserPlus, FaPalette, FaEye } from "react-icons/fa";
import { client } from "../../api/client";

export default function DashboardPanel({ token, onViewOrder }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await client.get("/admin/orders/summary", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (mounted) setSummary(data);
      } catch (e) {
        if (mounted) setError(e?.response?.data?.message || "Failed to load dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [token]);

  const StatCard = ({ title, stat, icon, helpText }) => (
    <Stat p={5} shadow="sm" borderWidth="1px" borderRadius="lg" layerStyle="cardBlue" borderColor="rgba(255,255,255,0.1)">
      <Flex justifyContent="space-between">
        <Box>
          <StatLabel>{title}</StatLabel>
          <StatNumber>{stat}</StatNumber>
          {helpText && <Text fontSize="sm">{helpText}</Text>}
        </Box>
        <Box my="auto">
          <Icon as={icon} w={8} h={8} color="brand.accentOrange" />
        </Box>
      </Flex>
    </Stat>
  );

  if (loading) return <VStack justifyContent="center" alignItems="center" minH="300px"><Spinner size="xl" /></VStack>;
  if (error) return <Alert status="error"><AlertIcon />{error}</Alert>;
  if (!summary) return <Text p={4}>No summary data available.</Text>;

  return (
    <VStack spacing={6} align="stretch" w="100%">
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6} w="100%">
        <StatCard title="Total Revenue" stat={`$${(summary.totalRevenueCents / 100).toFixed(2)}`} icon={FaDollarSign} helpText="All successful orders"/>
        <StatCard title="Total Orders"   stat={summary.totalOrders} icon={FaBoxes} helpText="All orders placed"/>
        <StatCard title="New Users (7d)" stat={summary.newUsers7d} icon={FaUserPlus} helpText="Signups in last 7 days"/>
        <StatCard title="Designs (7d)"   stat={summary.designs7d} icon={FaPalette} helpText="New designs in last 7 days"/>
      </SimpleGrid>

      <Box mt={8} w="100%">
        <Heading size="md" mb={4}>Recent Orders</Heading>
        <TableContainer borderWidth="1px" borderRadius="lg" layerStyle="cardBlue" w="100%">
          <Table variant="simple" size="sm" w="100%">
            <Thead>
              <Tr>
                <Th>Order ID</Th>
                <Th>User</Th>
                <Th>Date</Th>
                <Th isNumeric>Total</Th>
                <Th>Pay Status</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(summary.recentOrders || []).map((order) => (
                <Tr key={order._id}>
                  <Td fontSize="xs" title={order._id}>{order._id.substring(0,8)}...</Td>
                  <Td>{order.user?.email || order.user?.username || "N/A"}</Td>
                  <Td>{new Date(order.createdAt).toLocaleDateString()}</Td>
                  <Td isNumeric>${(order.totalAmount / 100).toFixed(2)}</Td>
                  <Td><Tag size="sm" colorScheme={order.paymentStatus === "Succeeded" ? "green" : "orange"}>{order.paymentStatus}</Tag></Td>
                  <Td><Tag size="sm" colorScheme={order.orderStatus === "Delivered" ? "green" : "gray"}>{order.orderStatus}</Tag></Td>
                  <Td>
                    <Tooltip label="View Order Details">
                      <ChakraIconButton size="xs" variant="ghost" icon={<FaEye />} onClick={() => onViewOrder?.(order._id)} />
                    </Tooltip>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>
    </VStack>
  );
}
