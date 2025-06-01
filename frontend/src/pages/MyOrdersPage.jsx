// frontend/src/pages/MyOrdersPage.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Heading, Text, Spinner, Alert, AlertIcon, 
    VStack, Divider, SimpleGrid, useColorModeValue, Image as ChakraImage, // Added ChakraImage
    Tag // Added Tag
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
      if (!user) { // AuthProvider should ensure user is loaded, or PrivateRoute redirects
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        console.log("Fetching orders for user:", user._id); // Ensure user._id is available
        const response = await client.get('/api/orders/myorders'); // Your new endpoint
        console.log("Orders fetched:", response.data);
        setOrders(response.data);
      } catch (err) {
        console.error("MyOrdersPage - Failed to fetch orders:", err.response?.data || err.message);
        setError(err.response?.data?.message || 'An error occurred while fetching your orders.');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if user is available
    if (user && user._id) { // Check for user._id to be safe
        fetchOrders();
    } else if (!user) {
        setLoading(false); // Not logged in or user data not yet available
        // setError("Please log in to view orders."); // Or let PrivateRoute handle it
    }
  }, [user]); // Re-fetch if user changes

  if (loading) {
    return ( /* ... same loading spinner ... */ );
  }

  if (error) {
    return ( /* ... same error alert ... */ );
  }

  return (
    <Box w="100%">
      <Heading as="h1" size={{ base: "lg", md: "xl" }} color="brand.textLight" textAlign="left" mb={8}>
        My Orders
      </Heading>
      {orders.length === 0 && !loading ? ( // Ensure not to show "no orders" while loading
        <Text fontSize="lg" color="brand.textMedium">You haven't placed any orders yet.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, lg: 1 }} spacing={6}> {/* Changed to 1 column for better detail display per order */}
          {orders.map(order => (
            <OrderItemCard key={order._id} order={order} />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
