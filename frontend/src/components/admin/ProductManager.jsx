// frontend/src/components/admin/ProductManager.jsx
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
import { FaPlus, FaEdit, FaTrashAlt, FaToggleOn, FaToggleOff, FaImage, FaExclamationTriangle, FaStar } from 'react-icons/fa';
import { client } from '../../api/client';
import { useAuth } from '../../context/AuthProvider';

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "One Size", "6M", "12M", "18M", "24M"];
const CORE_COLORS = [ { name: "Black", hex: "#000000" }, { name: "White", hex: "#FFFFFF" }, { name: "Navy Blue", hex: "#000080" }, { name: "Heather Grey", hex: "#B2BEB5" }, { name: "Cream / Natural", hex: "#FFFDD0" }, { name: "Mustard Yellow", hex: "#FFDB58" }, { name: "Olive Green", hex: "#556B2F" }, { name: "Maroon", hex: "#800000" }, { name: "Burnt Orange", hex: "#CC5500" }, { name: "Heather Forest", hex: "#228B22" }, { name: "Royal Blue", hex: "#4169E1" }, { name: "Charcoal", hex: "#36454F" }, { name: "Sand", hex: "#C2B280" }, { name: "Light Blue", hex: "#ADD8E6" }, { name: "Cardinal Red", hex: "#C41E3A" }, { name: "Teal", hex: "#008080" } ];

const initialColorVariantState = {
  colorName: '',
  colorHex: '',
  podProductId: '',
  isDefaultDisplay: false,
  imageSet: [{ url: '', isPrimary: true }],
};

const ProductManager = () => {
  const { token } = useAuth();
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', productType: '', basePrice: 0, tags: '', isActive: true, variants: [] });
  const [newColorData, setNewColorData] = useState({ colorName: '', colorHex: '', podProductId: '' });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const fetchProducts = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await client.get('/admin/products', { headers: { Authorization: `Bearer ${token}` } });
      setProducts(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchProductTypes = useCallback(async () => {
    if (!token) return [];
    try {
      const { data } = await client.get('/admin/product-types', { headers: { Authorization: `Bearer ${token}` } });
      setProductTypes(data);
    } catch (e) {
      toast({ title: "Error", description: "Could not load product types.", status: "error" });
    }
  }, [token, toast]);

  useEffect(() => { if (token) { fetchProducts(); fetchProductTypes(); } }, [token, fetchProducts, fetchProductTypes]);

  const handleOpenModal = async (product = null) => {
    onOpen(); setIsModalLoading(true);
    try {
      const activeTypes = productTypes.filter(pt => pt.isActive);
      setNewColorData({ colorName: '', colorHex: '', podProductId: '' });
      if (product) {
        const { data: fullProductData } = await client.get(`/admin/products/${product._id}`, { headers: { Authorization: `Bearer ${token}` }});
        setIsEditing(true);
        setSelectedProduct(fullProductData);
        setFormData({
          name: fullProductData.name, description: fullProductData.description || '', productType: fullProductData.productType?._id || fullProductData.productType || '',
          basePrice: fullProductData.basePrice || 0, tags: Array.isArray(fullProductData.tags) ? fullProductData.tags.join(', ') : '',
          isActive: fullProductData.isActive,
          variants: (fullProductData.variants || []).map(v => ({...v, imageSet: v.imageSet && v.imageSet.length > 0 ? v.imageSet : [{ url: '', isPrimary: true }], sizes: v.sizes || [] }))
        });
      } else {
        setIsEditing(false); setSelectedProduct(null);
        setFormData({ name: '', description: '', productType: activeTypes.length > 0 ? activeTypes[0]._id : '', basePrice: 0, tags: '', isActive: true, variants: [] });
      }
    } catch (err) { toast({ title: "Error", description: "Could not load data for the form.", status: "error" }); onClose(); } 
    finally { setIsModalLoading(false); }
  };

  const handleFormChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' || type === 'switch' ? checked : value })); };
  const handleBasePriceChange = (valStr, valNum) => { setFormData(prev => ({ ...prev, basePrice: valNum || 0 })); };
  const handleNewColorFormChange = (e) => { const { name, value } = e.target; if (name === "colorName") { const sel = CORE_COLORS.find(c => c.name === value); setNewColorData(prev => ({ ...prev, colorName: value, colorHex: sel ? sel.hex : '' })); } else { setNewColorData(prev => ({ ...prev, [name]: value })); } };
  
  const handleAddColorVariant = () => {
    if (!newColorData.colorName) { toast({ title: "Color Name Required", status: "warning" }); return; }
    if (formData.variants.some(v => v.colorName === newColorData.colorName)) { toast({ title: "Duplicate Color", status: "warning" }); return; }
    const newVariant = {
      ...initialColorVariantState, ...newColorData,
      sizes: SIZES.map(s => ({ size: s, sku: `${(formData.name || 'PROD').substring(0, 5).toUpperCase().replace(/\s+/g, '')}-${newColorData.colorName.toUpperCase().replace(/[\s/]+/g, '')}-${s}`, inStock: true, priceModifier: 0 }))
    };
    if (formData.variants.length === 0) { newVariant.isDefaultDisplay = true; }
    setFormData(prev => ({ ...prev, variants: [...prev.variants, newVariant] }));
    setNewColorData({ colorName: '', colorHex: '', podProductId: '' });
  };
  
  const handleRemoveColorVariant = (colorIndex) => { const newVariants = [...formData.variants]; newVariants.splice(colorIndex, 1); if (newVariants.length > 0 && !newVariants.some(v => v.isDefaultDisplay)) { newVariants[0].isDefaultDisplay = true; } setFormData(prev => ({ ...prev, variants: newVariants })); };
  const handleSizeDetailChange = (colorIdx, sizeIdx, field, value) => { const newV = [...formData.variants]; newV[colorIdx].sizes[sizeIdx][field] = value; setFormData(prev => ({ ...prev, variants: newV })); };
  const handleImageSetUrlChange = (colorIndex, imageIndex, url) => { const newVariants = [...formData.variants]; newVariants[colorIndex].imageSet[imageIndex].url = url; setFormData(prev => ({ ...prev, variants: newVariants })); };
  const addImageToSet = (colorIndex) => { const newVariants = [...formData.variants]; newVariants[colorIndex].imageSet.push({ url: '', isPrimary: false }); setFormData(prev => ({ ...prev, variants: newVariants })); };
  const removeImageFromSet = (colorIndex, imageIndex) => { const newVariants = [...formData.variants]; if(newVariants[colorIndex].imageSet.length > 1) { newVariants[colorIndex].imageSet.splice(imageIndex, 1); if (!newVariants[colorIndex].imageSet.some(img => img.isPrimary)) { newVariants[colorIndex].imageSet[0].isPrimary = true; } setFormData(prev => ({ ...prev, variants: newVariants })); } };
  const setPrimaryImage = (colorIndex, imageIndex) => { const newVariants = [...formData.variants]; newVariants[colorIndex].imageSet.forEach((img, idx) => { img.isPrimary = idx === imageIndex; }); setFormData(prev => ({ ...prev, variants: newVariants })); };
  const setDefaultVariant = (colorIndexToSet) => { const newVariants = formData.variants.map((v, index) => ({ ...v, isDefaultDisplay: index === colorIndexToSet })); setFormData(prev => ({ ...prev, variants: newVariants })); };
  
  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.productType) { toast({ title: "Validation Error", description: "Product Name and Type are required.", status: "error" }); return; }
    for (const variant of formData.variants) { for (const image of variant.imageSet) { if (!image.url || image.url.trim() === '') { toast({ title: "Image URL Missing", description: `Please provide a URL for all images in the "${variant.colorName}" variant gallery.`, status: "error" }); return; } } }
    if (formData.variants.length > 0 && !formData.variants.some(v => v.isDefaultDisplay)) { formData.variants[0].isDefaultDisplay = true; }
    for (const variant of formData.variants) { if (variant.imageSet && !variant.imageSet.some(img => img.isPrimary)) { if(variant.imageSet.length > 0) variant.imageSet[0].isPrimary = true; } for (const size of variant.sizes) { if (size.inStock && !size.sku) { toast({ title: "Validation Error", description: `SKU missing for in-stock size ${size.size} in ${variant.colorName}.`, status: "error" }); return; } } }
    const method = isEditing ? 'put' : 'post';
    const url = isEditing ? `/admin/products/${selectedProduct._id}` : '/admin/products';
    const payload = { ...formData, tags: (formData.tags || '').split(',').map(tag => tag.trim()).filter(Boolean) };
    try { await client[method](url, payload, { headers: { Authorization: `Bearer ${token}` } }); toast({ title: `Product ${isEditing ? 'Updated' : 'Created'}`, status: "success" }); fetchProducts(); onClose(); } 
    catch (err) { toast({ title: `Error Saving Product`, description: err.response?.data?.message, status: "error" }); }
  };
  
  const handleOpenDeleteDialog = (product) => { setSelectedProduct(product); onDeleteOpen(); };
  const handleDelete = async () => { if (!selectedProduct) return; try { await client.delete(`/admin/products/${selectedProduct._id}`, { headers: { Authorization: `Bearer ${token}` } }); toast({ title: "Product Deleted", status: "success" }); fetchProducts(); onDeleteClose(); } catch (err) { toast({ title: "Delete Failed", description: err.response?.data?.message, status: "error" }); onDeleteClose(); } };

  if (loading) return <VStack justifyContent="center" minH="200px"><Spinner size="xl" /></VStack>;
  if (error) return <Alert status="error"><AlertIcon />{error}</Alert>;

  return (
    <Box p={{ base: 2, md: 4 }}>
      <HStack justifyContent="space-between" mb={6}><Heading size="md">Manage Products</Heading><Button leftIcon={<Icon as={FaPlus} />} colorScheme="brandPrimary" onClick={() => handleOpenModal()}>Add New Product</Button></HStack>
      <TableContainer>
        <Table variant="simple" size="sm">
          <Thead><Tr><Th>Name</Th><Th>Type</Th><Th>Base Price</Th><Th>Variants</Th><Th>Status</Th><Th>Actions</Th></Tr></Thead>
          <Tbody>{products.map((p) => (<Tr key={p._id}><Td fontWeight="medium">{p.name}</Td><Td>{productTypes.find(pt => pt._id === p.productType)?.name || 'N/A'}</Td><Td>${p.basePrice?.toFixed(2)}</Td><Td>{p.variantCount !== undefined ? p.variantCount : '-'}</Td><Td><Tag colorScheme={p.isActive ? 'green' : 'red'}>{p.isActive ? 'Active' : 'Inactive'}</Tag></Td><Td><Tooltip label="Edit"><ChakraIconButton icon={<Icon as={FaEdit}/>} size="xs" variant="ghost" onClick={() => handleOpenModal(p)}/></Tooltip><Tooltip label="Delete"><ChakraIconButton icon={<Icon as={FaTrashAlt}/>} size="xs" variant="ghost" colorScheme="red" onClick={() => handleOpenDeleteDialog(p)}/></Tooltip></Td></Tr>))}</Tbody>
        </Table>
      </TableContainer>
      
      <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
        <ModalOverlay /><ModalContent><ModalHeader>{isEditing ? 'Edit' : 'Add New'} Product</ModalHeader><ModalCloseButton />
          <ModalBody pb={6}>
            {isModalLoading ? <VStack justifyContent="center" minH="400px"><Spinner size="xl" /></VStack> : (
            <VStack spacing={6} align="stretch">
                <Box p={4} borderWidth="1px" borderRadius="md"><Heading size="sm" mb={4}>Product Details</Heading><SimpleGrid columns={{base: 1, md: 2}} spacing={4}><FormControl isRequired><FormLabel>Name</FormLabel><Input name="name" value={formData.name} onChange={handleFormChange}/></FormControl><FormControl isRequired><FormLabel>Product Type</FormLabel><Select name="productType" value={formData.productType} onChange={handleFormChange} placeholder="Select type">{productTypes.map(pt => (<option key={pt._id} value={pt._id}>{pt.name}</option>))}</Select></FormControl><FormControl isRequired><FormLabel>Base Price ($)</FormLabel><NumberInput value={formData.basePrice} onChange={handleBasePriceChange} min={0} precision={2}><NumberInputField/><NumberInputStepper><NumberIncrementStepper/><NumberDecrementStepper/></NumberInputStepper></NumberInput></FormControl><FormControl><FormLabel>Tags (comma-separated)</FormLabel><Input name="tags" value={formData.tags} onChange={handleFormChange}/></FormControl></SimpleGrid><FormControl mt={4}><FormLabel>Description</FormLabel><Textarea name="description" value={formData.description} onChange={handleFormChange}/></FormControl><FormControl display="flex" alignItems="center" mt={4}><FormLabel mb="0">Active:</FormLabel><Switch name="isActive" isChecked={formData.isActive} onChange={handleFormChange}/></FormControl></Box>
                <Box p={4} borderWidth="1px" borderRadius="md">
                    <Heading size="sm" mb={4}>Product Variants</Heading>
                    <RadioGroup onChange={(val) => setDefaultVariant(parseInt(val))} value={formData.variants.findIndex(v => v.isDefaultDisplay)?.toString() ?? "-1"}>
                      <VStack spacing={4} align="stretch">
                        {(formData.variants || []).map((variant, colorIndex) => (
                          (variant && variant.sizes) ? 
                          <Accordion key={colorIndex} defaultIndex={[0]} allowToggle borderWidth="1px" borderRadius="md" bg="gray.50">
                            <AccordionItem border="none">
                              <Flex align="center" p={2}>
                                <Radio value={colorIndex.toString()} mr={3} colorScheme="yellow"/><Tooltip label="Set as default display for shop page"><Icon as={FaStar} color={variant.isDefaultDisplay ? "yellow.400" : "gray.300"} mr={2}/></Tooltip>
                                <AccordionButton flex="1"><HStack w="full" spacing={4}><Box w="24px" h="24px" bg={variant.colorHex} borderRadius="full" border="1px solid" borderColor="gray.300"/><Text fontWeight="bold">{variant.colorName}</Text></HStack></AccordionButton><AccordionIcon /><CloseButton size="sm" onClick={() => handleRemoveColorVariant(colorIndex)} />
                              </Flex>
                              <AccordionPanel bg="white" pb={4}>
                                <FormControl><FormLabel fontSize="sm">POD Product ID</FormLabel><Input size="sm" value={variant.podProductId || ''} onChange={(e) => { const newV = [...formData.variants]; newV[colorIndex].podProductId = e.target.value; setFormData(p => ({...p, variants: newV})); }} /></FormControl>
                                <Divider my={4} /><Heading size="xs" mb={3}>Image Gallery for {variant.colorName}</Heading>
                                <RadioGroup onChange={(idx) => setPrimaryImage(colorIndex, parseInt(idx))} value={variant.imageSet?.findIndex(img => img.isPrimary)?.toString() ?? "-1"}>
                                    <VStack align="stretch" spacing={2}>{variant.imageSet?.map((img, imgIndex) => (<HStack key={imgIndex}><Radio value={imgIndex.toString()} colorScheme="green"/><Input flex="1" size="sm" placeholder="https://image.url/shirt.png" value={img.url} onChange={(e) => handleImageSetUrlChange(colorIndex, imgIndex, e.target.value)} /><Image src={img.url} alt="Preview" boxSize="32px" objectFit="cover" borderRadius="sm" bg="gray.100" fallback={<Icon as={FaImage} color="gray.300" boxSize="32px" p={1}/>}/><ChakraIconButton size="sm" icon={<Icon as={FaTrashAlt}/>} onClick={() => removeImageFromSet(colorIndex, imgIndex)} isDisabled={variant.imageSet.length <= 1} /></HStack>))}</VStack>
                                </RadioGroup>
                                <Button size="sm" mt={3} onClick={() => addImageToSet(colorIndex)} leftIcon={<FaPlus/>}>Add Image</Button>
                                <Divider my={4} /><Heading size="xs" mb={3}>Available Sizes</Heading>
                                <Wrap spacing={4}>{variant.sizes?.map((size, sizeIndex) => (<WrapItem key={size.size}><VStack p={2} borderWidth="1px" borderRadius="md" spacing={1} minW="180px" bg={size.inStock ? 'green.50' : 'red.50'}><HStack justifyContent="space-between" w="100%"><Text fontWeight="bold">{size.size}</Text><Switch size="sm" isChecked={size.inStock} onChange={e => handleSizeDetailChange(colorIndex, sizeIndex, 'inStock', e.target.checked)}/></HStack><FormControl isDisabled={!size.inStock}><FormLabel fontSize="xs">SKU</FormLabel><Input size="sm" value={size.sku} onChange={e => handleSizeDetailChange(colorIndex, sizeIndex, 'sku', e.target.value)}/></FormControl></VStack></WrapItem>))}</Wrap>
                              </AccordionPanel>
                            </AccordionItem>
                          </Accordion>
                          : <Alert status="warning"><AlertIcon/>Corrupted variant data. Please remove and re-add this color.</Alert>
                        ))}
                      </VStack>
                    </RadioGroup>
                    <Box p={4} borderWidth="1px" borderRadius="md" mt={6} bg="gray.50"><Heading size="xs" mb={3}>Add New Color Variant</Heading><SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}><FormControl><FormLabel fontSize="sm">Color Name</FormLabel><Select size="sm" name="colorName" value={newColorData.colorName} onChange={handleNewColorFormChange} placeholder="Select...">{CORE_COLORS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</Select></FormControl><FormControl><FormLabel fontSize="sm">Color Hex</FormLabel><HStack><Input size="sm" name="colorHex" value={newColorData.colorHex} onChange={handleNewColorFormChange}/><Box w="24px" h="24px" bg={newColorData.colorHex} borderRadius="sm" border="1px solid" borderColor="gray.300"/></HStack></FormControl><FormControl><FormLabel fontSize="sm">POD Product ID</FormLabel><Input size="sm" name="podProductId" value={newColorData.podProductId} onChange={handleNewColorFormChange}/></FormControl></SimpleGrid><Button mt={4} size="sm" colorScheme="teal" onClick={handleAddColorVariant} isDisabled={!newColorData.colorName}>Add This Color</Button></Box>
                </Box>
            </VStack>
            )}
          </ModalBody>
          <ModalFooter><Button onClick={onClose} mr={3}>Cancel</Button><Button colorScheme="brandPrimary" onClick={handleSubmit} isLoading={isModalLoading}>Save Changes</Button></ModalFooter>
        </ModalContent>
      </Modal>
      {selectedProduct && (<Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered><ModalOverlay/><ModalContent><ModalHeader>Confirm Deletion</ModalHeader><ModalCloseButton/><ModalBody>Delete <strong>{selectedProduct.name}</strong>?</ModalBody><ModalFooter><Button onClick={onDeleteClose}>No</Button><Button colorScheme="red" onClick={handleDelete}>Yes</Button></ModalFooter></ModalContent></Modal>)}
    </Box>
  );
};

export default ProductManager;
