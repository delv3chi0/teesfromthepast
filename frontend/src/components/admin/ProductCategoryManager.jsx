import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Spinner,
  Alert,
  AlertIcon,
  VStack,
  Text,
  useToast,
  IconButton as ChakraIconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Switch,
  HStack,
  Tooltip,
  Icon,
  Tag,
} from '@chakra-ui/react';
import { FaPlus, FaEdit, FaTrashAlt, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { client } from '../../api/client';
import { useAuth } from '../../context/AuthProvider';

const ProductCategoryManager = () => {
  const { token } = useAuth();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', isActive: true });

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await client.get('/admin/product-categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(response.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError(err.response?.data?.message || 'Failed to fetch product categories.');
      toast({ title: "Error", description: err.response?.data?.message || 'Failed to fetch categories.', status: "error", duration: 5000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (token) {
      fetchCategories();
    }
  }, [fetchCategories, token]);

  const handleOpenModal = (category = null) => {
    if (category) {
      setIsEditing(true);
      setSelectedCategory(category);
      setFormData({ name: category.name, description: category.description || '', isActive: category.isActive });
    } else {
      setIsEditing(false);
      setSelectedCategory(null);
      setFormData({ name: '', description: '', isActive: true });
    }
    onOpen();
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' || type === 'switch' ? checked : value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Validation Error", description: "Category name is required.", status: "error", duration: 3000, isClosable: true });
      return;
    }

    const method = isEditing ? 'put' : 'post';
    const url = isEditing ? `/admin/product-categories/${selectedCategory._id}` : '/admin/product-categories';

    try {
      const response = await client[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        title: `Category ${isEditing ? 'Updated' : 'Created'}`,
        description: `Category "${response.data.name}" has been successfully ${isEditing ? 'updated' : 'created'}.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      fetchCategories();
      onClose();
    } catch (err) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} category:`, err);
      toast({
        title: `Error ${isEditing ? 'Updating' : 'Creating'} Category`,
        description: err.response?.data?.message || `Could not ${isEditing ? 'update' : 'create'} category.`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleOpenDeleteDialog = (category) => {
    setSelectedCategory(category);
    onDeleteOpen();
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    try {
      await client.delete(`/admin/product-categories/${selectedCategory._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: "Category Deleted", description: `Category "${selectedCategory.name}" has been removed.`, status: "success", duration: 3000, isClosable: true });
      fetchCategories();
      onDeleteClose();
    } catch (err) {
      console.error("Error deleting category:", err);
      toast({ title: "Delete Failed", description: err.response?.data?.message || "Could not delete category.", status: "error", duration: 5000, isClosable: true });
      onDeleteClose(); 
    }
  };

  if (loading) {
    return (
      <VStack justifyContent="center" alignItems="center" minH="200px">
        <Spinner size="xl" color="brand.primary" />
        <Text mt={2} color="brand.textDark">Loading Product Categories...</Text>
      </VStack>
    );
  }

  if (error) {
    return <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>;
  }

  return (
    <Box p={{ base: 2, md: 4 }}>
      <HStack justifyContent="space-between" mb={6}>
        <Heading size="md">Manage Categories</Heading>
        {/* MODIFIED: Changed colorScheme to match other primary buttons */}
        <Button
          leftIcon={<Icon as={FaPlus} />}
          colorScheme="brandAccentOrange"
          onClick={() => handleOpenModal()}
          size="sm"
        >
          Add New Category
        </Button>
      </HStack>

      {categories.length === 0 ? (
        <Text>No product categories found. Click "Add New Category" to start.</Text>
      ) : (
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Description</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {categories.map((category) => (
                <Tr key={category._id}>
                  <Td fontWeight="medium">{category.name}</Td>
                  <Td fontSize="xs" maxW="300px" whiteSpace="normal">{category.description || 'N/A'}</Td>
                  <Td>
                    <Tag size="sm" colorScheme={category.isActive ? 'green' : 'red'} borderRadius="full">
                      <Icon as={category.isActive ? FaToggleOn : FaToggleOff} mr={1} />
                      {category.isActive ? 'Active' : 'Inactive'}
                    </Tag>
                  </Td>
                  <Td>
                    <Tooltip label="Edit Category" placement="top">
                      <ChakraIconButton
                        icon={<Icon as={FaEdit} />}
                        size="xs"
                        variant="ghost"
                        colorScheme="yellow"
                        mr={2}
                        onClick={() => handleOpenModal(category)}
                        aria-label="Edit Category"
                      />
                    </Tooltip>
                    <Tooltip label="Delete Category" placement="top">
                      <ChakraIconButton
                        icon={<Icon as={FaTrashAlt} />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleOpenDeleteDialog(category)}
                        aria-label="Delete Category"
                      />
                    </Tooltip>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isEditing ? 'Edit' : 'Add New'} Product Category</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Category Name</FormLabel>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g., Men's Apparel, Accessories"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description (Optional)</FormLabel>
                <Input
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Brief description of the category"
                />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="isActive-category" mb="0">
                  Active:
                </FormLabel>
                <Switch
                  id="isActive-category"
                  name="isActive"
                  isChecked={formData.isActive}
                  onChange={handleFormChange}
                  colorScheme="green"
                  ml={3}
                />
                 <Text ml={2} fontSize="sm" color={formData.isActive ? "green.500" : "red.500"}>
                    ({formData.isActive ? "Visible" : "Hidden"})
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose} mr={3} variant="ghost">Cancel</Button>
            {/* MODIFIED: Changed colorScheme to match other primary buttons */}
            <Button
              colorScheme="brandAccentOrange"
              onClick={handleSubmit}
            >
              {isEditing ? 'Save Changes' : 'Create Category'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {selectedCategory && (
        <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Confirm Deletion</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Text>Are you sure you want to delete the category "<strong>{selectedCategory.name}</strong>"?</Text>
              <Text mt={2} color="red.500" fontWeight="bold">This action cannot be undone.</Text>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={onDeleteClose} mr={3}>Cancel</Button>
              <Button colorScheme="red" onClick={handleDelete}>Delete Category</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
};

export default ProductCategoryManager;
