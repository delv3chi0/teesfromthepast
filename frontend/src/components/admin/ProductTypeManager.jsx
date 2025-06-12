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
  Select,
  VStack,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { client } from '../../api/client';

const ProductTypeManager = () => {
  const [types, setTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [typesRes, categoriesRes] = await Promise.all([
        client.get('/admin/product-types'),
        client.get('/admin/product-categories')
      ]);
      setTypes(typesRes.data);
      setCategories(categoriesRes.data);
      if (categoriesRes.data.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(categoriesRes.data[0]._id);
      }
      setError('');
    } catch (err) {
      setError('Could not fetch data.');
      toast({ title: 'Error', description: err.message, status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateType = async () => {
    if (!newTypeName.trim() || !selectedCategoryId) {
      toast({ title: 'Validation Error', description: 'Name and category are required.', status: 'warning' });
      return;
    }
    try {
      // Sending only name and category, as description is not needed.
      await client.post('/admin/product-types', { 
        name: newTypeName, 
        category: selectedCategoryId 
      });
      toast({ title: 'Product type created.', status: 'success' });
      setNewTypeName('');
      fetchData(); // Refresh list
    } catch (err) {
      toast({ title: 'Creation failed', description: err.response?.data?.message || 'Could not create type.', status: 'error' });
    }
  };

  const handleDeleteType = async (id) => {
    if (window.confirm('Are you sure you want to delete this product type?')) {
      try {
        await client.delete(`/admin/product-types/${id}`);
        toast({ title: 'Product type deleted.', status: 'success' });
        fetchData(); // Refresh list
      } catch (err) {
        toast({ title: 'Deletion failed', description: err.response?.data?.message || 'Could not delete type.', status: 'error' });
      }
    }
  };
 
  if (isLoading) return <Spinner />;
  if (error) return <Alert status="error"><AlertIcon />{error}</Alert>;

  return (
    <Box bg="ui.background" p={6} borderRadius="lg" shadow="sm">
      <Heading size="md" mb={4}>Manage Product Types</Heading>
      <VStack as="form" mb={6} spacing={4} align="stretch" onSubmit={(e) => { e.preventDefault(); handleCreateType(); }}>
        <FormControl isRequired>
          <FormLabel>Type Name</FormLabel>
          <Input placeholder="New product type name" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} />
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Category</FormLabel>
          <Select placeholder="Select category" value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
            {categories.map(cat => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </Select>
        </FormControl>
        <Button type="submit" alignSelf="flex-end">Add Type</Button>
      </VStack>

      <Table variant="simple" size="sm">
        <Thead>
          <Tr><Th>Name</Th><Th>Category</Th><Th>Actions</Th></Tr>
        </Thead>
        <Tbody>
          {types.map((type) => (
            <Tr key={type._id}>
              <Td>{type.name}</Td>
              <Td>{type.category?.name || 'N/A'}</Td>
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
