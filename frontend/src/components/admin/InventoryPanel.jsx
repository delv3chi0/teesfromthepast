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
import { FaPlus, FaEdit, FaTrashAlt, FaImage, FaStar } from 'react-icons/fa';
import { client } from '../../api/client';
import { useAuth } from '../../context/AuthProvider';

// --- Product Manager Specific Constants ---
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "One Size", "6M", "12M", "18M", "24M"];
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

  // --- REMOVED: All category-specific state variables (categories, loadingCategories, etc.) ---

  // --- State for Products ---
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorProducts, setErrorProducts] = useState('');
  const [isProductModalLoading, setIsProductModalLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  // MODIFIED: Removed 'category' from initial product form state
  const [productFormData, setProductFormData] = useState({ name: '', description: '', basePrice: 0, tags: '', isActive: true, variants: [] });
  const [newColorData, setNewColorData] = useState({ colorName: '', colorHex: '', podProductId: '' });
  const { isOpen: isProductModalOpen, onOpen: onProductModalOpen, onClose: onProductModalClose } = useDisclosure();
  const { isOpen: isDeleteProductModalOpen, onOpen: onDeleteProductModalOpen, onClose: onDeleteProductModalClose } = useDisclosure();

  // --- Fetching Logic ---

  // Removed fetchCategories and fetchAllCategoriesForProductManager

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

  useEffect(() => {
    if (token) {
      fetchProducts(); // Initial fetch for product table
    }
  }, [token, fetchProducts]);

  // --- Removed all Category-specific handlers ---

  // --- Handlers for Products ---
  const handleOpenProductModal = async (product = null) => {
    onProductModalOpen(); setIsProductModalLoading(true);
    try {
      setNewColorData({ colorName: '', colorHex: '', podProductId: '' });
      if (product) {
        const { data: fullProductData } = await client.get(`/admin/products/${product._id}`, { headers: { Authorization: `Bearer ${token}` }});
        setIsEditingProduct(true);
        setSelectedProduct(fullProductData);
        setProductFormData({
          name: fullProductData.name,
          description: fullProductData.description || '',
          // Removed 'category' from productFormData initialization
          basePrice: fullProductData.basePrice || 0,
          tags: Array.isArray(fullProductData.tags) ? fullProductData.tags.join(', ') : '',
          isActive: fullProductData.isActive,
          variants: (fullProductData.variants || []).map(v => ({...v, imageSet: v.imageSet && v.imageSet.length > 0 ? v.imageSet : [{ url: '', isPrimary: true }], sizes: v.sizes || [] }))
        });
      } else {
        setIsEditingProduct(false); setSelectedProduct(null);
        // MODIFIED: Removed 'category' from new product form state
        setProductFormData({ name: '', description: '', basePrice: 0, tags: '', isActive: true, variants: [] });
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
    // MODIFIED: Removed 'category' check from validation
    if (!productFormData.name.trim()) { toast({ title: "Validation Error", description: "Product Name is required.", status: "error" }); return; }
    for (const variant of productFormData.variants) { for (const image of variant.imageSet) { if (!image.url || image.url.trim() === '') { toast({ title: "Image URL Missing", description: `Please provide a URL for all images in the "${variant.colorName}" variant gallery.`, status: "error" }); return; } } }
    if (productFormData.variants.length > 0 && !productFormData.variants.some(v => v.isDefaultDisplay)) { productFormData.variants[0].isDefaultDisplay = true; }
    for (const variant of productFormData.variants) { if (variant.imageSet && !variant.imageSet.some(img => img.isPrimary)) { if(variant.imageSet.length > 0) variant.imageSet[0].isPrimary = true; } for (const size of variant.sizes) { if (size.inStock && !size.sku) { toast({ title: "Validation Error", description: `SKU missing for in-stock size ${size.size} in ${variant.colorName}.`, status: "error" }); return; } } }
    const method = isEditingProduct ? 'put' : 'post';
    const url = isEditingProduct ? `/admin/products/${selectedProduct._id}` : '/admin/products';
    // MODIFIED: Removed 'category' from payload if not needed by backend, or set to null/empty string
    // Assuming backend can handle 'category' being omitted or null if it's not a mandatory field now.
    // If backend requires it, you'd need to provide a default value here.
    const payload = { ...productFormData, tags: (productFormData.tags || '').split(',').map(tag => tag.trim()).filter(Boolean) };
    try { await client[method](url, payload, { headers: { Authorization: `Bearer ${token}` } }); toast({ title: `Product ${isEditingProduct ? 'Updated' : 'Created'}`, status: "success" }); fetchProducts(); onProductModalClose(); }
    catch (err) { toast({ title: `Error Saving Product`, description: err.response?.data?.message, status: "error" }); }
  };

  const handleOpenDeleteProductDialog = (product) => { setSelectedProduct(product); onDeleteProductModalOpen(); };
  const handleDeleteProduct = async () => { if (!selectedProduct) return; try { await client.delete(`/admin/products/${selectedProduct._id}`, { headers: { Authorization: `Bearer ${token}` } }); toast({ title: "Product Deleted", status: "success" }); fetchProducts(); onDeleteProductModalClose(); } catch (err) { toast({ title: "Delete Failed", description: err.response?.data?.message, status: "error" }); onDeleteProductModalClose(); } };


  return (
    <Box w="100%">
      <Heading size="lg" mb={6} color="brand.textLight" textAlign={{ base: "center", md: "left" }}>
        Inventory Management
      </Heading>

      {/* --- Product Management Section --- */}
      <Box layerStyle="cardBlue" w="100%" p={{ base: 2, md: 4 }}>
        <HStack justifyContent="space-between" mb={6} w="100%">
          <Heading size="md">Manage Products</Heading>
          <Button leftIcon={<Icon as={FaPlus} />} colorScheme="brandAccentOrange" onClick={() => handleOpenProductModal()}>Add New Product</Button>
        </HStack>
        {loadingProducts ? (
          <VStack justifyContent="center" alignItems="center" minH="200px">
            <Spinner size="xl" />
            <Text mt={2}>Loading Products...</Text>
          </VStack>
        ) : errorProducts ? (
          <Alert status="error" borderRadius="md"><AlertIcon />{errorProducts}</Alert>
        ) : products.length === 0 ? (
            <Text>No products found. Click "Add New Product" to start.</Text>
        ) : (
          <TableContainer w="100%">
            <Table variant="simple" size="sm" w="100%">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  {/* REMOVED: Category Column Header */}
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
                    {/* REMOVED: Category Data Cell */}
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

      {/* --- Product Modals --- */}
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
                        {/* REMOVED: Category FormControl */}
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
                            <Input name="tags" value={productFormData.tags} onChange={handleProductFormChange}/></FormControl>
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
