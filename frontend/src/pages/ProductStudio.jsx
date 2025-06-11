// frontend/src/pages/ProductStudio.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Heading, Text, VStack, Select,
  SimpleGrid, Image, Spinner, Alert, AlertIcon, CloseButton as ChakraCloseButton,
  Link as ChakraLink, Divider, useToast, Icon, Button, Card, CardBody, CardHeader
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart, FaImage } from 'react-icons/fa';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;

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
    if(user) {
        setLoadingDesigns(true);
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
      .then(res => setProductsOfType(res.data || []))
      .finally(() => setLoadingProductsOfType(false));
  }, [selectedProductTypeId]);

  useEffect(() => {
    if (!selectedProductId) { setAvailableColors([]); return; }
    const product = productsOfType.find(p => p._id === selectedProductId);
    const colors = product?.variants.map(v => ({ value: v.colorName, label: v.colorName })) || [];
    setAvailableColors(colors);
  }, [selectedProductId, productsOfType]);

  useEffect(() => {
    if (!selectedProductColor) { setAvailableSizes([]); return; }
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
  
  const handleProceedToCheckout = () => { /* ... unchanged ... */ };
  const handleProductTypeChange = (e) => { setSelectedProductTypeId(e.target.value); setSelectedProductId(''); setSelectedProductColor(''); setSelectedProductSize(''); };
  const handleProductChange = (e) => { setSelectedProductId(e.target.value); setSelectedProductColor(''); setSelectedProductSize(''); };
  const handleColorChange = (e) => { setSelectedProductColor(e.target.value); setSelectedProductSize(''); };
  const handleSizeChange = (e) => { setSelectedProductSize(e.target.value); };

  return (
    <VStack spacing={8} align="stretch">
      <Heading as="h1" size="pageTitle">Customize Your Apparel</Heading>
      
      <Card><CardBody><VStack spacing={5} align="stretch">
        <Heading as="h2" size="lg">1. Choose Your Apparel</Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg:4 }} spacing={6}>
            <FormControl><FormLabel>Product Type</FormLabel><Select value={selectedProductTypeId} onChange={handleProductTypeChange} placeholder={loadingProductTypes ? "Loading..." : "Select Type"} isDisabled={loadingProductTypes}>{availableProductTypes.map(pt => <option key={pt._id} value={pt._id}>{pt.name}</option>)}</Select></FormControl>
            <FormControl><FormLabel>Specific Product</FormLabel><Select value={selectedProductId} onChange={handleProductChange} placeholder="Select Product" isDisabled={!selectedProductTypeId || loadingProductsOfType}>{productsOfType.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</Select></FormControl>
            <FormControl><FormLabel>Color</FormLabel><Select value={selectedProductColor} onChange={handleColorChange} placeholder="Select Color" isDisabled={!selectedProductId}>{availableColors.map(pc => <option key={pc.value} value={pc.value}>{pc.label}</option>)}</Select></FormControl>
            <FormControl><FormLabel>Size</FormLabel><Select value={selectedProductSize} onChange={handleSizeChange} placeholder="Select Size" isDisabled={!selectedProductColor}>{availableSizes.map(ps => <option key={ps.value} value={ps.value}>{ps.label}</option>)}</Select></FormControl>
        </SimpleGrid>
      </VStack></CardBody></Card>

      <Card><CardBody><VStack spacing={5} align="stretch">
        <Heading as="h2" size="lg">2. Choose Your Saved Design</Heading>
        {loadingDesigns ? <Spinner /> : !designs.length ? <Text>You have no saved designs.</Text> : (
        <SimpleGrid columns={{ base: 2, sm: 3, md: 5, lg: 6 }} spacing={4}>
            {designs.map(design => (
            <Box key={design._id} borderWidth="3px" borderRadius="lg" onClick={() => setSelectedDesign(design)} cursor="pointer" borderColor={selectedDesign?._id === design._id ? "brand.accentYellow" : "transparent"}>
                <Image src={design.imageDataUrl} borderRadius="md" />
            </Box>
            ))}
        </SimpleGrid>
        )}
      </VStack></CardBody></Card>
      
      <Card><CardBody><VStack spacing={5} align="stretch">
        <Heading as="h2" size="lg" textAlign="center">3. Preview & Checkout</Heading>
        <Box w={`${CANVAS_WIDTH}px`} h={`${CANVAS_HEIGHT}px`} bg="gray.100" mx="auto" borderRadius="md" border="1px solid" borderColor="gray.600">
            <canvas ref={canvasEl} />
        </Box>
        {selectedDesign && selectedVariant ? (
            <VStack spacing={4} mt={6}>
                <Text fontSize="lg" fontWeight="medium">Your design on a {selectedVariant.size} {selectedVariant.colorName} shirt.</Text>
                <Button colorScheme="brandAccentOrange" size="lg" onClick={handleProceedToCheckout} leftIcon={<FaShoppingCart />}>Proceed to Checkout</Button>
            </VStack>
        ) : (
            <Alert status="info" borderRadius="md" maxW="lg" mx="auto" bg="brand.primaryLight"><AlertIcon />Please select an apparel option and a design to continue.</Alert>
        )}
      </VStack></CardBody></Card>
    </VStack>
  );
}
