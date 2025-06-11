// frontend/src/pages/MyOrdersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Heading, Text, Spinner, Alert, AlertIcon,
    VStack, Divider, SimpleGrid, useColorModeValue, Image as ChakraImage,
    Tag, HStack, Card, CardHeader, CardBody
} from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';

const OrderItemCard = ({ order }) => {
    const getOrderStatusColor = (status) => {
        switch (status) {
            case 'Delivered': return 'green';
            case 'Shipped': return 'blue';
            case 'Cancelled': return 'red';
            default: return 'purple';
        }
    };

    return (
        <Card>
            <CardHeader>
                <Heading size='md'>Order ID: {order._id}</Heading>
            </CardHeader>
            <CardBody>
                <VStack align="start" spacing={3}>
                    <Text fontSize="sm"><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</Text>
                    <Text fontSize="sm"><strong>Total:</strong> ${(order.totalAmount / 100).toFixed(2)}</Text>
                    <HStack><Text fontSize="sm" fontWeight="bold">Payment:</Text><Tag size="sm" colorScheme={order.paymentStatus === 'Succeeded' ? 'green' : 'orange'}>{order.paymentStatus}</Tag></HStack>
                    <HStack><Text fontSize="sm" fontWeight="bold">Status:</Text><Tag size="sm" colorScheme={getOrderStatusColor(order.orderStatus)}>{order.orderStatus}</Tag></HStack>
                </VStack>
                <Divider my={4} />
                <Heading size="sm" mb={3}>Items ({order.orderItems?.length || 0})</Heading>
                <VStack align="stretch" spacing={4}>
                    {order.orderItems?.map((item, index) => (
                        <Box key={item._id || index} p={3} borderWidth="1px" borderRadius="md" borderColor="brand.primaryLight">
                            <HStack spacing={4} align="start">
                                {item.customImageURL && <ChakraImage src={item.customImageURL} alt={item.name || 'Product Image'} boxSize="70px" objectFit="cover" borderRadius="md" />}
                                <VStack align="start" spacing={1} flex="1">
                                    <Text fontWeight="semibold">{item.name || 'Custom Item'}</Text>
                                    <Text fontSize="sm">Size: {item.size} | Color: {item.color}</Text>
                                    <Text fontSize="sm">Quantity: {item.quantity || 1}</Text>
                                    {item.price && <Text fontSize="sm">Price: ${(item.price / 100).toFixed(2)} each</Text>}
                                </VStack>
                            </HStack>
                        </Box>
                    ))}
                </VStack>
            </CardBody>
        </Card>
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
                const response = await client.get('/orders/myorders');
                setOrders(response.data);
            } catch (err) {
                setError('An error occurred while fetching your orders.');
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [user]);

    if (loading) return <VStack justifyContent="center" minH="60vh"><Spinner size="xl" /></VStack>;
    if (error) return <Alert status="error"><AlertIcon />{error}</Alert>;

    return (
        <Box w="100%">
            <Heading as="h1" size="pageTitle">My Orders</Heading>
            {orders.length === 0 ? (<Text fontSize="lg">You haven't placed any orders yet.</Text>) : (
                <SimpleGrid columns={{ base: 1, lg: 1 }} spacing={6}>
                    {orders.map(order => (<OrderItemCard key={order._id} order={order} />))}
                </SimpleGrid>
            )}
        </Box>
    );
}
