import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Button,
  Input,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  // Card has been removed from imports
} from '@chakra-ui/react';
import { client } from '../../api/client';

const ProductTypeManager = () => {
  const [types, setTypes] = useState([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  const fetchTypes = async () => {
    try {
      setIsLoading(true);
      const { data } = await client.get('/admin/product-types');
      setTypes(data);
      setError('');
    } catch (err) {
      setError('Could not fetch product types.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;
    try {
      await client.post('/admin/product-types', { name: newTypeName });
      toast({ title: 'Product type created.', status: 'success', duration: 3000, isClosable: true });
      setNewTypeName('');
      fetchTypes();
    } catch (err) {
      toast({ title: 'Creation failed.', description: err.message, status: 'error', duration: 5000, isClosable: true });
    }
  };

  const handleDeleteType = async (id) => {
    if (window.confirm('Are you sure you want to delete this product type?')) {
      try {
        await client.delete(`/admin/product-types/${id}`);
        toast({ title: 'Product type deleted.', status: 'success', duration: 3000, isClosable: true });
        fetchTypes();
      } catch (err) {
        toast({ title: 'Deletion failed.', description: err.message, status: 'error', duration: 5000, isClosable: true });
      }
    }
  };

  if (isLoading) return <Spinner />;
  if (error) return <Alert status="error"><AlertIcon />{error}</Alert>;

  // Using a styled Box to precisely match the Products tab layout
  return (
    <Box bg="ui.background" p={6} borderRadius="lg" shadow="sm">
      <Heading size="md" mb={4}>Manage Product Types</Heading>
      <HStack as="form" mb={6} onSubmit={(e) => { e.preventDefault(); handleCreateType(); }}>
        <Input
          placeholder="New product type name"
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
        />
        <Button type="submit">Add Type</Button>
      </HStack>
      <Table variant="simple">
        <Thead>
          <Tr><Th>Name</Th><Th>Actions</Th></Tr>
        </Tbody>
        <Tbody>
          {types.map((type) => (
            <Tr key={type._id}>
              <Td>{type.name}</Td>
              <Td>
                <Button size="sm" colorScheme="red" onClick={() => handleDeleteType(type._id)}>Delete</Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default ProductTypeManager;
