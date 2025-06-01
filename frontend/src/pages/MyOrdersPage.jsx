// frontend/src/pages/MyOrdersPage.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Heading, Text, Spinner, Alert, AlertIcon,
    VStack, Divider, SimpleGrid, useColorModeValue, Image as ChakraImage,
    Tag, HStack // Added HStack
} from '@chakra-ui/react';
import { client } from '../api/client'; // Your API client
import { useAuth } from '../context/AuthProvider';

// Updated OrderItemCard
const OrderItemCard = ({ order }) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const headingColor = useColorModeValue('brand.textDark', 'whiteAlpha.900');

  return (
    <Box p={5} shadow="lg" borderWidth="1px" borderRadius="lg" bg={cardBg}>
      <VStack align="start" spacing={3}>
        <Heading fontSize="lg" color={headingColor}>Order ID: {order._id}</Heading>
        <Text fontSize="sm"><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</Text>
        <Text fontSize="sm"><strong>Total:</strong> ${(order.totalAmount / 100).toFixed(2)} {order.currency.toUpperCase()}</Text>
        <HStack>
             <Text fontSize="sm" fontWeight="bold">Payment Status:</Text>
             <Tag size="sm" colorScheme={order.paymentStatus === 'succeeded' ? 'green' : 'orange'}>
                {order.paymentStatus}
             </Tag>
        </HStack>
        <HStack>
            <Text fontSize="sm" fontWeight="bold">Order Status:</Text>
            <Tag size="sm" colorScheme={
                order.orderStatus === 'Delivered' ? 'green' :
                order.orderStatus === 'Shipped' ? 'blue' :
                order.orderStatus === 'Processing' ? 'purple' :
                order.orderStatus === 'Pending Confirmation' ? 'yellow' : 'gray'
            }>
                {order.orderStatus}
            </Tag>
        </HStack>
      </VStack>

      <Divider my={4} />
      <Heading fontSize="md" color={headingColor} mb={3}>Items ({order.items.length})</Heading>
      <VStack align="stretch" spacing={4}>
        {order.items.map((item, index) => (
          <Box key={index} p={3} borderWidth="1px" borderRadius="md" borderColor={useColorModeValue('gray.200', 'gray.600')}>
            <HStack spacing={4} align="start">
                {item.designImageUrl && (
                    <ChakraImage
                        src={item.designImageUrl}
                        alt={item.productName || 'Product Image'}
                        boxSize="70px"
                        objectFit="cover"
                        borderRadius="md"
                    />
                )}
                <VStack align="start" spacing={1} flex="1">
                    <Text fontWeight="semibold" color={headingColor}>{item.productName || 'Custom Item'}</Text>
                    <Text fontSize="sm" color={textColor}>Type: {item.productType}</Text>
                    {item.size && <Text fontSize="sm" color={textColor}>Size: {item.size}</Text>}
                    {item.color && <Text fontSize="sm" color={textColor}>Color: {item.color}</Text>}
                    <Text fontSize="sm" color={textColor}>Quantity: {item.quantity || 1}</Text>
                    <Text fontSize="sm" color={textColor}>Price: ${(item.priceAtPurchase / 100).toFixed(2)} each</Text>
                    {item.designPrompt && <Text fontSize="xs" color={textColor} mt={1} noOfLines={2}><em>Prompt: "{item.designPrompt}"</em></Text>}
                </VStack>
            </HStack>
          </Box>
        ))}
      </VStack>

      <Divider my={4} />
      <Heading fontSize="md" color={headingColor} mb={2}>Shipping Address</Heading>
      <VStack align="start" spacing={0} fontSize="sm" color={textColor}>
        <Text>{order.shippingAddress.recipientName}</Text>
        <Text>{order.shippingAddress.street1}</Text>
        {order.shippingAddress.street2 && <Text>{order.shippingAddress.street2}</Text>}
        <Text>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</Text>
        <Text>{order.shippingAddress.country}</Text>
        {order.shippingAddress.phone && <Text>Phone: {order.shippingAddress.phone}</Text>}
      </VStack>
    </Box>
  );
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user || !user._id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        console.log("Fetching orders for user:", user._id);
        const response = await client.get('/api/orders/myorders');
        console.log("Orders fetched:", response.data);
        setOrders(response.data);
      } catch (err) {
        console.error("MyOrdersPage - Failed to fetch orders:", err.response?.data || err.message);
        setError(err.response?.data?.message || 'An error occurred while fetching your orders.');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    if (user && user._id) {
        fetchOrders();
    } else {
        // If user is null or user._id is not yet available,
        // set loading to false if not already trying to load.
        // This prevents showing "no orders" if user is still loading.
        if (loading && !user) setLoading(false);
    }
  }, [user, loading]); // Added loading to dependency array to handle initial state correctly

  // This is the corrected loading state return
  if (loading) {
    return (
      <VStack justifyContent="center" alignItems="center" minH="60vh">
        <Spinner size="xl" thickness="4px" color="brand.primary"/>
        <Text mt={3} color="brand.textLight">Loading Your Orders...</Text>
      </VStack>
    );
  }

  // This is the corrected error state return
  if (error) {
    return (
      <Alert status="error" borderRadius="md" bg="red.50" p={4} variant="subtle" w="100%">
        <AlertIcon color="red.500" />
        <VStack align="start">
            <Text fontWeight="bold" color="red.700">Failed to Load Orders</Text>
            <Text color="red.700" fontSize="sm">{error}</Text>
        </VStack>
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
        <SimpleGrid columns={{ base: 1, lg: 1 }} spacing={6}>
          {orders.map(order => (
            <OrderItemCard key={order._id} order={order} />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
