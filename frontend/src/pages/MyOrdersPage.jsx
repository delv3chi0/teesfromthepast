// frontend/src/pages/MyOrdersPage.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Heading, Text, Spinner, Alert, AlertIcon,
    VStack, Divider, SimpleGrid, useColorModeValue, Image as ChakraImage,
    Tag, HStack, Button // Added Button
} from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom'; // Added useNavigate

const OrderItemCard = ({ order }) => {
  const cardBg = useColorModeValue('brand.paper', 'gray.700'); // Use theme colors
  const textColor = useColorModeValue('brand.textDark', 'gray.300'); // Use theme colors
  const headingColor = useColorModeValue('brand.textDark', 'whiteAlpha.900'); // Use theme colors
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <Box p={5} shadow="xl" borderWidth="1px" borderRadius="xl" bg={cardBg}>
      <VStack align="stretch" spacing={3}>
        <HStack justifyContent="space-between" alignItems="flex-start">
            <Heading fontSize={{base: "lg", md: "xl"}} color={headingColor} noOfLines={1} title={order._id}>
                Order ID: {order._id.substring(order._id.length - 8)} {/* Show last 8 chars for brevity */}
            </Heading>
            <Tag 
                size="md" 
                variant="subtle" // Softer tag
                colorScheme={
                    order.orderStatus === 'Delivered' ? 'green' :
                    order.orderStatus === 'Shipped' ? 'blue' :
                    order.orderStatus === 'Processing' ? 'purple' :
                    order.orderStatus === 'Pending Confirmation' ? 'yellow' : 'gray'
                }
                borderRadius="full"
            >
                {order.orderStatus}
            </Tag>
        </HStack>
        <Text fontSize="sm" color={textColor}><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</Text>
        <Text fontSize="md" color={headingColor} fontWeight="bold"><strong>Total:</strong> ${(order.totalAmount / 100).toFixed(2)}</Text>
        <HStack>
            <Text fontSize="sm" fontWeight="medium" color={textColor}>Payment Status:</Text>
            <Tag size="sm" variant="solid" colorScheme={order.paymentStatus === 'succeeded' || order.paymentStatus === 'paid' ? 'green' : 'orange'}>
                {order.paymentStatus}
            </Tag>
        </HStack>
      </VStack>

      <Divider my={4} borderColor={borderColor} />
      <Heading fontSize="lg" color={headingColor} mb={3}>Items ({order.items.length})</Heading>
      <VStack align="stretch" spacing={4}>
        {order.items.map((item, index) => (
          <Box key={index} p={3} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
            <HStack spacing={4} align="start">
                {item.designImageUrl && (
                    <ChakraImage
                        src={item.designImageUrl}
                        alt={item.productName || 'Product Image'}
                        boxSize={{base: "60px", md: "70px"}}
                        objectFit="cover"
                        borderRadius="md"
                        border="1px solid"
                        borderColor={borderColor}
                    />
                )}
                <VStack align="start" spacing={1} flex="1">
                    <Text fontWeight="semibold" color={headingColor} fontSize={{base: "sm", md: "md"}}>{item.productName || 'Custom Item'}</Text>
                    <Text fontSize="sm" color={textColor}>Type: {item.productType}</Text>
                    {item.size && <Text fontSize="sm" color={textColor}>Size: {item.size}</Text>}
                    {item.color && <Text fontSize="sm" color={textColor}>Color: {item.color}</Text>}
                    <Text fontSize="sm" color={textColor}>Qty: {item.quantity || 1}</Text>
                    <Text fontSize="sm" color={textColor} fontWeight="medium">Price: ${(item.priceAtPurchase / 100).toFixed(2)} each</Text>
                    {item.designPrompt && <Text fontSize="xs" color={textColor} mt={1} noOfLines={2}><em>Prompt: "{item.designPrompt}"</em></Text>}
                </VStack>
            </HStack>
          </Box>
        ))}
      </VStack>

      <Divider my={4} borderColor={borderColor} />
      <Heading fontSize="lg" color={headingColor} mb={2}>Shipping Address</Heading>
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
  const { user } = useAuth(); // Assuming logout is not directly used here
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError('');
      try {
        console.log("Fetching orders for user:", user._id, "from /orders/myorders");
        const response = await client.get('/orders/myorders'); // Ensure this endpoint is correct and returns user-specific orders
        console.log("Orders fetched:", response.data);
        setOrders(response.data);
      } catch (err) {
        console.error("MyOrdersPage - Failed to fetch orders:", err.response?.data || err.message);
        const errorMessage = err.response?.data?.message || err.response?.data?.error?.message || 'An error occurred while fetching your orders.';
        setError(errorMessage);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    if (user && user._id) {
      fetchOrders();
    } else if (!user && !loading) { // Only set loading false if no user and not already loading
      setLoading(false);
      setOrders([]);
    }
  }, [user]);

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
      <Box px={{base: 4, md: 0}}> {/* Added padding for error message container */}
        <Alert status="error" borderRadius="md" bg="red.50" p={6} variant="subtle" w="100%" flexDirection="column" alignItems="center" justifyContent="center">
          <AlertIcon color="red.500" boxSize="40px" />
          <Text fontWeight="bold" color="red.700" mt={3} fontSize="lg">Failed to Load Orders</Text>
          <Text color="red.600" fontSize="md" textAlign="center" mt={1}>{error}</Text>
          <Button mt={5} colorScheme="brandPrimary" onClick={() => user && user._id ? fetchOrders() : navigate('/login')}>
            {user && user._id ? "Try Again" : "Login to View Orders"}
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box w="100%" /* Removed specific maxW and mx from here, MainLayout handles it */>
      <Heading
        as="h1"
        size="pageTitle" // Uniform page title style
        color="brand.textLight"
        textAlign="left"
        w="100%"
        mb={{ base: 4, md: 6 }}
      >
        My Orders
      </Heading>
      {orders.length === 0 ? (
        <Box bg="brand.paper" p={8} borderRadius="xl" shadow="md" textAlign="center">
            <Text fontSize="xl" color="brand.textDark" fontWeight="medium">You haven't placed any orders yet.</Text>
            <Text mt={2} color="brand.textDark">Ready to get some retro gear?</Text>
            <Button mt={6} colorScheme="brandAccentYellow" onClick={() => navigate('/')} size="lg" borderRadius="full">
                Browse Products
            </Button>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1 }} spacing={6}> {/* Changed to always 1 column for detailed order cards */}
          {orders.map(order => (
            <OrderItemCard key={order._id} order={order} />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
