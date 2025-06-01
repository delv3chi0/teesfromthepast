// frontend/src/pages/MyOrdersPage.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Heading, Text, Spinner, Alert, AlertIcon,
    VStack, Divider, SimpleGrid, useColorModeValue, Image as ChakraImage,
    Tag, HStack
} from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';

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
  const [loading, setLoading] = useState(true); // Initial loading state
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchOrders = async () => {
      // This function will only be called if user and user._id are present
      setLoading(true); // Set loading true at the start of fetch attempt
      setError('');     // Clear previous errors
      try {
        console.log("Fetching orders for user:", user._id, "from /orders/myorders");
        const response = await client.get('/orders/myorders');
        console.log("Orders fetched:", response.data);
        setOrders(response.data);
      } catch (err) {
        console.error("MyOrdersPage - Failed to fetch orders:", err.response?.data || err.message);
        const errorMessage = err.response?.data?.message || err.response?.data?.error?.message || 'An error occurred while fetching your orders.';
        setError(errorMessage);
        setOrders([]); // Clear orders on error
      } finally {
        setLoading(false); // Set loading false when fetch is complete (success or fail)
      }
    };

    if (user && user._id) {
      fetchOrders();
    } else if (!user) { 
      // If user is explicitly null (e.g., logged out or not yet loaded by AuthProvider)
      setLoading(false); // Not loading if there's no user to fetch for
      setOrders([]);     // Ensure orders are empty
      // setError("Please log in to view your orders."); // Or let PrivateRoute handle access
    }
    // The effect depends on the user object (or user._id).
    // It runs when the user logs in/out or when the component mounts with a user.
  }, [user]); // Corrected dependency array

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
      {/* This condition should now work reliably after loading/error states are resolved */}
      {!loading && !error && orders.length === 0 ? (
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
