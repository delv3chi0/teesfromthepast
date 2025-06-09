// frontend/src/components/admin/ProductTypeManager.jsx
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
  Select, // For choosing category
  Switch,
  HStack,
  Tooltip,
  Icon,
  Tag,
} from '@chakra-ui/react';
import { FaPlus, FaEdit, FaTrashAlt, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { client } from '../../api/client';
import { useAuth } from '../../context/AuthProvider';

const ProductTypeManager = () => {
  const { token } = useAuth();
  const toast = useToast();

  const [productTypes, setProductTypes] = useState([]);
  const [categories, setCategories] = useState([]); // To populate category dropdown
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedProductType, setSelectedProductType] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  // Added 'category' to formData, initialized to ''
  const [formData, setFormData] = useState({ name: '', description: '', category: '', isActive: true });

  const { isOpen, onOpen, onClose } = useDisclosure(); // For Add/Edit Modal
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const fetchProductTypesAndCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch both product types and categories
      const [typesResponse, categoriesResponse] = await Promise.all([
        client.get('/admin/product-types', { headers: { Authorization: `Bearer ${token}` } }),
        client.get('/admin/product-categories', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setProductTypes(typesResponse.data);
      setCategories(categoriesResponse.data.filter(cat => cat.isActive)); // Only use active categories for selection
    } catch (err) {
      console.error("Error fetching data:", err);
      const errMsg = err.response?.data?.message || 'Failed to fetch product types or categories.';
      setError(errMsg);
      toast({ title: "Error", description: errMsg, status: "error", duration: 5000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (token) {
      fetchProductTypesAndCategories();
    }
  }, [fetchProductTypesAndCategories, token]);

  const handleOpenModal = (productType = null) => {
    if (productType) {
      setIsEditing(true);
      setSelectedProductType(productType);
      setFormData({
        name: productType.name,
        description: productType.description || '',
        category: productType.category?._id || '', // Use category ID
        isActive: productType.isActive,
      });
    } else {
      setIsEditing(false);
      setSelectedProductType(null);
      // Set default category if categories list is not empty, otherwise empty string
      setFormData({ name: '', description: '', category: categories.length > 0 ? categories[0]._id : '', isActive: true });
    }
    onOpen();
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' || type === 'switch' ? checked : value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Validation Error", description: "Product type name is required.", status: "error", duration: 3000, isClosable: true });
      return;
    }
    if (!formData.category) {
      toast({ title: "Validation Error", description: "Product category is required.", status: "error", duration: 3000, isClosable: true });
      return;
    }

    const method = isEditing ? 'put' : 'post';
    const url = isEditing ? `/admin/product-types/${selectedProductType._id}` : '/admin/product-types';

    try {
      const response = await client[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        title: `Product Type ${isEditing ? 'Updated' : 'Created'}`,
        description: `Product type "${response.data.name}" has been successfully ${isEditing ? 'updated' : 'created'}.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      fetchProductTypesAndCategories(); // Refresh the list
      onClose();
    } catch (err) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} product type:`, err);
      toast({
        title: `Error ${isEditing ? 'Updating' : 'Creating'} Product Type`,
        description: err.response?.data?.message || `Could not ${isEditing ? 'update' : 'create'} product type.`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleOpenDeleteDialog = (productType) => {
    setSelectedProductType(productType);
    onDeleteOpen();
  };

  const handleDelete = async () => {
    if (!selectedProductType) return;
    try {
      await client.delete(`/admin/product-types/${selectedProductType._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: "Product Type Deleted", description: `Product Type "${selectedProductType.name}" has been removed.`, status: "success", duration: 3000, isClosable: true });
      fetchProductTypesAndCategories(); // Refresh the list
      onDeleteClose();
    } catch (err) {
      console.error("Error deleting product type:", err);
      toast({ title: "Delete Failed", description: err.response?.data?.message || "Could not delete product type.", status: "error", duration: 5000, isClosable: true });
      onDeleteClose();
    }
  };

  if (loading) {
    return (
      <VStack justifyContent="center" alignItems="center" minH="200px">
        <Spinner size="xl" color="brand.primary" />
        <Text mt={2} color="brand.textDark">Loading Product Types & Categories...</Text>
      </VStack>
    );
  }

  if (error && productTypes.length === 0) { // Show error primarily if list is empty
    return <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>;
  }

  return (
    <Box p={{ base: 2, md: 4 }} borderWidth="1px" borderRadius="md" shadow="sm" bg="white">
      <HStack justifyContent="space-between" mb={6}>
        <Heading size="md" color="brand.textDark">Manage Product Types</Heading>
        <Button
          leftIcon={<Icon as={FaPlus} />}
          bg="brand.primary"
          color="white"
          _hover={{ bg: "brand.primaryDark" }}
          onClick={() => handleOpenModal()}
          size="sm"
          isDisabled={categories.length === 0} // Disable if no categories to assign to
        >
          Add New Type
        </Button>
      </HStack>
      {categories.length === 0 && !loading && (
        <Alert status="warning" mb={4}>
            <AlertIcon />
            Please add Product Categories first before adding Product Types.
        </Alert>
      )}

      {productTypes.length === 0 && !loading && categories.length > 0 ? (
        <Text color="brand.textDark">No product types found. Click "Add New Type" to start.</Text>
      ) : productTypes.length > 0 && (
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>Description</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {productTypes.map((pt) => (
                <Tr key={pt._id}>
                  <Td fontWeight="medium">{pt.name}</Td>
                  <Td>{pt.category?.name || 'N/A'}</Td>
                  <Td fontSize="xs" maxW="300px" whiteSpace="normal">{pt.description || 'N/A'}</Td>
                  <Td>
                    <Tag size="sm" colorScheme={pt.isActive ? 'green' : 'red'} borderRadius="full">
                      <Icon as={pt.isActive ? FaToggleOn : FaToggleOff} mr={1} />
                      {pt.isActive ? 'Active' : 'Inactive'}
                    </Tag>
                  </Td>
                  <Td>
                    <Tooltip label="Edit Product Type" placement="top">
                      <ChakraIconButton
                        icon={<Icon as={FaEdit} />}
                        size="xs"
                        variant="ghost"
                        colorScheme="yellow"
                        mr={2}
                        onClick={() => handleOpenModal(pt)}
                        aria-label="Edit Product Type"
                      />
                    </Tooltip>
                    <Tooltip label="Delete Product Type" placement="top">
                      <ChakraIconButton
                        icon={<Icon as={FaTrashAlt} />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleOpenDeleteDialog(pt)}
                        aria-label="Delete Product Type"
                      />
                    </Tooltip>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="brand.paper">
          <ModalHeader color="brand.textDark">{isEditing ? 'Edit' : 'Add New'} Product Type</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired isInvalid={!formData.name && formData.name.length === 0}>
                <FormLabel color="brand.textDark">Type Name</FormLabel>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g., T-Shirt, Hoodie, Mug"
                  bg="white"
                />
              </FormControl>

              <FormControl isRequired isInvalid={!formData.category}>
                <FormLabel color="brand.textDark">Category</FormLabel>
                <Select
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  placeholder="Select category"
                  bg="white"
                  isDisabled={categories.length === 0}
                >
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </Select>
                {categories.length === 0 && <Text fontSize="xs" color="red.500" mt={1}>No active categories available. Please create one first.</Text>}
              </FormControl>

              <FormControl>
                <FormLabel color="brand.textDark">Description (Optional)</FormLabel>
                <Input
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Brief description of the product type"
                  bg="white"
                />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="isActive-type" mb="0" color="brand.textDark">
                  Active:
                </FormLabel>
                <Switch
                  id="isActive-type"
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
            <Button
              bg="brand.primary"
              color="white"
              _hover={{ bg: "brand.primaryDark" }}
              onClick={handleSubmit}
              isDisabled={categories.length === 0 && !isEditing} // Disable create if no categories and not editing
            >
              {isEditing ? 'Save Changes' : 'Create Type'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      {selectedProductType && (
        <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered>
          <ModalOverlay />
          <ModalContent bg="brand.paper">
            <ModalHeader color="brand.textDark">Confirm Deletion</ModalHeader>
            <ModalCloseButton />
            <ModalBody color="brand.textDark">
              <Text>Are you sure you want to delete the product type "<strong>{selectedProductType.name}</strong>"?</Text>
              <Text mt={2} color="red.500" fontWeight="bold">This action cannot be undone.</Text>
               <Text mt={1} fontSize="sm">(If this type is in use by Products, deletion might be prevented by the server.)</Text>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={onDeleteClose} mr={3}>Cancel</Button>
              <Button colorScheme="red" onClick={handleDelete}>Delete Type</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
};

export default ProductTypeManager;
