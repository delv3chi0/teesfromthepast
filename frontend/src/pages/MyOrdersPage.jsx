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
import { FaBoxOpen, FaUser, FaShippingFast } from 'react-icons/fa'; // Added new icons

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
      client.get('/orders/myorders') // Reverted API endpoint back to /orders/myorders
        .then(response => {
          setOrders(response.data);
        })
        .catch(err => {
          console.error("Error fetching orders:", err);
          setError('Could not load your orders. Please try again later.');
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
              {/* Top-level Order Summary */}
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
                  <Text fontSize="sm">${(typeof order.totalAmount === 'number' && !isNaN(order.totalAmount) ? (order.totalAmount / 100) : 0).toFixed(2)}</Text>
                </Box>

                <Box>
                  <Heading size="xs" textTransform="uppercase">Status</Heading>
                  <Tag size="md" colorScheme={order.orderStatus === 'Delivered' ? 'green' : 'yellow'} mt={1}>{order.orderStatus}</Tag>
                </Box>
              </SimpleGrid>

              <Divider my={4} borderColor="rgba(0,0,0,0.1)" />

              {/* Customer and Shipping Info */}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={4}>
                {/* Customer Info */}
                <Box layerStyle="lightCardInnerSection"> {/* Apply inner section style */}
                  <HStack mb={2}><Icon as={FaUser} mr={2} boxSize={4}/><Heading size="sm">Customer Info</Heading></HStack>
                  <Text>{order.user?.username || 'N/A'}</Text>
                  <Text>{order.user?.email || 'N/A'}</Text>
                </Box>

                {/* Shipping Address */}
                <Box layerStyle="lightCardInnerSection"> {/* Apply inner section style */}
                  <HStack mb={2}><Icon as={FaShippingFast} mr={2} boxSize={4}/><Heading size="sm">Shipping Address</Heading></HStack>
                  <Text>{order.shippingAddress?.recipientName}</Text>
                  {/* Use street1 and street2, which are expected by frontend */}
                  <Text>{order.shippingAddress?.street1}</Text>
                  {order.shippingAddress?.street2 && <Text>{order.shippingAddress.street2}</Text>}
                  <Text>{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}</Text>
                  <Text>{order.shippingAddress?.country}</Text>
                </Box>
              </SimpleGrid>

              <Divider my={4} borderColor="rgba(0,0,0,0.1)" />

              {/* Order Items List */}
              <Box>
                <Heading size="sm" mb={4}>Items</Heading>
                <VStack align="stretch" spacing={4}>
                  {order.orderItems && order.orderItems.map(item => (
                    // MODIFIED: Item Flex layout
                    <Flex
                      key={item._id}
                      className="my-orders-item-flex" // For index.css override
                      justify="space-between"
                      align="center"
                      bg="brand.secondary" // Dark background for item box
                      p={3}
                      borderRadius="md"
                      flexWrap="wrap" // Allow wrapping on small screens
                      gap={4} // Increased gap between elements
                    >
                      {/* Image and Name/Qty on the left, now allowing more space */}
                      <HStack spacing={4} flexGrow={1} flexShrink={1} flexBasis="auto">
                        <Image
                          src={item.designId?.imageDataUrl || 'https://via.placeholder.com/150'}
                          alt={item.productName || 'Order Item'}
                          boxSize="80px" // MODIFIED: Increased image size for better visibility
                          objectFit="cover"
                          borderRadius="md"
                          fallback={<Icon as={FaBoxOpen} boxSize="40px" color="brand.textMuted" />} // Fallback icon size adjusted
                        />
                        {/* MODIFIED: Consolidated name and qty on a single line if possible */}
                        <HStack align="center" spacing={2} flexWrap="wrap">
                          <Text fontWeight="bold" color="brand.textLight">{item.productName || item.name}</Text>
                          {typeof item.quantity === 'number' && !isNaN(item.quantity) && item.quantity > 0 && (
                            <Text fontSize="xs" color="brand.textLight">(Qty: {item.quantity})</Text> // Qty next to name
                          )}
                        </HStack>
                      </HStack>
                      {/* Price on the right */}
                      {typeof item.priceAtPurchase === 'number' && typeof item.quantity === 'number' && !isNaN(item.priceAtPurchase) && !isNaN(item.quantity) && (
                        <Text fontSize="md" fontWeight="bold" color="brand.textLight">${((item.priceAtPurchase || item.price) * item.quantity / 100).toFixed(2)}</Text> // Ensure division by 100
                      )}
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
