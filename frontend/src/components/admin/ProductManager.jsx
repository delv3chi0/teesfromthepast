// frontend/src/components/admin/ProductManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Heading, Button, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Spinner, Alert, AlertIcon, VStack, Text, useToast, IconButton as ChakraIconButton,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  useDisclosure, FormControl, FormLabel, Input, Select, Switch, HStack, Tooltip, Icon,
  Tag, SimpleGrid, Textarea, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Divider, CloseButton as ChakraCloseButton,
} from '@chakra-ui/react';
import { FaPlus, FaEdit, FaTrashAlt, FaToggleOn, FaToggleOff, FaBox } from 'react-icons/fa';
import { client } from '../../api/client';
import { useAuth } from '../../context/AuthProvider';

const initialVariantState = {
  colorName: '',
  colorHex: '',
  size: '',
  sku: '',
  stock: 0,
  priceModifier: 0,
  imageMockupFront: '',
  imageMockupBack: '',
  podService: '',
  podProductId: '',
  podVariantId: '',
};

const ProductManager = () => {
  const { token } = useAuth();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [productTypes, setProductTypes] = useState([]); // For product type dropdown
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    productType: '', // Will store ProductType ID
    basePrice: 0,
    tags: [], // Stored as an array of strings
    isActive: true,
    variants: [],
  });
  const [currentVariant, setCurrentVariant] = useState(initialVariantState); // For adding/editing a single variant in the modal

  const { isOpen, onOpen, onClose } = useDisclosure(); // For Add/Edit Product Modal
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [productsResponse, typesResponse] = await Promise.all([
        client.get('/admin/products', { headers: { Authorization: `Bearer ${token}` } }),
        client.get('/admin/product-types', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setProducts(productsResponse.data);
      setProductTypes(typesResponse.data.filter(pt => pt.isActive)); // Only active types for selection
    } catch (err) {
      console.error("Error fetching products/types:", err);
      const errMsg = err.response?.data?.message || 'Failed to fetch products or product types.';
      setError(errMsg);
      toast({ title: "Error", description: errMsg, status: "error", duration: 5000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [fetchData, token]);

  const handleOpenModal = (product = null) => {
    setCurrentVariant(initialVariantState); // Reset variant form
    if (product) {
      setIsEditing(true);
      setSelectedProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        productType: product.productType?._id || '',
        basePrice: product.basePrice || 0,
        tags: product.tags || [],
        isActive: product.isActive,
        variants: product.variants ? JSON.parse(JSON.stringify(product.variants)) : [], // Deep copy variants
      });
    } else {
      setIsEditing(false);
      setSelectedProduct(null);
      setFormData({
        name: '', description: '', productType: productTypes.length > 0 ? productTypes[0]._id : '',
        basePrice: 0, tags: [], isActive: true, variants: [],
      });
    }
    onOpen();
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "tags") {
      setFormData(prev => ({ ...prev, tags: value.split(',').map(tag => tag.trim()).filter(tag => tag) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' || type === 'switch' ? checked : value }));
    }
  };
  
  const handleBasePriceChange = (valueAsString, valueAsNumber) => {
    setFormData(prev => ({ ...prev, basePrice: valueAsNumber || 0 }));
  };

  const handleVariantFormChange = (e) => {
    const { name, value } = e.target;
    setCurrentVariant(prev => ({ ...prev, [name]: value }));
  };

  const handleVariantNumberChange = (name, valueAsString, valueAsNumber) => {
     setCurrentVariant(prev => ({ ...prev, [name]: valueAsNumber || 0 }));
  };
  
  const handleAddVariant = () => {
    // Validate currentVariant before adding
    if (!currentVariant.sku || !currentVariant.colorName || !currentVariant.size || !currentVariant.imageMockupFront) {
      toast({ title: "Variant Incomplete", description: "SKU, Color, Size, and Front Mockup URL are required for a variant.", status: "warning", duration: 4000 });
      return;
    }
    if (formData.variants.find(v => v.sku === currentVariant.sku)) {
      toast({ title: "Duplicate SKU", description: "This SKU already exists in the list for this product.", status: "warning", duration: 4000 });
      return;
    }
    setFormData(prev => ({ ...prev, variants: [...prev.variants, { ...currentVariant }] }));
    setCurrentVariant(initialVariantState); // Reset for next variant
  };

  const handleRemoveVariant = (skuToRemove) => {
    setFormData(prev => ({ ...prev, variants: prev.variants.filter(v => v.sku !== skuToRemove) }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Validation Error", description: "Product name is required.", status: "error" }); return;
    }
    if (!formData.productType) {
      toast({ title: "Validation Error", description: "Product type is required.", status: "error" }); return;
    }
    if (formData.variants.length === 0) {
      toast({ title: "Validation Error", description: "At least one product variant is required.", status: "error" }); return;
    }

    const method = isEditing ? 'put' : 'post';
    const url = isEditing ? `/admin/products/${selectedProduct._id}` : '/admin/products';
    
    // Ensure tags is an array of strings
    const payload = {
        ...formData,
        tags: Array.isArray(formData.tags) ? formData.tags : (formData.tags || '').split(',').map(tag => tag.trim()).filter(tag => tag),
    };

    try {
      const response = await client[method](url, payload, { headers: { Authorization: `Bearer ${token}` } });
      toast({
        title: `Product ${isEditing ? 'Updated' : 'Created'}`,
        description: `Product "${response.data.name}" saved successfully.`,
        status: "success",
      });
      fetchData();
      onClose();
    } catch (err) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} product:`, err);
      toast({
        title: `Error ${isEditing ? 'Saving' : 'Creating'} Product`,
        description: err.response?.data?.message || `Could not save product.`,
        status: "error",
      });
    }
  };

  const handleOpenDeleteDialog = (product) => {
    setSelectedProduct(product);
    onDeleteOpen();
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    try {
      await client.delete(`/admin/products/${selectedProduct._id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "Product Deleted", description: `Product "${selectedProduct.name}" removed.`, status: "success" });
      fetchData();
      onDeleteClose();
    } catch (err) {
      console.error("Error deleting product:", err);
      toast({ title: "Delete Failed", description: err.response?.data?.message || "Could not delete product.", status: "error" });
      onDeleteClose();
    }
  };

  if (loading) {
    return <VStack justifyContent="center" alignItems="center" minH="200px"><Spinner size="xl" color="brand.primary" /><Text mt={2}>Loading Products...</Text></VStack>;
  }
  if (error && products.length === 0) {
    return <Alert status="error"><AlertIcon />{error}</Alert>;
  }

  return (
    <Box p={{ base: 2, md: 4 }} borderWidth="1px" borderRadius="md" shadow="sm" bg="white">
      <HStack justifyContent="space-between" mb={6}>
        <Heading size="md" color="brand.textDark">Manage Products</Heading>
        <Button leftIcon={<Icon as={FaPlus} />} bg="brand.primary" color="white" _hover={{ bg: "brand.primaryDark" }} onClick={() => handleOpenModal()} size="sm" isDisabled={productTypes.length === 0}>
          Add New Product
        </Button>
      </HStack>
      {productTypes.length === 0 && !loading && <Alert status="warning" mb={4}><AlertIcon />Please add Product Types first.</Alert>}

      {products.length === 0 && !loading && productTypes.length > 0 ? (
        <Text>No products found. Click "Add New Product" to start.</Text>
      ) : products.length > 0 && (
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>Name</Th><Th>Type</Th><Th>Base Price</Th><Th>Variants</Th><Th>Status</Th><Th>Actions</Th></Tr></Thead>
            <Tbody>
              {products.map((p) => (
                <Tr key={p._id}>
                  <Td fontWeight="medium">{p.name}</Td>
                  <Td>{p.productType?.name || 'N/A'}</Td>
                  <Td>${p.basePrice?.toFixed(2)}</Td>
                  <Td>{p.variants?.length || 0}</Td>
                  <Td><Tag size="sm" colorScheme={p.isActive ? 'green' : 'red'} borderRadius="full"><Icon as={p.isActive ? FaToggleOn : FaToggleOff} mr={1}/>{p.isActive ? 'Active' : 'Inactive'}</Tag></Td>
                  <Td>
                    <Tooltip label="Edit Product"><ChakraIconButton icon={<Icon as={FaEdit}/>} size="xs" variant="ghost" colorScheme="yellow" mr={2} onClick={() => handleOpenModal(p)}/></Tooltip>
                    <Tooltip label="Delete Product"><ChakraIconButton icon={<Icon as={FaTrashAlt}/>} size="xs" variant="ghost" colorScheme="red" onClick={() => handleOpenDeleteDialog(p)}/></Tooltip>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Product Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent bg="brand.paperMaxContrast"> {/* Changed background for better contrast with nested cards */}
          <ModalHeader color="brand.textDark">{isEditing ? 'Edit' : 'Add New'} Product</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6} >
            <VStack spacing={6} align="stretch">
              {/* Main Product Details */}
              <Box p={4} borderWidth="1px" borderRadius="md" bg="brand.paper" shadow="sm">
                <Heading size="sm" mb={4} color="brand.textDark">Product Details</Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl isRequired><FormLabel>Name</FormLabel><Input name="name" value={formData.name} onChange={handleFormChange} bg="white"/></FormControl>
                  <FormControl isRequired><FormLabel>Product Type</FormLabel>
                    <Select name="productType" value={formData.productType} onChange={handleFormChange} placeholder="Select type" bg="white" isDisabled={productTypes.length === 0}>
                      {productTypes.map(pt => (<option key={pt._id} value={pt._id}>{pt.name} ({pt.category?.name})</option>))}
                    </Select>
                  </FormControl>
                  <FormControl isRequired><FormLabel>Base Price ($)</FormLabel>
                    <NumberInput name="basePrice" value={formData.basePrice} onChange={handleBasePriceChange} min={0} precision={2} step={0.01} bg="white">
                        <NumberInputField />
                        <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  <FormControl><FormLabel>Tags (comma-separated)</FormLabel><Input name="tags" value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''} onChange={handleFormChange} placeholder="e.g. retro, vintage" bg="white"/></FormControl>
                </SimpleGrid>
                <FormControl mt={4}><FormLabel>Description</FormLabel><Textarea name="description" value={formData.description} onChange={handleFormChange} bg="white"/></FormControl>
                <FormControl display="flex" alignItems="center" mt={4}><FormLabel htmlFor="isActive-product" mb="0">Active:</FormLabel>
                  <Switch id="isActive-product" name="isActive" isChecked={formData.isActive} onChange={handleFormChange} colorScheme="green" ml={3}/>
                  <Text ml={2} fontSize="sm" color={formData.isActive ? "green.500" : "red.500"}>({formData.isActive ? "Visible" : "Hidden"})</Text>
                </FormControl>
              </Box>

              {/* Variant Management Section */}
              <Box p={4} borderWidth="1px" borderRadius="md" bg="brand.paper" shadow="sm">
                <Heading size="sm" mb={4} color="brand.textDark">Product Variants</Heading>
                {/* Form to Add/Edit a single variant */}
                <Box p={3} borderWidth="1px" borderRadius="md" mb={4} borderColor="gray.300">
                    <Heading size="xs" mb={3} color="brand.textSlightlyDark">Add New Variant</Heading>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                        <FormControl isRequired><FormLabel fontSize="sm">Color Name</FormLabel><Input size="sm" name="colorName" value={currentVariant.colorName} onChange={handleVariantFormChange} bg="white"/></FormControl>
                        <FormControl><FormLabel fontSize="sm">Color Hex</FormLabel><Input size="sm" name="colorHex" value={currentVariant.colorHex} onChange={handleVariantFormChange} bg="white"/></FormControl>
                        <FormControl isRequired><FormLabel fontSize="sm">Size</FormLabel><Input size="sm" name="size" value={currentVariant.size} onChange={handleVariantFormChange} bg="white"/></FormControl>
                        <FormControl isRequired><FormLabel fontSize="sm">SKU (Unique)</FormLabel><Input size="sm" name="sku" value={currentVariant.sku} onChange={handleVariantFormChange} bg="white"/></FormControl>
                        <FormControl isRequired><FormLabel fontSize="sm">Stock</FormLabel>
                            <NumberInput size="sm" name="stock" value={currentVariant.stock} onChange={(valStr, valNum) => handleVariantNumberChange('stock', valStr, valNum)} min={0} bg="white">
                                <NumberInputField /><NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                            </NumberInput>
                        </FormControl>
                        <FormControl><FormLabel fontSize="sm">Price Modifier ($)</FormLabel>
                            <NumberInput size="sm" name="priceModifier" value={currentVariant.priceModifier} onChange={(valStr, valNum) => handleVariantNumberChange('priceModifier', valStr, valNum)} precision={2} step={0.01} bg="white">
                                <NumberInputField /><NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                            </NumberInput>
                        </FormControl>
                        <FormControl isRequired><FormLabel fontSize="sm">Mockup Front URL</FormLabel><Input size="sm" name="imageMockupFront" value={currentVariant.imageMockupFront} onChange={handleVariantFormChange} bg="white"/></FormControl>
                        <FormControl><FormLabel fontSize="sm">Mockup Back URL</FormLabel><Input size="sm" name="imageMockupBack" value={currentVariant.imageMockupBack} onChange={handleVariantFormChange} bg="white"/></FormControl>
                        <FormControl><FormLabel fontSize="sm">POD Service</FormLabel><Input size="sm" name="podService" value={currentVariant.podService} onChange={handleVariantFormChange} placeholder="e.g., Printify" bg="white"/></FormControl>
                        <FormControl><FormLabel fontSize="sm">POD Product ID</FormLabel><Input size="sm" name="podProductId" value={currentVariant.podProductId} onChange={handleVariantFormChange} bg="white"/></FormControl>
                        <FormControl><FormLabel fontSize="sm">POD Variant ID</FormLabel><Input size="sm" name="podVariantId" value={currentVariant.podVariantId} onChange={handleVariantFormChange} bg="white"/></FormControl>
                    </SimpleGrid>
                    <Button size="sm" mt={4} colorScheme="teal" onClick={handleAddVariant}>Add Variant to List</Button>
                </Box>
                <Divider my={4} />
                {/* List of added variants */}
                <Heading size="xs" mb={3} color="brand.textSlightlyDark">Current Variants for this Product ({formData.variants.length})</Heading>
                {formData.variants.length === 0 ? <Text fontSize="sm">No variants added yet.</Text> : (
                    <VStack spacing={2} align="stretch">
                        {formData.variants.map((variant, index) => (
                            <Box key={variant.sku || index} p={2} borderWidth="1px" borderRadius="md" bg="gray.50" position="relative">
                                <ChakraCloseButton size="sm" position="absolute" top="5px" right="5px" onClick={() => handleRemoveVariant(variant.sku)} />
                                <Text fontSize="sm"><strong>SKU:</strong> {variant.sku} | <strong>Color:</strong> {variant.colorName} | <strong>Size:</strong> {variant.size}</Text>
                                <Text fontSize="xs"><strong>Stock:</strong> {variant.stock} | <strong>Price Mod:</strong> ${variant.priceModifier.toFixed(2)}</Text>
                                <Text fontSize="xs" noOfLines={1}><strong>Mockup:</strong> {variant.imageMockupFront}</Text>
                                {variant.podService && <Text fontSize="xs"><strong>POD:</strong> {variant.podService} - {variant.podProductId} / {variant.podVariantId}</Text>}
                            </Box>
                        ))}
                    </VStack>
                )}
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose} mr={3} variant="ghost">Cancel</Button>
            <Button bg="brand.primary" color="white" _hover={{ bg: "brand.primaryDark" }} onClick={handleSubmit}>
              {isEditing ? 'Save Changes' : 'Create Product'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Product Confirmation Modal */}
      {selectedProduct && (
        <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered>
          <ModalOverlay />
          <ModalContent bg="brand.paper"><ModalHeader>Confirm Deletion</ModalHeader><ModalCloseButton />
            <ModalBody><Text>Delete "<strong>{selectedProduct.name}</strong>"? This will delete the product and all its variants.</Text>
              <Text mt={2} color="red.500" fontWeight="bold">This action cannot be undone.</Text>
            </ModalBody>
            <ModalFooter><Button variant="ghost" onClick={onDeleteClose} mr={3}>Cancel</Button><Button colorScheme="red" onClick={handleDelete}>Delete Product</Button></ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
};

export default ProductManager;
