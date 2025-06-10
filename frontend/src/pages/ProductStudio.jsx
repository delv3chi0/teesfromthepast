// frontend/src/pages/ProductStudio.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Heading, Text, VStack, Select,
  SimpleGrid, Image, Spinner, Alert, AlertIcon, CloseButton as ChakraCloseButton,
  Link as ChakraLink, Divider, useToast, Icon, Button
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart, FaImage } from 'react-icons/fa';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const INFO_ALERT_DISMISSED_KEY = 'productStudioInfoAlertDismissed_v1';

export default function ProductStudio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const location = useLocation();

  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
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
    const params = new URLSearchParams(location.search);
    const productTypeId = params.get('productTypeId');
    const productId = params.get('productId');
    const color = params.get('color');
    const size = params.get('size');
    
    if (productTypeId && productId && color && size) {
        setSelectedProductTypeId(productTypeId);
        setSelectedProductId(productId);
        setSelectedProductColor(color);
        setSelectedProductSize(size);
    }
  }, [location.search]);

  useEffect(() => {
    const dismissed = localStorage.getItem(INFO_ALERT_DISMISSED_KEY);
    if (dismissed !== 'true') { setShowInfoAlert(true); }
  }, []);

  useEffect(() => {
    if(user) {
        client.get('/mydesigns').then(res => setDesigns(res.data || [])).finally(() => setLoadingDesigns(false));
    }
  },[user]);

  useEffect(() => {
    setLoadingProductTypes(true);
    client.get('/storefront/product-types').then(res => setAvailableProductTypes(res.data || [])).finally(() => setLoadingProductTypes(false));
  }, []);

  useEffect(() => {
    if (!selectedProductTypeId) { setProductsOfType([]); return; }
    setLoadingProductsOfType(true);
    client.get(`/storefront/products/type/${selectedProductTypeId}`)
      .then(res => {
          setProductsOfType(res.data || []);
          // If a product was pre-selected, it should now be in the list.
          // The other useEffects will take over from here.
      })
      .finally(() => setLoadingProductsOfType(false));
  }, [selectedProductTypeId]);

  useEffect(() => {
    if (!selectedProductId || productsOfType.length === 0) { setAvailableColors([]); return; }
    const product = productsOfType.find(p => p._id === selectedProductId);
    const colors = product?.variants.map(v => ({ value: v.colorName, label: v.colorName, hex: v.colorHex })) || [];
    setAvailableColors(colors);
  }, [selectedProductId, productsOfType]);

  useEffect(() => {
    if (!selectedProductColor || !selectedProductId || productsOfType.length === 0) { setAvailableSizes([]); return; }
    const product = productsOfType.find(p => p._id === selectedProductId);
    const colorVariant = product?.variants.find(v => v.colorName === selectedProductColor);
    const sizes = colorVariant?.sizes.map(s => s.size) || [];
    setAvailableSizes(sizes.map(s => ({ value: s, label: s })));
  }, [selectedProductColor, selectedProductId, productsOfType]);

  useEffect(() => {
    if (selectedProductId && selectedProductColor && selectedProductSize) {
      const product = productsOfType.find(p => p._id === selectedProductId);
      const colorVariant = product?.variants.find(v => v.colorName === selectedProductColor);
      const sizeVariant = colorVariant?.sizes.find(s => s.size === selectedProductSize);
      if (sizeVariant && colorVariant) {
        const primaryImage = colorVariant.imageSet?.find(img => img.isPrimary) || colorVariant.imageSet?.[0] || { url: '' };
        setSelectedVariant({ ...sizeVariant, colorName: colorVariant.colorName, imageMockupFront: primaryImage?.url });
      } else {
        setSelectedVariant(null);
      }
    } else {
      setSelectedVariant(null);
    }
  }, [selectedProductId, selectedProductColor, selectedProductSize, productsOfType]);
  
  useEffect(() => {
    const setupCanvas = (fabricInstance) => {
        if (!fabricCanvas.current && canvasEl.current) { fabricCanvas.current = new fabricInstance.Canvas(canvasEl.current, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }); }
        const FCanvas = fabricCanvas.current;
        if (!FCanvas) return;
        FCanvas.clear();
        FCanvas.setBackgroundColor('#f0f0f0', FCanvas.renderAll.bind(FCanvas));

        const mockupSrc = selectedVariant?.imageMockupFront;
        if (mockupSrc) {
            fabricInstance.Image.fromURL(mockupSrc, (img) => { FCanvas.setBackgroundImage(img, FCanvas.renderAll.bind(FCanvas), { scaleX: FCanvas.width / img.width, scaleY: FCanvas.height / img.height }); }, { crossOrigin: 'anonymous' });
        }
        if (selectedDesign?.imageDataUrl) {
            // Remove previous design if it exists
            const existingDesign = FCanvas.getObjects('image')[0];
            if(existingDesign) FCanvas.remove(existingDesign);

            fabricInstance.Image.fromURL(selectedDesign.imageDataUrl, (img) => {
                if(!img) return;
                img.scaleToWidth(CANVAS_WIDTH * 0.33);
                img.set({ top: CANVAS_HEIGHT * 0.24, left: (CANVAS_WIDTH - img.getScaledWidth()) / 2 });
                FCanvas.add(img);
            }, { crossOrigin: 'anonymous' });
        }
    };
    const pollForFabric = () => { if(window.fabric) setupCanvas(window.fabric); else setTimeout(pollForFabric, 100); };
    pollForFabric();
  }, [selectedDesign, selectedVariant]);
  
  const handleProceedToCheckout = () => {
    if (!selectedDesign) { toast({ title: "Please select a design.", status: "warning" }); return; }
    if (!selectedVariant) { toast({ title: "Please select all product options.", status: "warning" }); return; }
    const product = productsOfType.find(p => p._id === selectedProductId);
    const checkoutItem = { designId: selectedDesign._id, productId: selectedProductId, productName: product.name, variantSku: selectedVariant.sku, size: selectedVariant.size, color: selectedVariant.colorName, prompt: selectedDesign.prompt, imageDataUrl: selectedDesign.imageDataUrl, productImage: selectedVariant.imageMockupFront };
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
        <Heading as="h1" size="pageTitle" textAlign="left" w="100%" color="brand.textDark">Customize Your Apparel</Heading>
        {showInfoAlert && ( <Alert status="info" borderRadius="md"><AlertIcon /><Box>Want a new design? <ChakraLink as={RouterLink} to="/generate" fontWeight="bold">Create it in the AI Generator first!</ChakraLink></Box><ChakraCloseButton onClick={handleDismissInfoAlert} /></Alert> )}
        
        {/* === THE UI REFACTOR STARTS HERE === */}

        <Box p={6} borderWidth="1px" borderRadius="xl" shadow="lg" bg="brand.paper">
            <Heading as="h2" size="lg" mb={6} color="brand.textDark">1. Choose Your Apparel</Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg:4 }} spacing={6}>
                <VStack align="stretch"><Text fontWeight="medium">Product Type:</Text><Select value={selectedProductTypeId} onChange={handleProductTypeChange} placeholder={loadingProductTypes ? "Loading..." : "Select Type"} isDisabled={loadingProductTypes}>{availableProductTypes.map(pt => <option key={pt._id} value={pt._id}>{pt.name}</option>)}</Select></VStack>
                <VStack align="stretch"><Text fontWeight="medium">Specific Product:</Text><Select value={selectedProductId} onChange={handleProductChange} placeholder="Select Product" isDisabled={!selectedProductTypeId || loadingProductsOfType}>{productsOfType.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</Select></VStack>
                <VStack align="stretch"><Text fontWeight="medium">Color:</Text><Select value={selectedProductColor} onChange={handleColorChange} placeholder="Select Color" isDisabled={!selectedProductId}>{availableColors.map(pc => <option key={pc.value} value={pc.value}>{pc.label}</option>)}</Select></VStack>
                <VStack align="stretch"><Text fontWeight="medium">Size:</Text><Select value={selectedProductSize} onChange={handleSizeChange} placeholder="Select Size" isDisabled={!selectedProductColor}>{availableSizes.map(ps => <option key={ps.value} value={ps.value}>{ps.label}</option>)}</Select></VStack>
            </SimpleGrid>
        </Box>

        <Box p={6} borderWidth="1px" borderRadius="xl" shadow="lg" bg="brand.paper">
            <Heading as="h2" size="lg" mb={6} color="brand.textDark">2. Choose Your Saved Design</Heading>
            {loadingDesigns ? <Spinner /> : !designs.length ? <Text>You have no saved designs. Go <ChakraLink as={RouterLink} to="/generate" fontWeight="bold">generate</ChakraLink> some!</Text> : (
            <SimpleGrid columns={{ base: 2, sm: 3, md: 5, lg: 6 }} spacing={4}>
                {designs.map(design => (
                <Box key={design._id} borderWidth="3px" borderRadius="lg" onClick={() => setSelectedDesign(design)} cursor="pointer" borderColor={selectedDesign?._id === design._id ? "brand.accentYellow" : "transparent"} transition="border-color 0.2s">
                    <Image src={design.imageDataUrl} borderRadius="md" fallbackSrc="https://via.placeholder.com/150" />
                </Box>
                ))}
            </SimpleGrid>
            )}
        </Box>
        
        <Box p={6} borderWidth="1px" borderRadius="xl" shadow="lg" bg="brand.paper">
            <Heading as="h2" size="lg" mb={6} color="brand.textDark">3. Preview & Checkout</Heading>
            <Box w={`${CANVAS_WIDTH}px`} h={`${CANVAS_HEIGHT}px`} bg="gray.100" mx="auto" borderRadius="md" border="1px solid" borderColor="gray.200">
                <canvas ref={canvasEl} />
            </Box>
            {selectedDesign && selectedVariant ? (
                <VStack spacing={4} mt={6}>
                    <Text fontSize="lg" fontWeight="medium">Your design on a {selectedVariant.size} {selectedVariant.colorName} shirt.</Text>
                    <Button colorScheme="brandAccent" size="lg" onClick={handleProceedToCheckout} leftIcon={<FaShoppingCart />}>Proceed to Checkout</Button>
                </VStack>
            ) : (
                <VStack spacing={4} mt={6}><Alert status="warning" borderRadius="md" maxW="lg" mx="auto"><AlertIcon />Please select an apparel option and a design to continue.</Alert></VStack>
            )}
        </Box>
      </VStack>
    </Box>
  );
}
