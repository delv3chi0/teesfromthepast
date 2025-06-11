// frontend/src/pages/ProductStudio.jsx

import { useState, useEffect, useRef } from 'react';
import {
    Box, Heading, Text, VStack, Select, SimpleGrid, Image, Spinner, Alert,
    AlertIcon, Divider, useToast, Icon, Button, FormControl, FormLabel
} from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart } from 'react-icons/fa';

/**
 * Product Studio Page
 * REFRACTORED:
 * - Replaced default Cards with custom-styled dark theme cards for each step.
 * - Completely restyled all <Select> form controls for dark mode, a critical UI fix.
 * - Enhanced the user design gallery for better visual feedback and selection.
 * - Updated the canvas preview area and all buttons/alerts to match the site's theme.
 * - Improved layout and visual hierarchy to guide the user through the customization process.
 */

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;

const ThemedSelect = (props) => (
    <Select
        size="lg"
        bg="brand.primaryDark"
        borderColor="whiteAlpha.300"
        _hover={{ borderColor: "whiteAlpha.400" }}
        focusBorderColor="brand.accentYellow"
        {...props}
    />
);

export default function ProductStudio() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const location = useLocation();

    // State management remains the same
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

    // All useEffect hooks for data fetching and logic remain the same.

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
        if (user) {
            setLoadingDesigns(true);
            client.get('/mydesigns').then(res => setDesigns(res.data || [])).finally(() => setLoadingDesigns(false));
        }
    }, [user]);

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
        const uniqueColors = [...new Map(product?.variants.map(v => [v.colorName, v])).values()];
        setAvailableColors(uniqueColors.map(v => ({ value: v.colorName, label: v.colorName })));
    }, [selectedProductId, productsOfType]);

    useEffect(() => {
        if (!selectedProductColor) { setAvailableSizes([]); return; }
        const product = productsOfType.find(p => p._id === selectedProductId);
        const sizesForColor = product?.variants.filter(v => v.colorName === selectedProductColor).map(v => v.size) || [];
        setAvailableSizes(sizesForColor.map(s => ({ value: s, label: s })));
    }, [selectedProductColor, selectedProductId, productsOfType]);

    useEffect(() => {
        if (selectedProductId && selectedProductColor && selectedProductSize) {
            const product = productsOfType.find(p => p._id === selectedProductId);
            const variant = product?.variants.find(v => v.colorName === selectedProductColor && v.size === selectedProductSize);
            if (variant) {
                setSelectedVariant(variant);
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
            
            const mockupSrc = selectedVariant?.imageMockupFront;
            if (mockupSrc) {
                fabricInstance.Image.fromURL(mockupSrc, (img) => { 
                    FCanvas.setBackgroundImage(img, FCanvas.renderAll.bind(FCanvas), { 
                        scaleX: FCanvas.width / img.width, 
                        scaleY: FCanvas.height / img.height 
                    }); 
                }, { crossOrigin: 'anonymous' });
            } else {
                 FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
            }
            
            FCanvas.getObjects('image').forEach(obj => FCanvas.remove(obj));
            if (selectedDesign?.imageDataUrl) {
                fabricInstance.Image.fromURL(selectedDesign.imageDataUrl, (img) => {
                    if (!img) return;
                    img.scaleToWidth(CANVAS_WIDTH * 0.33);
                    img.set({ top: CANVAS_HEIGHT * 0.24, left: (CANVAS_WIDTH - img.getScaledWidth()) / 2 });
                    FCanvas.add(img);
                }, { crossOrigin: 'anonymous' });
            }
        };
        const pollForFabric = () => { if (window.fabric) setupCanvas(window.fabric); else setTimeout(pollForFabric, 100); };
        pollForFabric();
    }, [selectedDesign, selectedVariant]);

    const handleProceedToCheckout = () => {
        if (!selectedDesign) { toast({ title: "Please select a design.", status: "warning", isClosable: true }); return; }
        if (!selectedVariant) { toast({ title: "Please select all product options.", status: "warning", isClosable: true }); return; }
        const product = productsOfType.find(p => p._id === selectedProductId);
        const checkoutItem = { designId: selectedDesign._id, productId: selectedProductId, productName: product.name, variantSku: selectedVariant.sku, size: selectedVariant.size, color: selectedVariant.colorName, prompt: selectedDesign.prompt, imageDataUrl: selectedDesign.imageDataUrl, productImage: selectedVariant.imageMockupFront, unitPrice: selectedVariant.price };
        localStorage.setItem('itemToCheckout', JSON.stringify(checkoutItem));
        navigate('/checkout');
    };
    
    // Handler functions simplified for brevity, logic remains the same.
    const handleProductTypeChange = (e) => { setSelectedProductTypeId(e.target.value); setSelectedProductId(''); setSelectedProductColor(''); setSelectedProductSize(''); };
    const handleProductChange = (e) => { setSelectedProductId(e.target.value); setSelectedProductColor(''); setSelectedProductSize(''); };
    const handleColorChange = (e) => { setSelectedProductColor(e.target.value); setSelectedProductSize(''); };
    const handleSizeChange = (e) => { setSelectedProductSize(e.target.value); };

    return (
        <VStack spacing={8} align="stretch">
            <Heading as="h1" size="2xl" color="brand.textLight">Customize Your Apparel</Heading>
            
            <Box bg="brand.primaryLight" p={{base: 5, md: 8}} borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight">1. Choose Your Apparel</Heading>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                        <FormControl><FormLabel color="whiteAlpha.800">Product Type</FormLabel><ThemedSelect value={selectedProductTypeId} onChange={handleProductTypeChange} placeholder={loadingProductTypes ? "Loading..." : "Select Type"} isDisabled={loadingProductTypes}>{availableProductTypes.map(pt => <option key={pt._id} value={pt._id}>{pt.name}</option>)}</ThemedSelect></FormControl>
                        <FormControl><FormLabel color="whiteAlpha.800">Specific Product</FormLabel><ThemedSelect value={selectedProductId} onChange={handleProductChange} placeholder={loadingProductsOfType ? "Loading..." : "Select Product"} isDisabled={!selectedProductTypeId || loadingProductsOfType}>{productsOfType.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</ThemedSelect></FormControl>
                        <FormControl><FormLabel color="whiteAlpha.800">Color</FormLabel><ThemedSelect value={selectedProductColor} onChange={handleColorChange} placeholder="Select Color" isDisabled={!selectedProductId}>{availableColors.map(pc => <option key={pc.value} value={pc.value}>{pc.label}</option>)}</ThemedSelect></FormControl>
                        <FormControl><FormLabel color="whiteAlpha.800">Size</FormLabel><ThemedSelect value={selectedProductSize} onChange={handleSizeChange} placeholder="Select Size" isDisabled={!selectedProductColor}>{availableSizes.map(ps => <option key={ps.value} value={ps.value}>{ps.label}</option>)}</ThemedSelect></FormControl>
                    </SimpleGrid>
                </VStack>
            </Box>

            <Box bg="brand.primaryLight" p={{base: 5, md: 8}} borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight">2. Choose Your Saved Design</Heading>
                    {loadingDesigns ? <Spinner color="brand.accentYellow"/> : !designs.length ? (
                        <Text color="whiteAlpha.800" fontSize="lg">You have no saved designs. <ChakraLink as={RouterLink} to="/generate" color="brand.accentYellow" fontWeight="bold">Generate one now!</ChakraLink></Text>
                    ) : (
                        <SimpleGrid columns={{ base: 2, sm: 3, md: 5, lg: 6 }} spacing={4}>
                            {designs.map(design => (
                                <Box key={design._id} p={1} bg="brand.primaryDark" borderWidth="3px" borderRadius="lg" onClick={() => setSelectedDesign(design)} cursor="pointer" borderColor={selectedDesign?._id === design._id ? "brand.accentYellow" : "transparent"} transition="border-color 0.2s ease-in-out">
                                    <Image src={design.imageDataUrl} borderRadius="md" />
                                </Box>
                            ))}
                        </SimpleGrid>
                    )}
                </VStack>
            </Box>
            
            <Box bg="brand.primaryLight" p={{base: 5, md: 8}} borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight" textAlign="center">3. Preview & Checkout</Heading>
                    <Box w={`${CANVAS_WIDTH}px`} h={`${CANVAS_HEIGHT}px`} bg="rgba(0,0,0,0.2)" mx="auto" borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.300">
                        <canvas ref={canvasEl} />
                    </Box>
                    {selectedDesign && selectedVariant ? (
                        <VStack spacing={4} mt={4}>
                            <Text fontSize="xl" fontWeight="medium" color="brand.textLight">Your design on a {selectedVariant.size} {selectedVariant.colorName} shirt.</Text>
                            <Button bg="brand.accentOrange" color="white" _hover={{bg: 'brand.accentOrangeHover'}} size="lg" onClick={handleProceedToCheckout} leftIcon={<Icon as={FaShoppingCart} />}>Proceed to Checkout</Button>
                        </VStack>
                    ) : (
                        <Alert status="info" borderRadius="md" maxW="lg" mx="auto" bg="blue.900" borderWidth="1px" borderColor="blue.500">
                            <AlertIcon color="blue.300" />
                            <Text color="whiteAlpha.900">Please select an apparel option and a design to continue.</Text>
                        </Alert>
                    )}
                </VStack>
            </Box>
        </VStack>
    );
}
