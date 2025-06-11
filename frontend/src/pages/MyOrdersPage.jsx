// frontend/src/pages/MyOrdersPage.jsx

import React, { useState, useEffect } from 'react';
import {
    Box, Heading, Text, Spinner, Alert, AlertIcon,
    VStack, Divider, SimpleGrid, Image as ChakraImage,
    Tag, HStack
} from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';

/**
 * My Orders Page & Order Item Card
 * REFRACTORED:
 * - Replaced default Card component with a custom-styled dark card for each order.
 * - Updated all text, heading, and divider colors to align with the dark theme.
 * - Restyled loader, alerts, and "no orders" states for consistency.
 * - Improved visual hierarchy within each order card for better readability.
 */

const OrderItemCard = ({ order }) => {
    const getOrderStatusColor = (status) => {
        switch (status) {
            case 'Delivered': return 'green';
            case 'Shipped': return 'blue';
            case 'Cancelled': return 'red';
            case 'Processing': return 'purple';
            default: return 'gray';
        }
    };

    return (
        <Box bg="brand.primaryLight" p={{ base: 5, md: 6 }} borderRadius="xl" borderWidth="1px" borderColor="whiteAlpha.200">
            <VStack align="stretch" spacing={5}>
                {/* Order Header */}
                <Box>
                    <Heading size='md' color="brand.textLight">Order ID: {order._id}</Heading>
                    <Text fontSize="sm" color="whiteAlpha.700">Placed on: {new Date(order.createdAt).toLocaleDateString()}</Text>
                </Box>

                {/* Order Summary */}
                <HStack spacing={6} justify="space-between" wrap="wrap">
                    <VStack align="start" spacing={1}>
                        <Text fontSize="sm" color="whiteAlpha.700">Total</Text>
                        <Text fontWeight="bold" fontSize="lg" color="brand.textLight">${(order.totalAmount / 100).toFixed(2)}</Text>
                    </VStack>
                    <VStack align="start" spacing={1}>
                        <Text fontSize="sm" color="whiteAlpha.700">Payment</Text>
                        <Tag size="md" variant="subtle" colorScheme={order.paymentStatus === 'Succeeded' ? 'green' : 'orange'}>{order.paymentStatus}</Tag>
                    </VStack>
                    <VStack align="start" spacing={1}>
                        <Text fontSize="sm" color="whiteAlpha.700">Status</Text>
                        <Tag size="md" variant="subtle" colorScheme={getOrderStatusColor(order.orderStatus)}>{order.orderStatus}</Tag>
                    </VStack>
                </HStack>

                <Divider my={3} borderColor="whiteAlpha.300" />

                {/* Order Items */}
                <Heading size="sm" color="whiteAlpha.800">Items ({order.orderItems?.length || 0})</Heading>
                <VStack align="stretch" spacing={4}>
                    {order.orderItems?.map((item, index) => (
                        <Box key={item._id || index} p={4} bg="brand.primaryDark" borderRadius="lg">
                            <HStack spacing={4} align="center">
                                {item.customImageURL && <ChakraImage src={item.customImageURL} alt={item.name || 'Product Image'} boxSize="80px" objectFit="cover" borderRadius="md" />}
                                <VStack align="start" spacing={1} flex="1">
                                    <Text fontWeight="semibold" color="brand.textLight">{item.name || 'Custom Item'}</Text>
                                    <Text fontSize="sm" color="whiteAlpha.700">Size: {item.size} | Color: {item.color}</Text>
                                    <Text fontSize="sm" color="whiteAlpha.700">Quantity: {item.quantity || 1}</Text>
                                    {item.price && <Text fontSize="sm" color="whiteAlpha.700">Price: ${(item.price / 100).toFixed(2)} each</Text>}
                                </VStack>
                            </HStack>
                        </Box>
                    ))}
                </VStack>
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
            if (!user) return;
            setLoading(true);
            try {
                // Sort orders by most recent first
                const response = await client.get('/orders/myorders');
                const sortedOrders = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setOrders(sortedOrders);
            } catch (err) {
                setError('An error occurred while fetching your orders.');
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [user]);

    if (loading) {
        return (
            <VStack justifyContent="center" minH="60vh">
                <Spinner size="xl" color="brand.accentYellow" thickness="4px" />
                <Text mt={4} fontSize="lg" color="brand.textLight">Loading Your Orders...</Text>
            </VStack>
        );
    }
    
    if (error) {
        return (
            <Alert status="error" bg="red.900" borderRadius="md" p={6} borderWidth="1px" borderColor="red.500">
                <AlertIcon color="red.300" />
                <Text color="white">{error}</Text>
            </Alert>
        );
    }

    return (
        <VStack w="100%" align="stretch" spacing={8}>
            <Heading as="h1" size="2xl" color="brand.textLight">My Orders</Heading>
            {orders.length === 0 ? (
                <Box textAlign="center" py={10}>
                    <Text fontSize="xl" color="whiteAlpha.800">You haven't placed any orders yet.</Text>
                </Box>
            ) : (
                <SimpleGrid columns={{ base: 1 }} spacing={6}>
                    {orders.map(order => (<OrderItemCard key={order._id} order={order} />))}
                </SimpleGrid>
            )}
        </VStack>
    );
}
