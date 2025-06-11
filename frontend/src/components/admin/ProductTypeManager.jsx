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
} from '@chakra-ui/react';
// FINAL FIX: Importing the correctly named 'client'
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
      // FINAL FIX: Using 'client' to make the API call
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
      // FINAL FIX: Using 'client'
      await client.post('/admin/product-types', { name: newTypeName });
      toast({ title: 'Product type created.', status: 'success' });
      setNewTypeName('');
      fetchTypes();
    } catch (err) {
      toast({ title: 'Creation failed.', description: err.message, status: 'error' });
    }
  };

  const handleDeleteType = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        // FINAL FIX: Using 'client'
        await client.delete(`/admin/product-types/${id}`);
        toast({ title: 'Product type deleted.', status: 'success' });
        fetchTypes();
      } catch (err) {
        toast({ title: 'Deletion failed.', description: err.message, status: 'error' });
      }
    }
  };

  if (isLoading) return <Spinner />;
  if (error) return <Alert status="error"><AlertIcon />{error}</Alert>;

  return (
    <Box>
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
        </Thead>
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
