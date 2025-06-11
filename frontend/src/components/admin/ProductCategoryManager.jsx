// frontend/src/components/admin/ProductCategoryManager.jsx
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
import apiClient from '../../api/client';

const ProductCategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const { data } = await apiClient.get('/admin/product-categories');
      setCategories(data);
      setError('');
    } catch (err) {
      setError('Could not fetch product categories.');
      toast({
        title: 'Error fetching categories',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name cannot be empty.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    try {
      await apiClient.post('/admin/product-categories', { name: newCategoryName });
      toast({
        title: 'Category created.',
        description: `Successfully created "${newCategoryName}".`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      setNewCategoryName('');
      fetchCategories(); // Refresh the list
    } catch (err) {
      toast({
        title: 'Creation failed',
        description: err.response?.data?.message || 'Could not create category.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await apiClient.delete(`/admin/product-categories/${id}`);
        toast({
          title: 'Category deleted.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        fetchCategories(); // Refresh the list
      } catch (err) {
        toast({
          title: 'Deletion failed',
          description: err.response?.data?.message || 'Could not delete category.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Heading size="md" mb={4}>
        Manage Product Categories
      </Heading>
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
          <Tr>
            <Th>Name</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {categories.map((category) => (
            <Tr key={category._id}>
              <Td>{category.name}</Td>
              <Td>
                <Button
                  size="sm"
                  colorScheme="red"
                  onClick={() => handleDeleteCategory(category._id)}
                >
                  Delete
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default ProductCategoryManager;
