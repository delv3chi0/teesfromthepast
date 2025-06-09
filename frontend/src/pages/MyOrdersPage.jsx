// frontend/src/pages/MyOrdersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Heading, Text, Spinner, Alert, AlertIcon,
    VStack, Divider, SimpleGrid, useColorModeValue, Image as ChakraImage,
    Tag, HStack
} from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';

const OrderItemCard = ({ order }) => {
    const cardBg = useColorModeValue('white', 'gray.700');
    const textColor = useColorModeValue('gray.600', 'gray.400');
    const headingColor = useColorModeValue('brand.textDark', 'whiteAlpha.900');

    // Safely format the total amount. Use optional chaining (?.) and provide a fallback.
    const formattedTotal = typeof order.totalAmount === 'number'
        ? `$${(order.totalAmount / 100).toFixed(2)} ${order.currency?.toUpperCase() || 'USD'}`
        : 'N/A';
        
    const getOrderStatusColor = (status) => {
        switch (status) {
            case 'Delivered': return 'green';
            case 'Shipped': return 'blue';
            case 'Processing': return 'purple';
            case 'Pending Confirmation': return 'yellow';
            case 'Cancelled': return 'red';
            default: return 'gray';
        }
    };

    return (
        <Box p={5} shadow="lg" borderWidth="1px" borderRadius="lg" bg={cardBg}>
            <VStack align="start" spacing={3}>
                <Heading fontSize="lg" color={headingColor}>Order ID: {order._id}</Heading>
                <Text fontSize="sm" color={textColor}><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</Text>
                <Text fontSize="sm" color={textColor}><strong>Total:</strong> {formattedTotal}</Text>
                <HStack>
                    <Text fontSize="sm" fontWeight="bold" color={textColor}>Payment Status:</Text>
                    <Tag size="sm" colorScheme={order.paymentStatus === 'Succeeded' ? 'green' : 'orange'}>
                        {order.paymentStatus}
                    </Tag>
                </HStack>
                <HStack>
                    <Text fontSize="sm" fontWeight="bold" color={textColor}>Order Status:</Text>
                    <Tag size="sm" colorScheme={getOrderStatusColor(order.orderStatus)}>
                        {order.orderStatus}
                    </Tag>
                </HStack>
            </VStack>

            <Divider my={4} />
            <Heading fontSize="md" color={headingColor} mb={3}>Items ({order.orderItems?.length || 0})</Heading>
            <VStack align="stretch" spacing={4}>
                {order.orderItems?.map((item, index) => (
                    <Box key={item._id || index} p={3} borderWidth="1px" borderRadius="md" borderColor={useColorModeValue('gray.200', 'gray.600')}>
                        <HStack spacing={4} align="start">
                            {/* In the new Order model, the image URL is `customImageURL` */}
                            {item.customImageURL && (
                                <ChakraImage
                                    src={item.customImageURL}
                                    alt={item.name || 'Product Image'}
                                    boxSize="70px"
                                    objectFit="cover"
                                    borderRadius="md"
                                />
                            )}
                            <VStack align="start" spacing={1} flex="1">
                                <Text fontWeight="semibold" color={headingColor}>{item.name || 'Custom Item'}</Text>
                                {/* Use optional chaining for fields that might not exist on old orders */}
                                {item.size && <Text fontSize="sm" color={textColor}>Size: {item.size}</Text>}
                                {item.color && <Text fontSize="sm" color={textColor}>Color: {item.color}</Text>}
                                {item.variantSku && <Text fontSize="sm" color={textColor}>SKU: {item.variantSku}</Text>}
                                <Text fontSize="sm" color={textColor}>Quantity: {item.quantity || 1}</Text>
                                {/* In the new Order model, price is stored in cents */}
                                {item.price && <Text fontSize="sm" color={textColor}>Price: ${(item.price / 100).toFixed(2)} each</Text>}
                            </VStack>
                        </HStack>
                    </Box>
                ))}
            </VStack>

            <Divider my={4} />
            <Heading fontSize="md" color={headingColor} mb={2}>Shipping Address</Heading>
            <VStack align="start" spacing={0} fontSize="sm" color={textColor}>
                <Text>{order.shippingAddress?.recipientName}</Text>
                <Text>{order.shippingAddress?.street}</Text>
                {order.shippingAddress?.street2 && <Text>{order.shippingAddress.street2}</Text>}
                <Text>{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}</Text>
                <Text>{order.shippingAddress?.country}</Text>
                {order.shippingAddress?.phone && <Text>Phone: {order.shippingAddress.phone}</Text>}
            </VStack>
        </Box>
    );
};

export default function MyOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    const fetchOrders = useCallback(async () => {
        if (!user || !user._id) {
            setLoading(false);
            setOrders([]);
            return;
        }
        setLoading(true);
        setError('');
        try {
            console.log("Fetching orders for user:", user._id, "from /orders/myorders");
            const response = await client.get('/orders/myorders');
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
    }, [user]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

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
            <Heading as="h1"
                size="pageTitle"
                color="brand.textLight"
                textAlign="left"
                w="100%"
                mb={{ base: 4, md: 6 }}
            >
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
