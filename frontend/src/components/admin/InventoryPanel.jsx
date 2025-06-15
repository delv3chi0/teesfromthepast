import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Heading, Button, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Spinner, Alert, AlertIcon, VStack, Text, useToast, IconButton as ChakraIconButton,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  useDisclosure, FormControl, FormLabel, Input, Select, Switch, HStack, Tooltip, Icon,
  Tag, SimpleGrid, Textarea, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Divider, CloseButton,
  Image, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Wrap, WrapItem, Radio, RadioGroup, Stack, Flex
} from '@chakra-ui/react';
import { FaPlus, FaEdit, FaTrashAlt, FaToggleOn, FaToggleOff, FaImage, FaStar } from 'react-icons/fa';
import { client } from '../../api/client';
import { useAuth } from '../../context/AuthProvider';

// --- Product Manager Specific Constants (Moved from original ProductManager.jsx) ---
const SIZES = ["XS", "S", "M", "L", "XXL", "One Size", "6M", "12M", "18M", "24M"]; // Fixed typo "XXL" instead of "XXL"
const CORE_COLORS = [ { name: "Black", hex: "#000000" }, { name: "White", hex: "#FFFFFF" }, { name: "Navy Blue", hex: "#000080" }, { name: "Heather Grey", hex: "#B2BEB5" }, { name: "Cream / Natural", hex: "#FFFDD0" }, { name: "Mustard Yellow", hex: "#FFDB58" }, { name: "Olive Green", hex: "#556B2F" }, { name: "Maroon", hex: "#800000" }, { name: "Burnt Orange", hex: "#CC5500" }, { name: "Heather Forest", hex: "#228B22" }, { name: "Royal Blue", hex: "#4169E1" }, { name: "Charcoal", hex: "#36454F" }, { name: "Sand", hex: "#C2B280" }, { name: "Light Blue", hex: "#ADD8E6" }, { name: "Cardinal Red", hex: "#C41E3A" }, { name: "Teal", hex: "#008080" } ];

const initialColorVariantState = {
  colorName: '',
  colorHex: '',
  podProductId: '',
  isDefaultDisplay: false,
  imageSet: [{ url: '', isPrimary: true }],
};
// --- END Product Manager Specific Constants ---


const InventoryPanel = () => {
  const { token } = useAuth();
  const toast = useToast();

  // --- State for Product Categories (Moved from original ProductCategoryManager.jsx) ---
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '', isActive: true });
  const { isOpen: isCategoryModalOpen, onOpen: onCategoryModalOpen, onClose: onCategoryModalClose } = useDisclosure();
  const { isOpen: isDeleteCategoryModalOpen, onOpen: onDeleteCategoryModalOpen, onClose: onDeleteCategoryModalClose } = useDisclosure();

  // --- State for Products (Moved from original ProductManager.jsx) ---
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorProducts, setErrorProducts] = useState('');
  const [isProductModalLoading, setIsProductModalLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [productFormData, setProductFormData] = useState({ name: '', description: '', category: '', basePrice: 0, tags: '', isActive: true, variants: [] });
  const [newColorData, setNewColorData] = useState({ colorName: '', colorHex: '', podProductId: '' });
  const { isOpen: isProductModalOpen, onOpen: onProductModalOpen, onClose: onProductModalClose } = useDisclosure();
  const { isOpen: isDeleteProductModalOpen, onOpen: onDeleteProductModalOpen, onClose: onDeleteProductModalClose } = useDisclosure();

  // --- Fetching Logic (Combined and Adjusted) ---

  // Fetch Categories for Category Management table
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    setErrorCategories('');
    try {
      const response = await client.get('/admin/product-categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(response.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setErrorCategories(err.response?.data?.message || 'Failed to fetch product categories.');
      toast({ title: "Error", description: err.response?.data?.message || 'Failed to fetch categories.', status: "error", duration: 5000, isClosable: true });
    } finally {
      setLoadingCategories(false);
    }
  }, [token, toast]);

  // Fetch Products for Product Management table
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true); setErrorProducts('');
    try {
      const { data } = await client.get('/admin/products', { headers: { Authorization: `Bearer ${token}` } });
      setProducts(data);
    } catch (err) {
      setErrorProducts(err.response?.data?.message || 'Failed to fetch products.');
    } finally {
      setLoadingProducts(false);
    }
  }, [token]);

  // Fetch Categories for Product Manager's category dropdown (renamed to avoid conflict with `categories` state)
  const fetchAllCategoriesForProductManager = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await client.get('/admin/product-categories', { headers: { Authorization: `Bearer ${token}` } });
      setCategories(data); // Using the same 'categories' state as the Category Manager, which is fine as they represent the same data
    } catch (e) {
      toast({ title: "Error", description: "Could not load categories for product form.", status: "error" });
    }
  }, [token, toast]);


  useEffect(() => {
    if (token) {
      fetchCategories(); // Initial fetch for category table
      fetchProducts(); // Initial fetch for product table
      fetchAllCategoriesForProductManager(); // Initial fetch for product manager dropdown
    }
  }, [token, fetchCategories, fetchProducts, fetchAllCategoriesForProductManager]);

  // --- Handlers for Product Categories (Moved from original ProductCategoryManager.jsx) ---
  const handleOpenCategoryModal = (category = null) => {
    if (category) {
      setIsEditingCategory(true);
      setSelectedCategory(category);
      setCategoryFormData({ name: category.name, description: category.description || '', isActive: category.isActive });
    } else {
      setIsEditingCategory(false);
      setSelectedCategory(null);
      setCategoryFormData({ name: '', description: '', isActive: true });
    }
    onCategoryModalOpen();
  };

  const handleCategoryFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCategoryFormData(prev => ({ ...prev, [name]: type === 'checkbox' || type === 'switch' ? checked : value }));
  };

  const handleCategorySubmit = async () => {
    if (!categoryFormData.name.trim()) {
      toast({ title: "Validation Error", description: "Category name is required.", status: "error", duration: 3000, isClosable: true });
      return;
    }

    const method = isEditingCategory ? 'put' : 'post';
    const url = isEditingCategory ? `/admin/product-categories/${selectedCategory._id}` : '/admin/product-categories';

    try {
      const response = await client[method](url, categoryFormData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        title: `Category ${isEditingCategory ? 'Updated' : 'Created'}`,
        description: `Category "${response.data.name}" has been successfully ${isEditingCategory ? 'updated' : 'created'}.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      fetchCategories(); // Re-fetch categories to update table
      fetchAllCategoriesForProductManager(); // Also update categories for product manager dropdown
      onCategoryModalClose();
    } catch (err) {
      console.error(`Error ${isEditingCategory ? 'updating' : 'creating'} category:`, err);
      toast({
        title: `Error ${isEditingCategory ? 'Updating' : 'Creating'} Category`,
        description: err.response?.data?.message || `Could not ${isEditingCategory ? 'update' : 'create'} category.`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleOpenDeleteCategoryDialog = (category) => {
    setSelectedCategory(category);
    onDeleteCategoryModalOpen();
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    try {
      await client.delete(`/admin/product-categories/${selectedCategory._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: "Category Deleted", description: `Category "${selectedCategory.name}" has been removed.`, status: "success", duration: 3000, isClosable: true });
      fetchCategories(); // Re-fetch categories
      fetchAllCategoriesForProductManager(); // Re-fetch for dropdown
      onDeleteCategoryModalClose();
    } catch (err) {
      console.error("Error deleting category:", err);
      toast({ title: "Delete Failed", description: err.response?.data?.message || "Could not delete category.", status: "error", duration: 5000, isClosable: true });
      onDeleteCategoryModalClose();
    }
  };

  // --- Handlers for Products (Moved from original ProductManager.jsx) ---
  const handleOpenProductModal = async (product = null) => {
    onProductModalOpen(); setIsProductModalLoading(true);
    try {
      // Use the 'categories' state directly from this component's state
      const activeCategories = categories.filter(c => c.isActive);
      setNewColorData({ colorName: '', colorHex: '', podProductId: '' });
      if (product) {
        const { data: fullProductData } = await client.get(`/admin/products/${product._id}`, { headers: { Authorization: `Bearer ${token}` }});
        setIsEditingProduct(true);
        setSelectedProduct(fullProductData);
        setProductFormData({
          name: fullProductData.name, description: fullProductData.description || '', category: fullProductData.category?._id || fullProductData.category || '',
          basePrice: fullProductData.basePrice || 0, tags: Array.isArray(fullProductData.tags) ? fullProductData.tags.join(', ') : '',
          isActive: fullProductData.isActive,
          variants: (fullProductData.variants || []).map(v => ({...v, imageSet: v.imageSet && v.imageSet.length > 0 ? v.imageSet : [{ url: '', isPrimary: true }], sizes: v.sizes || [] }))
        });
      } else {
        setIsEditingProduct(false); setSelectedProduct(null);
        setProductFormData({ name: '', description: '', category: activeCategories.length > 0 ? activeCategories[0]._id : '', basePrice: 0, tags: '', isActive: true, variants: [] });
      }
    } catch (err) { toast({ title: "Error", description: "Could not load data for the product form.", status: "error" }); onProductModalClose(); }
    finally { setIsProductModalLoading(false); }
  };

  const handleProductFormChange = (e) => { const { name, value, type, checked } = e.target; setProductFormData(prev => ({ ...prev, [name]: type === 'checkbox' || type === 'switch' ? checked : value })); };
  const handleBasePriceChange = (valStr, valNum) => { setProductFormData(prev => ({ ...prev, basePrice: valNum || 0 })); };
  const handleNewColorFormChange = (e) => { const { name, value } = e.target; if (name === "colorName") { const sel = CORE_COLORS.find(c => c.name === value); setNewColorData(prev => ({ ...prev, colorName: value, colorHex: sel ? sel.hex : '' })); } else { setNewColorData(prev => ({ ...prev, [name]: value })); } };

  const handleAddColorVariant = () => {
    if (!newColorData.colorName) { toast({ title: "Color Name Required", status: "warning" }); return; }
    if (productFormData.variants.some(v => v.colorName === newColorData.colorName)) { toast({ title: "Duplicate Color", status: "warning" }); return; }
    const newVariant = {
      ...initialColorVariantState, ...newColorData,
      sizes: SIZES.map(s => ({ size: s, sku: `${(productFormData.name || 'PROD').substring(0, 5).toUpperCase().replace(/\s+/g, '')}-${newColorData.colorName.toUpperCase().replace(/[\s/]+/g, '')}-${s}`, inStock: true, priceModifier: 0 }))
    };
    if (productFormData.variants.length === 0) { newVariant.isDefaultDisplay = true; }
    setProductFormData(prev => ({ ...prev, variants: [...prev.variants, newVariant] }));
    setNewColorData({ colorName: '', colorHex: '', podProductId: '' });
  };

  const handleRemoveColorVariant = (colorIndex) => { const newVariants = [...productFormData.variants]; newVariants.splice(colorIndex, 1); if (newVariants.length > 0 && !newVariants.some(v => v.isDefaultDisplay)) { newVariants[0].isDefaultDisplay = true; } setProductFormData(prev => ({ ...prev, variants: newVariants })); };
  const handleSizeDetailChange = (colorIdx, sizeIdx, field, value) => { const newV = [...productFormData.variants]; newV[colorIdx].sizes[sizeIdx][field] = value; setProductFormData(prev => ({ ...prev, variants: newV })); };
  const handleImageSetUrlChange = (colorIndex, imageIndex, url) => { const newVariants = [...productFormData.variants]; newVariants[colorIndex].imageSet[imageIndex].url = url; setProductFormData(prev => ({ ...prev, variants: newVariants })); };
  const addImageToSet = (colorIndex) => { const newVariants = [...productFormData.variants]; newVariants[colorIndex].imageSet.push({ url: '', isPrimary: false }); setProductFormData(prev => ({ ...prev, variants: newVariants })); };
  const removeImageFromSet = (colorIndex, imageIndex) => { const newVariants = [...productFormData.variants]; if(newVariants[colorIndex].imageSet.length > 1) { newVariants[colorIndex].imageSet.splice(imageIndex, 1); if (!newVariants[colorIndex].imageSet.some(img => img.isPrimary)) { newVariants[colorIndex].imageSet[0].isPrimary = true; } setProductFormData(prev => ({ ...prev, variants: newVariants })); } };
  const setPrimaryImage = (colorIndex, imageIndex) => { const newVariants = [...productFormData.variants]; newVariants[colorIndex].imageSet.forEach((img, idx) => { img.isPrimary = idx === imageIndex; }); setProductFormData(prev => ({ ...prev, variants: newVariants })); };
  const setDefaultVariant = (colorIndexToSet) => { const newVariants = productFormData.variants.map((v, index) => ({ ...v, isDefaultDisplay: index === colorIndexToSet })); setProductFormData(prev => ({ ...prev, variants: newVariants })); };

  const handleProductSubmit = async () => {
    if (!productFormData.name.trim() || !productFormData.category) { toast({ title: "Validation Error", description: "Product Name and Category are required.", status: "error" }); return; }
    for (const variant of productFormData.variants) { for (const image of variant.imageSet) { if (!image.url || image.url.trim() === '') { toast({ title: "Image URL Missing", description: `Please provide a URL for all images in the "${variant.colorName}" variant gallery.`, status: "error" }); return; } } }
    if (productFormData.variants.length > 0 && !productFormData.variants.some(v => v.isDefaultDisplay)) { productFormData.variants[0].isDefaultDisplay = true; }
    for (const variant of productFormData.variants) { if (variant.imageSet && !variant.imageSet.some(img => img.isPrimary)) { if(variant.imageSet.length > 0) variant.imageSet[0].isPrimary = true; } for (const size of variant.sizes) { if (size.inStock && !size.sku) { toast({ title: "Validation Error", description: `SKU missing for in-stock size ${size.size} in ${variant.colorName}.`, status: "error" }); return; } } }
    const method = isEditingProduct ? 'put' : 'post';
    const url = isEditingProduct ? `/admin/products/${selectedProduct._id}` : '/admin/products';
    const payload = { ...productFormData, tags: (productFormData.tags || '').split(',').map(tag => tag.trim()).filter(Boolean) };
    try { await client[method](url, payload, { headers: { Authorization: `Bearer ${token}` } }); toast({ title: `Product ${isEditingProduct ? 'Updated' : 'Created'}`, status: "success" }); fetchProducts(); onProductModalClose(); }
    catch (err) { toast({ title: `Error Saving Product`, description: err.response?.data?.message, status: "error" }); }
  };

  const handleOpenDeleteProductDialog = (product) => { setSelectedProduct(product); onDeleteProductModalOpen(); };
  const handleDeleteProduct = async () => { if (!selectedProduct) return; try { await client.delete(`/admin/products/${selectedProduct._id}`, { headers: { Authorization: `Bearer ${token}` } }); toast({ title: "Product Deleted", status: "success" }); fetchProducts(); onDeleteProductModalClose(); } catch (err) { toast({ title: "Delete Failed", description: err.response?.data?.message, status: "error" }); onDeleteProductModalClose(); } };


  return (
    <Box w="100%">
      {/* Heading is already textLight in AdminPage context, this is fine */}
      <Heading size="lg" mb={6} color="brand.textLight" textAlign={{ base: "center", md: "left" }}>
        Inventory & Product Management
      </Heading>

      {/* --- Product Categories Section --- */}
      <Box layerStyle="cardBlue" w="100%" p={{ base: 2, md: 4 }} mb={8}> {/* Added margin-bottom for spacing */}
        <HStack justifyContent="space-between" mb={6} w="100%">
          <Heading size="md">Manage Categories</Heading>
          <Button
            leftIcon={<Icon as={FaPlus} />}
            colorScheme="brandAccentOrange"
            onClick={() => handleOpenCategoryModal()}
            size="sm"
          >
            Add New Category
          </Button>
        </HStack>

        {loadingCategories ? (
          <VStack justifyContent="center" alignItems="center" minH="200px">
            <Spinner size="xl" /> {/* No color prop needed, inherits from parent Box */}
            <Text mt={2}>Loading Product Categories...</Text> {/* No color prop needed */}
          </VStack>
        ) : errorCategories ? (
          <Alert status="error" borderRadius="md"><AlertIcon />{errorCategories}</Alert>
        ) : categories.length === 0 ? (
          <Text>No product categories found. Click "Add New Category" to start.</Text>
        ) : (
          <TableContainer w="100%"> {/* Added w="100%" */}
            <Table variant="simple" size="sm" w="100%"> {/* Added w="100%" */}
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
                          colorScheme="brandAccentYellow" // Consistent color for edit actions
                          mr={2}
                          onClick={() => handleOpenCategoryModal(category)}
                          aria-label="Edit Category"
                        />
                      </Tooltip>
                      <Tooltip label="Delete Category" placement="top">
                        <ChakraIconButton
                          icon={<Icon as={FaTrashAlt} />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleOpenDeleteCategoryDialog(category)}
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
      </Box>

      {/* --- Product Management Section --- */}
      <Box layerStyle="cardBlue" w="100%" p={{ base: 2, md: 4 }}>
        <HStack justifyContent="space-between" mb={6} w="100%">
          <Heading size="md">Manage Products</Heading>
          <Button leftIcon={<Icon as={FaPlus} />} colorScheme="brandAccentOrange" onClick={() => handleOpenProductModal()}>Add New Product</Button>
        </HStack>
        {loadingProducts ? (
          <VStack justifyContent="center" alignItems="center" minH="200px">
            <Spinner size="xl" /> {/* No color prop needed */}
            <Text mt={2}>Loading Products...</Text> {/* No color prop needed */}
          </VStack>
        ) : errorProducts ? (
          <Alert status="error" borderRadius="md"><AlertIcon />{errorProducts}</Alert>
        ) : products.length === 0 ? (
            <Text>No products found. Click "Add New Product" to start.</Text> // Added missing text
        ) : (
          <TableContainer w="100%"> {/* Added w="100%" */}
            <Table variant="simple" size="sm" w="100%"> {/* Added w="100%" */}
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Category</Th>
                  <Th>Base Price</Th>
                  <Th>Variants</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {products.map((p) => (
                  <Tr key={p._id}>
                    <Td fontWeight="medium">{p.name}</Td>
                    {/* Categories array holds all category data, find by ID */}
                    <Td>{categories.find(cat => cat._id === p.category)?.name || 'N/A'}</Td>
                    <Td>${p.basePrice?.toFixed(2)}</Td>
                    <Td>{p.variantCount !== undefined ? p.variantCount : '-'}</Td>
                    <Td><Tag colorScheme={p.isActive ? 'green' : 'red'}>{p.isActive ? 'Active' : 'Inactive'}</Tag></Td>
                    <Td>
                      <Tooltip label="Edit"><ChakraIconButton icon={<Icon as={FaEdit}/>} size="xs" variant="ghost" colorScheme="brandAccentYellow" onClick={() => handleOpenProductModal(p)}/></Tooltip>
                      <Tooltip label="Delete"><ChakraIconButton icon={<Icon as={FaTrashAlt}/>} size="xs" variant="ghost" colorScheme="red" onClick={() => handleOpenDeleteProductDialog(p)}/></Tooltip>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* --- Category Modals (Moved from original ProductCategoryManager.jsx) --- */}
      <Modal isOpen={isCategoryModalOpen} onClose={onCategoryModalClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isEditingCategory ? 'Edit' : 'Add New'} Product Category</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Category Name</FormLabel>
                <Input
                  name="name"
                  value={categoryFormData.name}
                  onChange={handleCategoryFormChange}
                  placeholder="e.g., Men's Apparel, Accessories"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description (Optional)</FormLabel>
                <Input
                  name="description"
                  value={categoryFormData.description}
                  onChange={handleCategoryFormChange}
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
                  isChecked={categoryFormData.isActive}
                  onChange={handleCategoryFormChange}
                  colorScheme="green"
                  ml={3}
                />
                 <Text ml={2} fontSize="sm" color={categoryFormData.isActive ? "green.300" : "red.300"}>
                   ({categoryFormData.isActive ? "Visible" : "Hidden"})
                 </Text>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onCategoryModalClose} mr={3} variant="ghost">Cancel</Button>
            <Button
              colorScheme="brandAccentOrange"
              onClick={handleCategorySubmit}
            >
              {isEditingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {selectedCategory && (
        <Modal isOpen={isDeleteCategoryModalOpen} onClose={onDeleteCategoryModalClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Confirm Deletion</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Text>Are you sure you want to delete the category "<strong>{selectedCategory.name}</strong>"?</Text>
              <Text mt={2} color="red.500" fontWeight="bold">This action cannot be undone.</Text>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={onDeleteCategoryModalClose} mr={3}>Cancel</Button>
              <Button colorScheme="red" onClick={handleDeleteCategory}>Delete Category</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* --- Product Modals (Moved from original ProductManager.jsx) --- */}
      <Modal isOpen={isProductModalOpen} onClose={onProductModalClose} size="6xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isEditingProduct ? 'Edit' : 'Add New'} Product</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {isProductModalLoading ? <VStack justifyContent="center" minH="400px"><Spinner size="xl" /></VStack> : (
            <VStack spacing={6} align="stretch">
                <Box p={4} borderWidth="1px" borderRadius="md" borderColor="rgba(255,255,255,0.1)" bg="brand.secondary">
                    <Heading size="sm" mb={4}>Product Details</Heading>
                    <SimpleGrid columns={{base: 1, md: 2}} spacing={4}>
                        <FormControl isRequired><FormLabel>Name</FormLabel><Input name="name" value={productFormData.name} onChange={handleProductFormChange}/></FormControl>
                        <FormControl isRequired>
                            <FormLabel>Category</FormLabel>
                            <Select name="category" value={productFormData.category} onChange={handleProductFormChange} placeholder="Select category">
                                {categories.map(c => (<option key={c._id} value={c._id}>{c.name}</option>))}
                            </Select>
                        </FormControl>
                        <FormControl isRequired>
                            <FormLabel>Base Price ($)</FormLabel>
                            <NumberInput value={productFormData.basePrice} onChange={handleBasePriceChange} min={0} precision={2}>
                                <NumberInputField/>
                                <NumberInputStepper>
                                    <NumberIncrementStepper/>
                                    <NumberDecrementStepper/>
                                </NumberInputStepper>
                            </NumberInput>
                        </FormControl>
                        <FormControl>
                            <FormLabel>Tags (comma-separated)</FormLabel>
                            <Input name="tags" value={productFormData.tags} onChange={handleProductFormChange}/>
                        </FormControl>
                    </SimpleGrid>
                    <FormControl mt={4}><FormLabel>Description</FormLabel><Textarea name="description" value={productFormData.description} onChange={handleProductFormChange}/></FormControl>
                    <FormControl display="flex" alignItems="center" mt={4}><FormLabel mb="0">Active:</FormLabel><Switch name="isActive" isChecked={productFormData.isActive} onChange={handleProductFormChange}/></FormControl>
                </Box>

                <Box p={4} borderWidth="1px" borderRadius="md" borderColor="rgba(255,255,255,0.1)" bg="brand.secondary">
                    <Heading size="sm" mb={4}>Product Variants</Heading>
                    <RadioGroup onChange={(val) => setDefaultVariant(parseInt(val))} value={productFormData.variants.findIndex(v => v.isDefaultDisplay)?.toString() ?? "-1"}>
                      <VStack spacing={4} align="stretch">
                        {(productFormData.variants || []).map((variant, colorIndex) => (
                          (variant && variant.sizes) ?
                          <Accordion key={colorIndex} defaultIndex={[0]} allowToggle borderWidth="1px" borderRadius="md" bg="brand.primary">
                            <AccordionItem border="none">
                              <Flex align="center" p={2}>
                                <Radio value={colorIndex.toString()} mr={3} colorScheme="yellow"/><Tooltip label="Set as default display for shop page"><Icon as={FaStar} color={variant.isDefaultDisplay ? "brand.accentYellow" : "brand.textMuted"} mr={2}/></Tooltip>
                                <AccordionButton flex="1"><HStack w="full" spacing={4}><Box w="24px" h="24px" bg={variant.colorHex} borderRadius="full" border="1px solid" borderColor="brand.textMuted"/><Text fontWeight="bold" color="brand.textLight">{variant.colorName}</Text></HStack></AccordionButton><AccordionIcon /><CloseButton size="sm" onClick={() => handleRemoveColorVariant(colorIndex)} />
                              </Flex>
                              <AccordionPanel bg="brand.secondary" pb={4}>
                                <FormControl><FormLabel fontSize="sm">POD Product ID</FormLabel><Input size="sm" value={variant.podProductId || ''} onChange={(e) => { const newV = [...productFormData.variants]; newV[colorIndex].podProductId = e.target.value; setProductFormData(p => ({...p, variants: newV})); }} /></FormControl>
                                <Divider my={4} /><Heading size="xs" mb={3}>Image Gallery for {variant.colorName}</Heading>
                                <RadioGroup onChange={(idx) => setPrimaryImage(colorIndex, parseInt(idx))} value={variant.imageSet?.findIndex(img => img.isPrimary)?.toString() ?? "-1"}>
                                    <VStack align="stretch" spacing={2}>{variant.imageSet?.map((img, imgIndex) => (<HStack key={imgIndex}><Radio value={imgIndex.toString()} colorScheme="green"/><Input flex="1" size="sm" placeholder="https://image.url/shirt.png" value={img.url} onChange={(e) => handleImageSetUrlChange(colorIndex, imgIndex, e.target.value)} /><Image src={img.url} alt="Preview" boxSize="32px" objectFit="cover" borderRadius="sm" bg="whiteAlpha.200" fallback={<Icon as={FaImage} color="brand.textMuted" boxSize="32px" p={1}/>}/><ChakraIconButton size="sm" icon={<Icon as={FaTrashAlt}/>} onClick={() => removeImageFromSet(colorIndex, imgIndex)} isDisabled={variant.imageSet.length <= 1} /></HStack>))}</VStack>
                                </RadioGroup>
                                <Button size="sm" mt={3} onClick={() => addImageToSet(colorIndex)} leftIcon={<FaPlus/>}>Add Image</Button>
                                <Divider my={4} /><Heading size="xs" mb={3}>Available Sizes</Heading>
                                <Wrap spacing={4}>
                                  {variant.sizes?.map((size, sizeIndex) => (
                                    <WrapItem key={size.size}>
                                      <VStack p={2} borderWidth="1px" borderRadius="md" spacing={1} minW="180px" bg={size.inStock ? 'green.800' : 'red.800'}>
                                        <HStack justifyContent="space-between" w="100%">
                                          <Text fontWeight="bold">{size.size}</Text>
                                          <Switch size="sm" isChecked={size.inStock} onChange={e => handleSizeDetailChange(colorIndex, sizeIndex, 'inStock', e.target.checked)}/>
                                        </HStack>
                                        <FormControl isDisabled={!size.inStock}>
                                          <FormLabel fontSize="xs">SKU</FormLabel>
                                          <Input size="sm" value={size.sku} onChange={e => handleSizeDetailChange(colorIndex, sizeIndex, 'sku', e.target.value)} />
                                        </FormControl>
                                      </VStack>
                                    </WrapItem>
                                  ))}
                                </Wrap>
                              </AccordionPanel>
                            </AccordionItem>
                          </Accordion>
                          : null
                        ))}
                      </VStack>
                    </RadioGroup>
                    <Box p={4} borderWidth="1px" borderRadius="md" mt={6} borderColor="rgba(255,255,255,0.1)" bg="brand.secondary">
                        <Heading size="xs" mb={3}>Add New Color Variant</Heading>
                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                            <FormControl><FormLabel fontSize="sm">Color Name</FormLabel><Select size="sm" name="colorName" value={newColorData.colorName} onChange={handleNewColorFormChange} placeholder="Select...">{CORE_COLORS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</Select></FormControl>
                            <FormControl>
                                <FormLabel fontSize="sm">Color Hex</FormLabel>
                                <HStack>
                                    <Input size="sm" name="colorHex" value={newColorData.colorHex} onChange={handleNewColorFormChange}/>
                                    <Box w="24px" h="24px" bg={newColorData.colorHex} borderRadius="sm" border="1px solid" borderColor="brand.textMuted"/>
                                </HStack>
                            </FormControl>
                            <FormControl><FormLabel fontSize="sm">POD Product ID</FormLabel><Input size="sm" name="podProductId" value={newColorData.podProductId} onChange={handleNewColorFormChange}/></FormControl>
                        </SimpleGrid>
                        <Button mt={4} size="sm" colorScheme="teal" onClick={handleAddColorVariant} isDisabled={!newColorData.colorName}>Add This Color</Button>
                    </Box>
                </Box>
            </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onProductModalClose} mr={3}>Cancel</Button>
            <Button colorScheme="brandAccentOrange" onClick={handleProductSubmit} isLoading={isProductModalLoading}>Save Changes</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {selectedProduct && (
        <Modal isOpen={isDeleteProductModalOpen} onClose={onDeleteProductModalClose} isCentered>
          <ModalOverlay/>
          <ModalContent>
            <ModalHeader>Confirm Deletion</ModalHeader>
            <ModalCloseButton/>
            <ModalBody>Delete <strong>{selectedProduct.name}</strong>?</ModalBody>
            <ModalFooter>
              <Button onClick={onDeleteProductModalClose}>No</Button>
              <Button colorScheme="red" onClick={handleDeleteProduct}>Yes</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
};

export default InventoryPanel;
