import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  Spinner,
  Alert,
  AlertIcon,
  Divider,
  SimpleGrid,
  Tag,
  Button,
  Flex,
  Icon
} from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { FaBoxOpen } from 'react-icons/fa';

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setLoading(true);
      setError('');
      client.get('/orders/myorders')
        .then(response => {
          setOrders(response.data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching orders:", err);
          setError('Could not load your orders.');
          if (err.response?.status === 401) {
            logout();
            navigate('/login');
          }
          setLoading(false);
        });
    }
  }, [user, logout, navigate]);

  if (loading) {
    return (
      <VStack justifyContent="center" minH="60vh">
        <Spinner size="xl" color="brand.accentYellow" />
        <Text mt={4} fontSize="lg">Loading Your Orders...</Text>
      </VStack>
    );
  }

  if (error) {
    return <Alert status="error"><AlertIcon />{error}</Alert>;
  }

  return (
    <Box w="100%">
      <Heading as="h1" size="2xl" mb={8} color="brand.textLight">My Orders</Heading>
      
      {orders.length === 0 ? (
        <Box bg="brand.cardBlue" p={10} borderRadius="xl" textAlign="center">
            <VStack spacing={5}>
                <Icon as={FaBoxOpen} boxSize="50px" color="brand.accentYellow" />
                <Text fontSize="xl" fontWeight="medium">You haven't placed any orders yet.</Text>
                <Button colorScheme="brandAccentOrange" onClick={() => navigate('/shop')}>Start Shopping</Button>
            </VStack>
        </Box>
      ) : (
        <VStack spacing={6} align="stretch">
          {orders.map(order => (
            <Box key={order._id} p={6} bg="brand.cardBlue" borderRadius="xl" shadow="lg">
              <SimpleGrid columns={{ base: 1, md: 4 }} spacing={{ base: 4, md: 6 }} alignItems="center">
                
                <Box>
                  <Heading size="xs" color="brand.textMuted" textTransform="uppercase">Order #</Heading>
                  <Text fontSize="sm" title={order._id}>{(order._id || '').substring(18)}</Text>
                </Box>
                
                <Box>
                  <Heading size="xs" color="brand.textMuted" textTransform="uppercase">Date Placed</Heading>
                  <Text fontSize="sm">{new Date(order.createdAt).toLocaleDateString()}</Text>
                </Box>
                
                <Box>
                  <Heading size="xs" color="brand.textMuted" textTransform="uppercase">Total</Heading>
                  {/* MODIFIED: Safely handle cases where totalPrice might be missing */}
                  <Text fontSize="sm">${(order.totalPrice || 0).toFixed(2)}</Text>
                </Box>
                
                <Box>
                  <Heading size="xs" color="brand.textMuted" textTransform="uppercase">Status</Heading>
                  <Tag size="md" colorScheme={order.status === 'Delivered' ? 'green' : 'yellow'} mt={1}>{order.status}</Tag>
                </Box>

              </SimpleGrid>
              
              <Divider my={4} borderColor="whiteAlpha.300" />

              <Box>
                <Heading size="sm" mb={3}>Items</Heading>
                <VStack align="stretch" spacing={3}>
                  {order.orderItems.map(item => (
                    <Flex key={item._id} justify="space-between" align="center">
                      <Text fontSize="sm">{item.name} (x{item.qty})</Text>
                      <Text fontSize="sm" fontWeight="bold">${(item.price * item.qty).toFixed(2)}</Text>
                    </Flex>
                  ))}
                </VStack>
              </Box>

            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
};

export default MyOrdersPage;
