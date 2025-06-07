// frontend/src/components/admin/ProductManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Heading, Button, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Spinner, Alert, AlertIcon, VStack, Text, useToast, IconButton as ChakraIconButton,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  useDisclosure, FormControl, FormLabel, Input, Select, Switch, HStack, Tooltip, Icon,
  Tag, SimpleGrid, Textarea, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Divider, CloseButton as ChakraCloseButton,
  Image, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Checkbox, Wrap, WrapItem
} from '@chakra-ui/react';
import { FaPlus, FaEdit, FaTrashAlt, FaToggleOn, FaToggleOff, FaBox, FaImage } from 'react-icons/fa';
import { client } from '../../api/client';
import { useAuth } from '../../context/AuthProvider';


// CHANGED: Sizes larger than XXL have been removed.
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "One Size", "6M", "12M", "18M", "24M"];

const CORE_COLORS = [
  { name: "Black", hex: "#000000" }, { name: "White", hex: "#FFFFFF" }, { name: "Navy Blue", hex: "#000080" },
  { name: "Heather Grey", hex: "#B2BEB5" }, { name: "Cream / Natural", hex: "#FFFDD0" }, { name: "Mustard Yellow", hex: "#FFDB58" },
  { name: "Olive Green", hex: "#556B2F" }, { name: "Maroon", hex: "#800000" }, { name: "Burnt Orange", hex: "#CC5500" },
  { name: "Heather Forest", hex: "#228B22" }, { name: "Royal Blue", hex: "#4169E1" }, { name: "Charcoal", hex: "#36454F" },
  { name: "Sand", hex: "#C2B280" }, { name: "Light Blue", hex: "#ADD8E6" }, { name: "Cardinal Red", hex: "#C41E3A" },
  { name: "Teal", hex: "#008080" },
];

const initialColorVariantState = {
  colorName: '',
  colorHex: '',
  imageMockupFront: '',
  imageMockupBack: '',
  podProductId: '',
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

  const [formData, setFormData] = useState({
    name: '', description: '', productType: '', basePrice: 0, tags: '', isActive: true, variants: [],
  });

  const [newColorVariant, setNewColorVariant] = useState(initialColorVariantState);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await client.get('/admin/products', { headers: { Authorization: `Bearer ${token}` } });
      setProducts(response.data);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to fetch products.';
      setError(errMsg);
      toast({ title: "Error", description: errMsg, status: "error" });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (token) {
      fetchProducts();
    }
  }, [fetchProducts, token]);
  
  useEffect(() => {
    const fetchTypes = async () => {
        if (!token) return;
        try {
            const typesResponse = await client.get('/admin/product-types', { headers: { Authorization: `Bearer ${token}` } });
            setProductTypes(typesResponse.data);
        } catch (err) {
            console.error("Could not pre-fetch product types", err);
        }
    };
    fetchTypes();
  }, [token]);


  const handleOpenModal = async (product = null) => {
    onOpen();
    setIsModalLoading(true);
    
    try {
      const typesResponse = await client.get('/admin/product-types', { headers: { Authorization: `Bearer ${token}` } });
      const activeTypes = typesResponse.data.filter(pt => pt.isActive);
      // We set product types on the main state, but also use the active list here
      setProductTypes(typesResponse.data.filter(pt => pt.isActive));

      setNewColorVariant(initialColorVariantState);
      if (product) {
        setIsEditing(true);
        setSelectedProduct(product);
        setFormData({
          name: product.name,
          description: product.description || '',
          productType: product.productType?._id || product.productType || '',
          basePrice: product.basePrice || 0,
          tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
          isActive: product.isActive,
          variants: product.variants ? JSON.parse(JSON.stringify(product.variants)) : [],
        });
      } else {
        setIsEditing(false);
        setSelectedProduct(null);
        setFormData({
          name: '', description: '', productType: activeTypes.length > 0 ? activeTypes[0]._id : '',
          basePrice: 0, tags: '', isActive: true, variants: [],
        });
      }
    } catch (err) {
      toast({ title: "Error", description: "Could not load data for the form.", status: "error" });
      onClose();
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' || type === 'switch' ? checked : value }));
  };
  
  const handleBasePriceChange = (valueAsString, valueAsNumber) => {
    setFormData(prev => ({ ...prev, basePrice: valueAsNumber || 0 }));
  };

  const handleNewColorFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "colorName") {
      const selectedColorObject = CORE_COLORS.find(c => c.name === value);
      setNewColorVariant(prev => ({ ...prev, colorName: value, colorHex: selectedColorObject ? selectedColorObject.hex : '' }));
    } else {
      setNewColorVariant(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddColorVariant = () => {
    if (!newColorVariant.colorName || !newColorVariant.imageMockupFront) {
      toast({ title: "Color Incomplete", description: "Color Name and Front Mockup URL are required.", status: "warning" });
      return;
    }
    if (formData.variants.some(v => v.colorName === newColorVariant.colorName)) {
      toast({ title: "Duplicate Color", description: "This color already exists for this product.", status: "warning" });
      return;
    }

    const newVariantGroup = {
      ...newColorVariant,
      sizes: SIZES.map(s => ({
        size: s,
        // CHANGED: Auto-generate a suggested SKU. Handles spaces and slashes in color names.
        sku: `${formData.name.substring(0, 5).toUpperCase().replace(/\s+/g, '')}-${newColorVariant.colorName.toUpperCase().replace(/[\s/]+/g, '')}-${s}`,
        // CHANGED: Default to IN stock
        inStock: true, 
        priceModifier: 0,
        podVariantId: '',
      }))
    };

    setFormData(prev => ({ ...prev, variants: [...prev.variants, newVariantGroup] }));
    setNewColorVariant(initialColorVariantState);
  };
  
  const handleRemoveColorVariant = (colorNameToRemove) => {
    setFormData(prev => ({
        ...prev,
        variants: prev.variants.filter(v => v.colorName !== colorNameToRemove)
    }));
  };

  const handleSizeDetailChange = (colorIndex, sizeIndex, field, value) => {
    // Create a deep copy to avoid direct state mutation
    const newVariants = JSON.parse(JSON.stringify(formData.variants));
    newVariants[colorIndex].sizes[sizeIndex][field] = value;
    setFormData(prev => ({ ...prev, variants: newVariants }));
  };


  const handleSubmit = async () => {
    if (!formData.name.trim()) { toast({ title: "Validation Error", description: "Product name is required.", status: "error" }); return; }
    if (!formData.productType) { toast({ title: "Validation Error", description: "Product type is required.", status: "error" }); return; }
    if (formData.variants.length === 0) { toast({ title: "Validation Error", description: "At least one product color variant is required.", status: "error" }); return; }

    for (const variant of formData.variants) {
      for (const size of variant.sizes) {
        if (size.inStock && !size.sku) {
          toast({
            title: "Validation Error",
            description: `The size "${size.size}" for color "${variant.colorName}" is in stock but has no SKU.`,
            status: "error",
            duration: 7000,
          });
          return;
        }
      }
    }

    const method = isEditing ? 'put' : 'post';
    const url = isEditing ? `/admin/products/${selectedProduct._id}` : '/admin/products';
    
    const payload = { ...formData, tags: (formData.tags || '').split(',').map(tag => tag.trim()).filter(Boolean) };
    
    const cleanedPayload = {
      ...payload,
      variants: payload.variants.map(colorVariant => ({
        ...colorVariant,
        sizes: colorVariant.sizes.filter(size => size.inStock || size.sku)
      }))
    };

    try {
      await client[method](url, cleanedPayload, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: `Product ${isEditing ? 'Updated' : 'Created'}`, status: "success" });
      fetchProducts();
      onClose();
    } catch (err) {
      console.error(`Error ${isEditing ? 'saving' : 'creating'} product:`, err);
      toast({ title: `Error ${isEditing ? 'Saving' : 'Creating'} Product`, description: err.response?.data?.message || `Could not save product.`, status: "error" });
    }
  };

  const handleOpenDeleteDialog = (product) => { setSelectedProduct(product); onDeleteOpen(); };
  const handleDelete = async () => {
    if (!selectedProduct) return;
    try {
      await client.delete(`/admin/products/${selectedProduct._id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "Product Deleted", status: "success" });
      fetchProducts();
      onDeleteClose();
    } catch (err) {
      toast({ title: "Delete Failed", description: err.response?.data?.message || "Could not delete.", status: "error" });
      onDeleteClose();
    }
   };
  
  if (loading) { return <VStack justifyContent="center" alignItems="center" minH="200px"><Spinner size="xl" /><Text>Loading Products...</Text></VStack>; }
  if (error) { return <Alert status="error"><AlertIcon />{error}</Alert>; }

  return (
    <Box p={{ base: 2, md: 4 }} borderWidth="1px" borderRadius="md" shadow="sm" bg="white">
      <HStack justifyContent="space-between" mb={6}>
        <Heading size="md" color="brand.textDark">Manage Products</Heading>
        <Button leftIcon={<Icon as={FaPlus} />} bg="brand.primary" color="white" _hover={{ bg: "brand.primaryDark" }} onClick={() => handleOpenModal()} size="sm">
          Add New Product
        </Button>
      </HStack>

      <TableContainer>
        <Table variant="simple" size="sm">
            <Thead><Tr><Th>Name</Th><Th>Type</Th><Th>Base Price</Th><Th>Colors</Th><Th>Status</Th><Th>Actions</Th></Tr></Thead>
            <Tbody>
              {products.map((p) => (
                <Tr key={p._id}>
                  <Td fontWeight="medium">{p.name}</Td>
                  <Td>{productTypes.find(pt => pt._id === p.productType)?.name || 'N/A'}</Td>
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

      <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent bg="brand.paperMaxContrast">
          <ModalHeader color="brand.textDark">{isEditing ? 'Edit' : 'Add New'} Product</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {isModalLoading ? (
              <VStack justifyContent="center" alignItems="center" minH="400px"><Spinner size="xl" /><Text>Loading Form Data...</Text></VStack>
            ) : (
            <VStack spacing={6} align="stretch">
                <Box p={4} borderWidth="1px" borderRadius="md" bg="brand.paper" shadow="sm">
                    <Heading size="sm" mb={4} color="brand.textDark">Product Details</Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <FormControl isRequired><FormLabel>Name</FormLabel><Input name="name" value={formData.name} onChange={handleFormChange} bg="white"/></FormControl>
                        <FormControl isRequired><FormLabel>Product Type</FormLabel>
                          <Select name="productType" value={formData.productType} onChange={handleFormChange} placeholder="Select type" bg="white" isDisabled={productTypes.length === 0}>
                            {productTypes.map(pt => (<option key={pt._id} value={pt._id}>{pt.name}</option>))}
                          </Select>
                        </FormControl>
                        <FormControl isRequired><FormLabel>Base Price ($)</FormLabel>
                          <NumberInput name="basePrice" value={formData.basePrice} onChange={handleBasePriceChange} min={0} precision={2} step={0.01} bg="white">
                              <NumberInputField /><NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                          </NumberInput>
                        </FormControl>
                        <FormControl><FormLabel>Tags (comma-separated)</FormLabel><Input name="tags" value={formData.tags} onChange={handleFormChange} placeholder="e.g. retro, vintage" bg="white"/></FormControl>
                    </SimpleGrid>
                    <FormControl mt={4}><FormLabel>Description</FormLabel><Textarea name="description" value={formData.description} onChange={handleFormChange} bg="white"/></FormControl>
                    <FormControl display="flex" alignItems="center" mt={4}><FormLabel htmlFor="isActive-product" mb="0">Active:</FormLabel>
                      <Switch id="isActive-product" name="isActive" isChecked={formData.isActive} onChange={handleFormChange} colorScheme="green" ml={3}/>
                    </FormControl>
                </Box>
                
                <Box p={4} borderWidth="1px" borderRadius="md" bg="brand.paper" shadow="sm">
                    <Heading size="sm" mb={4} color="brand.textDark">Product Variants</Heading>
                    
                    <Box p={4} borderWidth="1px" borderRadius="md" mb={6} borderColor="gray.300">
                        <Heading size="xs" mb={3} color="brand.textSlightlyDark">Add New Color Variant</Heading>
                        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                             <FormControl isRequired><FormLabel fontSize="sm">Color Name</FormLabel>
                                <Select size="sm" name="colorName" value={newColorVariant.colorName} onChange={handleNewColorFormChange} placeholder="Select color" bg="white">
                                {CORE_COLORS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </Select>
                            </FormControl>
                            <FormControl><FormLabel fontSize="sm">Color Hex</FormLabel>
                                <HStack>
                                    <Input size="sm" name="colorHex" value={newColorVariant.colorHex} onChange={handleNewColorFormChange} placeholder="#FFFFFF" bg="white" />
                                    <Box w="32px" h="32px" bg={newColorVariant.colorHex || 'transparent'} borderRadius="sm" border="1px solid" borderColor="gray.200" />
                                </HStack>
                            </FormControl>
                            <FormControl><FormLabel fontSize="sm">POD Product ID</FormLabel><Input size="sm" name="podProductId" value={newColorVariant.podProductId} onChange={handleNewColorFormChange} placeholder="e.g. from Printify" bg="white" /></FormControl>
                            <FormControl isRequired gridColumn={{ base: 1, lg: "1 / span 2" }}><FormLabel fontSize="sm">Mockup Front URL</FormLabel><Input size="sm" name="imageMockupFront" value={newColorVariant.imageMockupFront} onChange={handleNewColorFormChange} bg="white"/></FormControl>
                            <FormControl gridColumn={{ base: 1, lg: "1 / span 2" }}><FormLabel fontSize="sm">Mockup Back URL</FormLabel><Input size="sm" name="imageMockupBack" value={newColorVariant.imageMockupBack} onChange={handleNewColorFormChange} bg="white"/></FormControl>
                        </SimpleGrid>
                        <Button mt={4} size="sm" colorScheme="teal" onClick={handleAddColorVariant} leftIcon={<Icon as={FaPlus}/>} isDisabled={!newColorVariant.colorName}>Add Color</Button>
                    </Box>

                    <Divider my={6} />
                    
                    <Heading size="xs" mb={3} color="brand.textSlightlyDark">Manage Colors & Sizes ({formData.variants.length})</Heading>
                    {formData.variants.length === 0 ? <Text fontSize="sm">No color variants added yet.</Text> : (
                        <Accordion allowMultiple defaultIndex={[0]}>
                            {formData.variants.map((variant, colorIndex) => (
                                <AccordionItem key={variant.colorName} bg="gray.50" borderRadius="md" mb={3}>
                                    <h2>
                                        <AccordionButton>
                                            <HStack flex="1" textAlign="left" spacing={4}>
                                                <Image src={variant.imageMockupFront} fallback={<Icon as={FaImage} color="gray.400" />} boxSize="40px" objectFit="cover" borderRadius="md" bg="gray.200" />
                                                <Box w="24px" h="24px" bg={variant.colorHex} borderRadius="full" border="1px solid" borderColor="gray.300" />
                                                <Text fontWeight="bold">{variant.colorName}</Text>
                                                <Tag size="sm" colorScheme="blue">{variant.sizes.filter(s => s.inStock).length} of {variant.sizes.length} Sizes In Stock</Tag>
                                            </HStack>
                                            <AccordionIcon />
                                        </AccordionButton>
                                    </h2>
                                    <AccordionPanel pb={4} bg="white">
                                        <HStack justifyContent="space-between" mb={4}>
                                            <Text fontSize="sm" color="gray.600">POD Product ID: {variant.podProductId || 'N/A'}</Text>
                                            <ChakraCloseButton size="sm" colorScheme="red" onClick={() => handleRemoveColorVariant(variant.colorName)} />
                                        </HStack>
                                        
                                        <Wrap spacing={4} justify="start">
                                            {variant.sizes.map((size, sizeIndex) => (
                                                <WrapItem key={size.size}>
                                                     <VStack p={3} borderWidth="1px" borderRadius="md" spacing={2} align="stretch" minW="200px" bg={size.inStock ? 'green.50' : 'red.50'}>
                                                        <HStack justifyContent="space-between">
                                                            <Text fontWeight="bold" fontSize="md">{size.size}</Text>
                                                            <Switch isChecked={size.inStock} onChange={(e) => handleSizeDetailChange(colorIndex, sizeIndex, 'inStock', e.target.checked)} />
                                                        </HStack>
                                                        <FormControl isDisabled={!size.inStock}>
                                                            <FormLabel fontSize="xs">SKU</FormLabel>
                                                            <Input 
                                                                size="xs" 
                                                                placeholder="Enter SKU"
                                                                value={size.sku}
                                                                onChange={(e) => handleSizeDetailChange(colorIndex, sizeIndex, 'sku', e.target.value)}
                                                                bg="white"
                                                            />
                                                        </FormControl>
                                                        <FormControl isDisabled={!size.inStock}>
                                                            <FormLabel fontSize="xs">Price Mod ($)</FormLabel>
                                                            <NumberInput 
                                                                size="xs" 
                                                                value={size.priceModifier} 
                                                                onChange={(valStr, valNum) => handleSizeDetailChange(colorIndex, sizeIndex, 'priceModifier', valNum)} 
                                                                precision={2} 
                                                                step={0.01}
                                                                bg="white"
                                                            >
                                                                <NumberInputField />
                                                            </NumberInput>
                                                        </FormControl>
                                                    </VStack>
                                                </WrapItem>
                                            ))}
                                        </Wrap>
                                    </AccordionPanel>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </Box>
            </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose} mr={3} variant="ghost">Cancel</Button>
            <Button bg="brand.primary" color="white" _hover={{ bg: "brand.primaryDark" }} onClick={handleSubmit} isLoading={isModalLoading}>
              {isEditing ? 'Save Changes' : 'Create Product'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
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
