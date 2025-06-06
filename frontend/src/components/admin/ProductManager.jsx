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

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "One Size", "6M", "12M", "18M", "24M"];

// --- CHANGED: CORE_COLORS is now an array of objects with name and hex code ---
const CORE_COLORS = [
  // Essentials
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Navy Blue", hex: "#000080" },
  { name: "Heather Grey", hex: "#B2BEB5" },
  // Retro & Vintage Palette
  { name: "Cream / Natural", hex: "#FFFDD0" },
  { name: "Mustard Yellow", hex: "#FFDB58" },
  { name: "Olive Green", hex: "#556B2F" },
  { name: "Maroon", hex: "#800000" },
  { name: "Burnt Orange", hex: "#CC5500" },
  { name: "Heather Forest", hex: "#228B22" },
  { name: "Royal Blue", hex: "#4169E1" },
  // Versatile Neutrals
  { name: "Charcoal", hex: "#36454F" },
  { name: "Sand", hex: "#C2B280" },
  { name: "Light Blue", hex: "#ADD8E6" },
  // Accent Colors
  { name: "Cardinal Red", hex: "#C41E3A" },
  { name: "Teal", hex: "#008080" },
];

const ProductManager = () => {
  const { token } = useAuth();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    productType: '',
    basePrice: 0,
    tags: '',
    isActive: true,
    variants: [],
  });
  const [currentVariant, setCurrentVariant] = useState(initialVariantState);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const fetchData = useCallback(async () => { /* ... existing code, no change needed ... */ }, [token, toast]);
  useEffect(() => { if (token) { fetchData(); } }, [fetchData, token]);

  const handleOpenModal = (product = null) => {
    setCurrentVariant(initialVariantState);
    if (product) {
      setIsEditing(true);
      setSelectedProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        productType: product.productType?._id || '',
        basePrice: product.basePrice || 0,
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
        isActive: product.isActive,
        variants: product.variants ? JSON.parse(JSON.stringify(product.variants)) : [],
      });
    } else {
      setIsEditing(false);
      setSelectedProduct(null);
      setFormData({
        name: '', description: '', productType: productTypes.length > 0 ? productTypes[0]._id : '',
        basePrice: 0, tags: '', isActive: true, variants: [],
      });
    }
    onOpen();
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' || type === 'switch' ? checked : value }));
  };
  
  const handleBasePriceChange = (valueAsString, valueAsNumber) => {
    setFormData(prev => ({ ...prev, basePrice: valueAsNumber || 0 }));
  };

  // --- CHANGED: handleVariantFormChange now auto-populates hex code ---
  const handleVariantFormChange = (e) => {
    const { name, value } = e.target;

    if (name === "colorName") {
      const selectedColorObject = CORE_COLORS.find(c => c.name === value);
      setCurrentVariant(prev => ({
        ...prev,
        colorName: value,
        colorHex: selectedColorObject ? selectedColorObject.hex : '', // Set hex if found, else clear
      }));
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
    const success = addVariantToList();
    if (success) {
      setCurrentVariant(initialVariantState);
    }
  };

  const handleAddAndRepeatVariant = () => {
    addVariantToList();
  };

  const handleRemoveVariant = (skuToRemove) => {
    setFormData(prev => ({ ...prev, variants: prev.variants.filter(v => v.sku !== skuToRemove) }));
  };

  const handleSubmit = async () => { /* ... existing code, no change needed ... */ };
  const handleOpenDeleteDialog = (product) => { /* ... existing code, no change needed ... */ };
  const handleDelete = async () => { /* ... existing code, no change needed ... */ };

  if (loading) { return <VStack justifyContent="center" alignItems="center" minH="200px"><Spinner size="xl" color="brand.primary" /><Text mt={2}>Loading Products...</Text></VStack>; }
  if (error && products.length === 0) { return <Alert status="error"><AlertIcon />{error}</Alert>; }

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
            {/* ... existing table code, no change needed ... */}
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
            <VStack spacing={6} align="stretch">
              {/* Main Product Details Box */}
              <Box p={4} borderWidth="1px" borderRadius="md" bg="brand.paper" shadow="sm">
                 {/* ... existing main product form code, no change needed ... */}
              </Box>

              {/* Variant Management Section */}
              <Box p={4} borderWidth="1px" borderRadius="md" bg="brand.paper" shadow="sm">
                <Heading size="sm" mb={4} color="brand.textDark">Product Variants</Heading>
                <Box p={3} borderWidth="1px" borderRadius="md" mb={4} borderColor="gray.300">
                    <Heading size="xs" mb={3} color="brand.textSlightlyDark">Add New Variant</Heading>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                        <FormControl isRequired><FormLabel fontSize="sm">Color Name</FormLabel>
                          {/* --- CHANGED: This dropdown now uses the object array --- */}
                          <Select size="sm" name="colorName" value={currentVariant.colorName} onChange={handleVariantFormChange} placeholder="Select color" bg="white">
                            {CORE_COLORS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                          </Select>
                        </FormControl>

                        {/* --- NOTE: This input is now auto-populated but can be manually overridden --- */}
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
                        {/* ... other variant inputs, no changes needed ... */}
                    </SimpleGrid>
                    {/* ... add variant buttons, no changes needed ... */}
                </Box>
                <Divider my={4} />
                {/* ... Current variants list, no changes needed ... */}
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            {/* ... modal footer buttons, no changes needed ... */}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Product Confirmation Modal */}
      {selectedProduct && (
        <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered>
           {/* ... existing delete modal code, no change needed ... */}
        </Modal>
      )}
    </Box>
  );
};

export default ProductManager;
