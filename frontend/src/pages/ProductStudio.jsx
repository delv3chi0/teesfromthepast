// frontend/src/pages/ProductStudio.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Heading, Text, VStack, Select,
  SimpleGrid, Image, Spinner, Alert, AlertIcon, CloseButton as ChakraCloseButton,
  Link as ChakraLink, Divider, useToast, Icon, Button
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart, FaImage } from 'react-icons/fa';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const INFO_ALERT_DISMISSED_KEY = 'productStudioInfoAlertDismissed_v1';

export default function ProductStudio() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [designsError, setDesignsError] = useState('');
  const [selectedDesign, setSelectedDesign] = useState(null);

  const [availableProductTypes, setAvailableProductTypes] = useState([]);
  const [loadingProductTypes, setLoadingProductTypes] = useState(true);
  const [productsOfType, setProductsOfType] = useState([]);
  const [loadingProductsOfType, setLoadingProductsOfType] = useState(false);

  const [selectedProductTypeId, setSelectedProductTypeId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [availableColors, setAvailableColors] = useState([]);
  const [selectedProductColor, setSelectedProductColor] = useState('');
  const [availableSizes, setAvailableSizes] = useState([]);
  const [selectedProductSize, setSelectedProductSize] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(null);

  const [showInfoAlert, setShowInfoAlert] = useState(false);
  const canvasEl = useRef(null);
  const fabricCanvas = useRef(null);

  useEffect(() => {
    const dismissed = localStorage.getItem(INFO_ALERT_DISMISSED_KEY);
    if (dismissed !== 'true') {
      setShowInfoAlert(true);
    }
  }, []);

  const fetchUserDesigns = useCallback(() => {
    if (!user) { setLoadingDesigns(false); setDesigns([]); setDesignsError(''); return; }
    setLoadingDesigns(true); setDesignsError(''); setDesigns([]);
    client.get('/mydesigns')
      .then(response => { setDesigns(response.data); })
      .catch(err => {
        setDesignsError('Could not load your saved designs.');
        if (err.response?.status === 401) { toast({ title: "Session Expired", status: "warning" }); logout(); navigate('/login'); }
      })
      .finally(() => setLoadingDesigns(false));
  }, [user, toast, logout, navigate]);

  useEffect(() => { fetchUserDesigns(); }, [fetchUserDesigns]);
  useEffect(() => {
    setLoadingProductTypes(true);
    client.get('/storefront/product-types').then(res => setAvailableProductTypes(res.data || [])).catch(err => toast({ title: "Load Error", status: "error" })).finally(() => setLoadingProductTypes(false));
  }, [toast]);

  useEffect(() => {
    if (!selectedProductTypeId) { setProductsOfType([]); setSelectedProductId(''); return; }
    setLoadingProductsOfType(true); setProductsOfType([]); setSelectedProductId('');
    client.get(`/storefront/products/type/${selectedProductTypeId}`).then(res => setProductsOfType(res.data || [])).catch(err => toast({ title: "Load Error", status: "error" })).finally(() => setLoadingProductsOfType(false));
  }, [selectedProductTypeId, toast]);

  useEffect(() => {
    if (!selectedProductId || productsOfType.length === 0) { setAvailableColors([]); setSelectedProductColor(''); return; }
    const currentProduct = productsOfType.find(p => p._id === selectedProductId);
    if (currentProduct?.variants) {
      const uniqueColors = currentProduct.variants.reduce((acc, v) => { if (!acc.find(c => c.value === v.colorName)) { acc.push({ value: v.colorName, label: v.colorName, hex: v.colorHex }); } return acc; }, []);
      setAvailableColors(uniqueColors);
      if (uniqueColors.length === 0) setSelectedProductColor('');
    } else {
      setAvailableColors([]); setSelectedProductColor('');
    }
  }, [selectedProductId, productsOfType]);

  useEffect(() => {
    if (!selectedProductColor) { setAvailableSizes([]); setSelectedProductSize(''); return; }
    const currentProduct = productsOfType.find(p => p._id === selectedProductId);
    let sizes = [];
    if (currentProduct?.variants?.length > 0) {
      const colorVariant = currentProduct.variants.find(v => v.colorName === selectedProductColor);
      if (colorVariant?.sizes) {
        sizes = colorVariant.sizes.map(s => s.size);
      }
    }
    setAvailableSizes(sizes.map(s => ({ value: s, label: s })));
    if (!sizes.includes(selectedProductSize)) setSelectedProductSize('');
  }, [selectedProductColor, selectedProductId, productsOfType, selectedProductSize]);

  useEffect(() => {
    if (selectedProductId && selectedProductColor && selectedProductSize) {
      const product = productsOfType.find(p => p._id === selectedProductId);
      const colorVariant = product?.variants.find(v => v.colorName === selectedProductColor);
      if (colorVariant) {
        const sizeVariant = colorVariant.sizes.find(s => s.size === selectedProductSize);
        if (sizeVariant) {
          // Find the primary image from the imageSet, or fall back to the first image.
          const primaryImage = colorVariant.imageSet?.find(img => img.isPrimary) || colorVariant.imageSet?.[0];
          setSelectedVariant({ ...sizeVariant, colorName: colorVariant.colorName, colorHex: colorVariant.colorHex, imageMockupFront: primaryImage?.url });
        } else { setSelectedVariant(null); }
      } else { setSelectedVariant(null); }
    } else {
      setSelectedVariant(null);
    }
  }, [selectedProductId, selectedProductColor, selectedProductSize, productsOfType]);

  useEffect(() => {
    const setupCanvas = (fabricInstance) => {
      if (!fabricCanvas.current && canvasEl.current) {
        fabricCanvas.current = new fabricInstance.Canvas(canvasEl.current, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      }
      const FCanvas = fabricCanvas.current;
      if (!FCanvas) return;
      FCanvas.clear();
      
      // === THE FIX IS HERE: It now uses the `imageMockupFront` property we created in the variant selection logic ===
      const mockupSrc = selectedVariant?.imageMockupFront;

      if (mockupSrc) {
        fabricInstance.Image.fromURL(mockupSrc, (mockupImg) => {
          if (!mockupImg || mockupImg.width === 0) { FCanvas.setBackgroundColor('lightgrey', FCanvas.renderAll.bind(FCanvas)); return; }
          FCanvas.setBackgroundImage(mockupImg, FCanvas.renderAll.bind(FCanvas), { scaleX: CANVAS_WIDTH / mockupImg.width, scaleY: CANVAS_HEIGHT / mockupImg.height });
        }, { crossOrigin: 'anonymous' });
      } else {
        FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
        FCanvas.setBackgroundColor('white', FCanvas.renderAll.bind(FCanvas));
      }

      if (selectedDesign?.imageDataUrl) {
        fabricInstance.Image.fromURL(selectedDesign.imageDataUrl, (designImg) => {
          if (!designImg) return;
          designImg.scaleToWidth(CANVAS_WIDTH * 0.33);
          FCanvas.add(designImg);
          designImg.center();
          FCanvas.renderAll();
        }, { crossOrigin: 'anonymous' });
      }
    };
    const pollForFabric = () => { if (window.fabric) { setupCanvas(window.fabric); } else { setTimeout(pollForFabric, 100); } };
    if (canvasEl.current) pollForFabric();
  }, [selectedDesign, selectedVariant]);

  const handleProceedToCheckout = () => {
    if (!selectedDesign) { toast({ title: "Please select a design.", status: "warning" }); return; }
    if (!selectedVariant) { toast({ title: "Please select all product options.", status: "warning" }); return; }
    const checkoutItem = { designId: selectedDesign._id, productId: selectedProductId, variantSku: selectedVariant.sku, /* ...other details */ };
    localStorage.setItem('itemToCheckout', JSON.stringify(checkoutItem));
    navigate('/checkout');
  };

  const handleDismissInfoAlert = () => { setShowInfoAlert(false); localStorage.setItem(INFO_ALERT_DISMISSED_KEY, 'true'); };
  const handleProductTypeChange = (e) => { setSelectedProductTypeId(e.target.value); setSelectedProductId(''); setSelectedProductColor(''); setSelectedProductSize(''); };
  const handleProductChange = (e) => { setSelectedProductId(e.target.value); setSelectedProductColor(''); setSelectedProductSize(''); };
  const handleColorChange = (e) => { setSelectedProductColor(e.target.value); setSelectedProductSize(''); };
  const handleSizeChange = (e) => { setSelectedProductSize(e.target.value); };

  return (
    <Box maxW="container.xl" mx="auto" p={4}>
      <VStack spacing={6} align="stretch">
        <Heading>Customize Your Apparel!</Heading>
        {showInfoAlert && ( <Alert status="info" borderRadius="md"><AlertIcon /><Box>Want a new design? <ChakraLink as={RouterLink} to="/generate" fontWeight="bold">Create it in the AI Generator first!</ChakraLink></Box><ChakraCloseButton onClick={handleDismissInfoAlert} /></Alert> )}
        <Box p={6} borderWidth="1px" borderRadius="xl" shadow="lg"><Heading as="h2" size="lg" mb={6}>1. Choose Your Apparel</Heading><SimpleGrid columns={{ base: 1, md: 4 }} spacing={6}><VStack align="stretch"><Text>Product Type:</Text><Select value={selectedProductTypeId} onChange={handleProductTypeChange} placeholder="Select Type" isDisabled={loadingProductTypes}>{availableProductTypes.map(pt => <option key={pt._id} value={pt._id}>{pt.name}</option>)}</Select></VStack><VStack align="stretch"><Text>Specific Product:</Text><Select value={selectedProductId} onChange={handleProductChange} placeholder="Select Product" isDisabled={!selectedProductTypeId || loadingProductsOfType}>{productsOfType.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</Select></VStack><VStack align="stretch"><Text>Color:</Text><Select value={selectedProductColor} onChange={handleColorChange} placeholder="Select Color" isDisabled={!selectedProductId}>{availableColors.map(pc => <option key={pc.value} value={pc.value}>{pc.label}</option>)}</Select></VStack><VStack align="stretch"><Text>Size:</Text><Select value={selectedProductSize} onChange={handleSizeChange} placeholder="Select Size" isDisabled={!selectedProductColor}>{availableSizes.map(ps => <option key={ps.value} value={ps.value}>{ps.label}</option>)}</Select></VStack></SimpleGrid></Box>
        <Divider />
        <Box p={6} borderWidth="1px" borderRadius="xl" shadow="lg"><Heading as="h2" size="lg" mb={6}>2. Choose Your Saved Design</Heading>{loadingDesigns ? <Spinner /> : !designs.length ? <Text>You have no saved designs.</Text> : (<SimpleGrid columns={{ base: 2, sm: 3, md: 5 }} spacing={4}>{designs.map(design => (<Box key={design._id} borderWidth="2px" borderRadius="md" onClick={() => setSelectedDesign(design)} cursor="pointer" borderColor={selectedDesign?._id === design._id ? "brand.accentYellow" : "transparent"}><Image src={design.imageDataUrl} fallbackSrc="https://via.placeholder.com/150" /></Box>))}</SimpleGrid>)}</Box>
        <Divider />
        <Box p={6} borderWidth="1px" borderRadius="xl" shadow="lg"><Heading as="h2" size="lg" mb={6}>3. Preview & Checkout</Heading><Box w={`${CANVAS_WIDTH}px`} h={`${CANVAS_HEIGHT}px`} bg="gray.200" mx="auto" borderRadius="md"><canvas ref={canvasEl} /></Box>{selectedDesign && selectedVariant && (<VStack spacing={6} mt={6}><Text>Your design on a {selectedVariant.size} {selectedVariant.colorName} shirt.</Text><Button colorScheme="brandAccent" size="lg" onClick={handleProceedToCheckout} leftIcon={<FaShoppingCart />}>Proceed to Checkout</Button></VStack>)}</Box>
      </VStack>
    </Box>
  );
}
