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

const ProductCategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const { data } = await client.get('/admin/product-categories');
      setCategories(data);
      setError('');
    } catch (err) {
      setError('Could not fetch product categories.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await client.post('/admin/product-categories', { name: newCategoryName });
      toast({ title: 'Category created.', status: 'success', duration: 3000, isClosable: true });
      setNewCategoryName('');
      fetchCategories();
    } catch (err) {
      toast({ title: 'Creation failed.', description: err.message, status: 'error', duration: 5000, isClosable: true });
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await client.delete(`/admin/product-categories/${id}`);
        toast({ title: 'Category deleted.', status: 'success', duration: 3000, isClosable: true });
        fetchCategories();
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
      <Heading size="md" mb={4}>Manage Product Categories</Heading>
      <HStack as="form" mb={6} onSubmit={(e) => { e.preventDefault(); handleCreateCategory(); }}>
        <Input
          placeholder="New category name"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
        />
        <Button type="submit">Add Category</Button>
      </HStack>
      <Table variant="simple">
        <Thead>
          <Tr><Th>Name</Th><Th>Actions</Th></Tr>
        </Thead>
        <Tbody>
          {categories.map((category) => (
            <Tr key={category._id}>
              <Td>{category.name}</Td>
              <Td>
                <Button size="sm" colorScheme="red" onClick={() => handleDeleteCategory(category._id)}>Delete</Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default ProductCategoryManager;
