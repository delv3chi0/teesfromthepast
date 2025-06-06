delv3chio@delv3chio-laptop:~/Desktop/tees$ cat frontend/src/components/admin/ProductManager.jsx 
// frontend/src/components/admin/ProductManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Heading, Button, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Spinner, Alert, AlertIcon, VStack, Text, useToast, IconButton as ChakraIconButton,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  useDisclosure, FormControl, FormLabel, Input, Select, Switch, HStack, Tooltip, Icon,
  Tag, SimpleGrid, Textarea, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Divider, CloseButton as ChakraCloseButton,
  Image,
} from '@chakra-ui/react';
import { FaPlus, FaEdit, FaTrashAlt, FaToggleOn, FaToggleOff, FaBox, FaSyncAlt } from 'react-icons/fa';
import { client } from '../../api/client';
import { useAuth } from '../../context/AuthProvider';

const initialVariantState = {
  colorName: '', colorHex: '', size: '', sku: '', stock: 0, priceModifier: 0,
  imageMockupFront: '', imageMockupBack: '', podService: '', podProductId: '', podVariantId: '',
};

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "One Size", "6M", "12M", "18M", "24M"];

const CORE_COLORS = [
  { name: "Black", hex: "#000000" }, { name: "White", hex: "#FFFFFF" }, { name: "Navy Blue", hex: "#000080" },
  { name: "Heather Grey", hex: "#B2BEB5" }, { name: "Cream / Natural", hex: "#FFFDD0" }, { name: "Mustard Yellow", hex: "#FFDB58" },
  { name: "Olive Green", hex: "#556B2F" }, { name: "Maroon", hex: "#800000" }, { name: "Burnt Orange", hex: "#CC5500" },
  { name: "Heather Forest", hex: "#228B22" }, { name: "Royal Blue", hex: "#4169E1" }, { name: "Charcoal", hex: "#36454F" },
  { name: "Sand", hex: "#C2B280" }, { name: "Light Blue", hex: "#ADD8E6" }, { name: "Cardinal Red", hex: "#C41E3A" },
  { name: "Teal", hex: "#008080" },
];

const ProductManager = () => {
  const { token } = useAuth();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalLoading, setIsModalLoading] = useState(false); // Spinner for modal data

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '', description: '', productType: '', basePrice: 0, tags: '', isActive: true, variants: [],
  });
  const [currentVariant, setCurrentVariant] = useState(initialVariantState);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  // --- CHANGED: This now ONLY fetches products ---
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    console.log("[ProductManager] Starting to fetch products...");
    try {
      const response = await client.get('/admin/products', { headers: { Authorization: `Bearer ${token}` } });
      console.log(`[ProductManager] Products fetched successfully with ${response.data.length} items.`);
      setProducts(response.data);
    } catch (err) {
      console.error("Error fetching products:", err);
      const errMsg = err.response?.data?.message || 'Failed to fetch products.';
      setError(errMsg);
      toast({ title: "Error", description: errMsg, status: "error", duration: 7000 });
    } finally {
      console.log("[ProductManager] Fetch products complete. Setting loading to false.");
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (token) {
      fetchProducts();
    }
  }, [fetchProducts, token]);

  // --- CHANGED: Logic to open modal now fetches product types on demand ---
  const handleOpenModal = async (product = null) => {
    setIsModalLoading(true); // Show spinner in modal
    onOpen(); // Open modal immediately

    // Fetch the latest product types every time the modal is opened
    try {
      const typesResponse = await client.get('/admin/product-types', { headers: { Authorization: `Bearer ${token}` } });
      const activeTypes = typesResponse.data.filter(pt => pt.isActive);
      setProductTypes(activeTypes);

      // Now set up the form data
      setCurrentVariant(initialVariantState);
      if (product) {
        setIsEditing(true);
        setSelectedProduct(product);
        setFormData({
          name: product.name,
          description: product.description || '',
          productType: product.productType?._id || product.productType || '', // Handle populated vs non-populated
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
      onClose(); // Close the modal if data fetching fails
    } finally {
      setIsModalLoading(false); // Hide spinner in modal
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' || type === 'switch' ? checked : value }));
  };
  
  const handleBasePriceChange = (valueAsString, valueAsNumber) => {
    setFormData(prev => ({ ...prev, basePrice: valueAsNumber || 0 }));
  };

  const handleVariantFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "colorName") {
      const selectedColorObject = CORE_COLORS.find(c => c.name === value);
      setCurrentVariant(prev => ({ ...prev, colorName: value, colorHex: selectedColorObject ? selectedColorObject.hex : '' }));
    } else {
      setCurrentVariant(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleVariantNumberChange = (name, valueAsString, valueAsNumber) => {
     setCurrentVariant(prev => ({ ...prev, [name]: valueAsNumber || 0 }));
  };
  
  const addVariantToList = () => {
    if (!currentVariant.sku || !currentVariant.colorName || !currentVariant.size || !currentVariant.imageMockupFront) {
      toast({ title: "Variant Incomplete", description: "SKU, Color, Size, and Front Mockup URL are required.", status: "warning", duration: 4000 });
      return false;
    }
    if (formData.variants.find(v => v.sku === currentVariant.sku)) {
      toast({ title: "Duplicate SKU", description: "This SKU already exists in the list for this product.", status: "warning", duration: 4000 });
      return false;
    }
    setFormData(prev => ({ ...prev, variants: [...prev.variants, { ...currentVariant }] }));
    return true;
  };

  const handleAddVariant = () => {
    if (addVariantToList()) {
      setCurrentVariant(initialVariantState);
    }
  };
  const handleAddAndRepeatVariant = () => { addVariantToList(); };
  const handleRemoveVariant = (skuToRemove) => {
    setFormData(prev => ({ ...prev, variants: prev.variants.filter(v => v.sku !== skuToRemove) }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) { toast({ title: "Validation Error", description: "Product name is required.", status: "error" }); return; }
    if (!formData.productType) { toast({ title: "Validation Error", description: "Product type is required.", status: "error" }); return; }
    if (formData.variants.length === 0) { toast({ title: "Validation Error", description: "At least one product variant is required.", status: "error" }); return; }

    const method = isEditing ? 'put' : 'post';
    const url = isEditing ? `/admin/products/${selectedProduct._id}` : '/admin/products';
    
    const payload = { ...formData, tags: (formData.tags || '').split(',').map(tag => tag.trim()).filter(tag => tag) };

    try {
      const response = await client[method](url, payload, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: `Product ${isEditing ? 'Updated' : 'Created'}`, description: `Product "${response.data.name}" saved successfully.`, status: "success" });
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
      toast({ title: "Product Deleted", description: `Product "${selectedProduct.name}" removed.`, status: "success" });
      fetchProducts();
      onDeleteClose();
    } catch (err) {
      console.error("Error deleting product:", err);
      toast({ title: "Delete Failed", description: err.response?.data?.message || "Could not delete product.", status: "error" });
      onDeleteClose();
    }
  };

  // Main component render
  if (loading) { return <VStack justifyContent="center" alignItems="center" minH="200px"><Spinner size="xl" color="brand.primary" /><Text mt={2}>Loading Products...</Text></VStack>; }
  if (error) { return <Alert status="error"><AlertIcon />{error}</Alert>; }

  return (
    <Box p={{ base: 2, md: 4 }} borderWidth="1px" borderRadius="md" shadow="sm" bg="white">
      <HStack justifyContent="space-between" mb={6}>
        <Heading size="md" color="brand.textDark">Manage Products</Heading>
        <Button leftIcon={<Icon as={FaPlus} />} bg="brand.primary" color="white" _hover={{ bg: "brand.primaryDark" }} onClick={() => handleOpenModal()} size="sm">
          Add New Product
        </Button>
      </HStack>

      {products.length === 0 ? (
        <Text>No products found. Click "Add New Product" to start.</Text>
      ) : (
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>Name</Th><Th>Type</Th><Th>Base Price</Th><Th>Variants</Th><Th>Status</Th><Th>Actions</Th></Tr></Thead>
            <Tbody>
              {products.map((p) => (
                <Tr key={p._id}>
                  <Td fontWeight="medium">{p.name}</Td>
                  {/* Since we simplified the query, p.productType is now just an ID. We find the name from our state. */}
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
      )}

      {/* Add/Edit Product Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent bg="brand.paperMaxContrast">
          <ModalHeader color="brand.textDark">{isEditing ? 'Edit' : 'Add New'} Product</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6} >
            {isModalLoading ? (
              <VStack justifyContent="center" alignItems="center" minH="400px">
                <Spinner size="xl" />
                <Text>Loading Form Data...</Text>
              </VStack>
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
                <Box p={3} borderWidth="1px" borderRadius="md" mb={4} borderColor="gray.300">
                    <Heading size="xs" mb={3} color="brand.textSlightlyDark">Add New Variant</Heading>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                        <FormControl isRequired><FormLabel fontSize="sm">Color Name</FormLabel>
                          <Select size="sm" name="colorName" value={currentVariant.colorName} onChange={handleVariantFormChange} placeholder="Select color" bg="white">
                            {CORE_COLORS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                          </Select>
                        </FormControl>
                        <FormControl><FormLabel fontSize="sm">Color Hex</FormLabel>
                            <HStack>
                                <Input size="sm" name="colorHex" value={currentVariant.colorHex} onChange={handleVariantFormChange} placeholder="e.g. #FFFFFF" bg="white"/>
                                <Box w="32px" h="32px" bg={currentVariant.colorHex || 'transparent'} borderRadius="sm" border="1px solid" borderColor="gray.200" />
                            </HStack>
                        </FormControl>
                        <FormControl isRequired><FormLabel fontSize="sm">Size</FormLabel>
                          <Select size="sm" name="size" value={currentVariant.size} onChange={handleVariantFormChange} placeholder="Select size" bg="white">
                            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                          </Select>
                        </FormControl>
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
                        <FormControl isRequired><FormLabel fontSize="sm">Mockup Front URL</FormLabel>
                            <HStack><Input size="sm" name="imageMockupFront" value={currentVariant.imageMockupFront} onChange={handleVariantFormChange} bg="white"/>
                                {currentVariant.imageMockupFront && <Image src={currentVariant.imageMockupFront} boxSize="32px" objectFit="cover" borderRadius="sm" bg="gray.200" />}
                            </HStack>
                        </FormControl>
                        <FormControl><FormLabel fontSize="sm">Mockup Back URL</FormLabel>
                             <HStack><Input size="sm" name="imageMockupBack" value={currentVariant.imageMockupBack} onChange={handleVariantFormChange} bg="white"/>
                                {currentVariant.imageMockupBack && <Image src={currentVariant.imageMockupBack} boxSize="32px" objectFit="cover" borderRadius="sm" bg="gray.200" />}
                            </HStack>
                        </FormControl>
                        <FormControl><FormLabel fontSize="sm">POD Service</FormLabel><Input size="sm" name="podService" value={currentVariant.podService} onChange={handleVariantFormChange} placeholder="e.g., Printify" bg="white"/></FormControl>
                        <FormControl><FormLabel fontSize="sm">POD Product ID</FormLabel><Input size="sm" name="podProductId" value={currentVariant.podProductId} onChange={handleVariantFormChange} bg="white"/></FormControl>
                        <FormControl><FormLabel fontSize="sm">POD Variant ID</FormLabel><Input size="sm" name="podVariantId" value={currentVariant.podVariantId} onChange={handleVariantFormChange} bg="white"/></FormControl>
                    </SimpleGrid>
                    <HStack spacing={4} mt={4}>
                        <Button size="sm" colorScheme="teal" onClick={handleAddVariant}>Add Variant & Clear</Button>
                        <Button size="sm" colorScheme="blue" leftIcon={<Icon as={FaSyncAlt}/>} onClick={handleAddAndRepeatVariant}>Add Variant & Repeat</Button>
                    </HStack>
                </Box>
                <Divider my={4} />
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
