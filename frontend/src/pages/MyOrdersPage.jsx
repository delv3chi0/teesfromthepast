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
  Icon,
  Image,
  HStack,
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
        })
        .catch(err => {
          console.error("Error fetching orders:", err);
          setError('Could not load your orders.');
          if (err.response?.status === 401) {
            logout();
            navigate('/login');
          }
        })
        .finally(() => {
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
        <Box layerStyle="cardBlue" p={10} textAlign="center">
            <VStack spacing={5}>
                <Icon as={FaBoxOpen} boxSize="50px" />
                <Text fontSize="xl" fontWeight="medium">You haven't placed any orders yet.</Text>
                <Button colorScheme="brandAccentOrange" onClick={() => navigate('/shop')}>Start Shopping</Button>
            </VStack>
        </Box>
      ) : (
        <VStack spacing={6} align="stretch">
          {orders.map(order => (
            <Box key={order._id} layerStyle="cardBlue" p={6}>
              <SimpleGrid columns={{ base: 1, md: 4 }} spacing={{ base: 4, md: 6 }} alignItems="center">

                <Box>
                  <Heading size="xs" textTransform="uppercase">Order #</Heading>
                  <Text fontSize="sm" title={order._id}>{(order._id || '').substring(18)}</Text>
                </Box>

                <Box>
                  <Heading size="xs" textTransform="uppercase">Date Placed</Heading>
                  <Text fontSize="sm">{new Date(order.createdAt).toLocaleDateString()}</Text>
                </Box>

                <Box>
                  <Heading size="xs" textTransform="uppercase">Total</Heading>
                  <Text fontSize="sm">${(order.totalPrice || 0).toFixed(2)}</Text>
                </Box>

                <Box>
                  <Heading size="xs" textTransform="uppercase">Status</Heading>
                  <Tag size="md" colorScheme={order.orderStatus === 'Delivered' ? 'green' : 'yellow'} mt={1}>{order.orderStatus}</Tag>
                </Box>

              </SimpleGrid>

              <Divider my={4} borderColor="rgba(0,0,0,0.1)" />

              <Box>
                <Heading size="sm" mb={4}>Items</Heading>
                <VStack align="stretch" spacing={4}>
                  {order.orderItems && order.orderItems.map(item => (
                    // MODIFIED: bg to brand.secondary and color to brand.textLight for the container
                    <Flex key={item._id} justify="space-between" align="center" bg="brand.secondary" color="brand.textLight" p={3} borderRadius="md">
                      <HStack spacing={4}>
                        <Image
                          src={item.designId?.imageDataUrl || 'https://via.placeholder.com/150'}
                          alt={item.name}
                          boxSize="60px"
                          objectFit="cover"
                          borderRadius="md"
                          fallback={<Icon as={FaBoxOpen} boxSize="30px" color="brand.textMuted" />} // Fallback icon color adjusted
                          mr={4} mb={{base: 2, md: 0}}
                        />
                        <VStack align="start" spacing={0}>
                          {/* MODIFIED: Explicitly set color for Text components to brand.textLight */}
                          <Text fontWeight="bold" color="brand.textLight">{item.name}</Text>
                          <Text fontSize="xs" color="brand.textLight">Qty: {item.qty}</Text>
                        </VStack>
                      </HStack>
                      {/* MODIFIED: Explicitly set color for Text component to brand.textLight */}
                      <Text fontSize="sm" fontWeight="bold" color="brand.textLight">${(item.price * item.qty).toFixed(2)}</Text>
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
