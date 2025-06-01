// frontend/src/pages/MyOrdersPage.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Heading, Text, Spinner, Alert, AlertIcon, 
    VStack, Divider, SimpleGrid, useColorModeValue 
} from '@chakra-ui/react';
import { client } from '../api/client'; // Your API client
import { useAuth } from '../context/AuthProvider';

// A component to display individual order details
const OrderItemCard = ({ order }) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <Box p={5} shadow="lg" borderWidth="1px" borderRadius="lg" bg={cardBg}>
      <Heading fontSize="xl" mb={3} color="brand.textDark">Order ID: {order.id}</Heading>
      <VStack align="start" spacing={1}>
        <Text><strong>Date:</strong> {new Date(order.date).toLocaleDateString()}</Text>
        <Text><strong>Total:</strong> ${order.amount.toFixed(2)} {order.currency.toUpperCase()}</Text>
        <Text><strong>Status:</strong> <Text as="span" fontWeight="semibold" color={order.status === 'Shipped' ? 'green.500' : 'orange.500'}>{order.status}</Text></Text>
      </VStack>
      
      {order.items && order.items.length > 0 && (
        <>
          <Divider my={4} />
          <Text fontWeight="semibold" color="brand.textSlightDark">Items:</Text>
          <VStack align="start" spacing={1} pl={2}>
            {order.items.map((item, index) => (
              <Text key={index} fontSize="sm" color={textColor}>
                - {item.productName || 'Custom Item'} (Qty: {item.quantity || 1})
                {item.size && `, Size: ${item.size}`}
                {item.color && `, Color: ${item.color}`}
              </Text>
            ))}
          </VStack>
        </>
      )}
       {/* You can add more details like shipping information here */}
    </Box>
  );
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth(); // Get the authenticated user

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setLoading(false);
        // setError("Please log in to view your orders."); // Or rely on PrivateRoute
        return;
      }
      try {
        setLoading(true);
        setError('');
        
        // TODO: Replace with your actual API endpoint to fetch user's orders
        // For example: const response = await client.get('/api/orders/user');
        // setOrders(response.data);

        // Using mock data for now:
        const mockOrders = [
          { 
            id: 'ORD123XYZ', 
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), 
            amount: 29.99, 
            currency: 'usd', 
            status: 'Processing', 
            items: [
              { productName: 'Retro Wave T-Shirt', quantity: 1, size: 'L', color: 'Black' }
            ] 
          },
          { 
            id: 'ORD456ABC', 
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), 
            amount: 45.50, 
            currency: 'usd', 
            status: 'Shipped', 
            items: [
              { productName: '80s Arcade Hoodie', quantity: 1, size: 'XL', color: 'Navy' },
              { productName: 'Pixel Art Cap', quantity: 1 }
            ]
          },
        ];
        setOrders(mockOrders); 
        
      } catch (err) {
        console.error("MyOrdersPage - Failed to fetch orders:", err);
        setError(err.response?.data?.message || 'An error occurred while fetching your orders.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]); // Refetch if user changes

  if (loading) {
    return (
      <VStack justifyContent="center" alignItems="center" minH="60vh">
        <Spinner size="xl" thickness="4px" color="brand.primary"/>
        <Text mt={3} color="brand.textLight">Loading Your Orders...</Text>
      </VStack>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="md" bg="red.50" p={4} variant="subtle">
        <AlertIcon color="red.500" />
        <Text color="red.700" fontWeight="medium">{error}</Text>
      </Alert>
    );
  }

  return (
    <Box w="100%">
      <Heading as="h1" size={{ base: "lg", md: "xl" }} color="brand.textLight" textAlign="left" mb={8}>
        My Orders
      </Heading>
      {orders.length === 0 ? (
        <Text fontSize="lg" color="brand.textMedium">You haven't placed any orders yet.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 1, lg: 2 }} spacing={6}>
          {orders.map(order => (
            <OrderItemCard key={order.id} order={order} />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
