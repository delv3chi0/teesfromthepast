import { useState, useEffect, useRef } from 'react';
import {
    Box, Heading, Text, VStack, Select, SimpleGrid, Image, Spinner, Alert,
    AlertIcon, Divider, useToast, Icon, Button, FormControl, FormLabel, Link as ChakraLink
} from '@chakra-ui/react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart } from 'react-icons/fa';

// ThemedSelect component remains for consistent styling
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

    // State management for the form
    const [shopData, setShopData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [designs, setDesigns] = useState([]);
    const [loadingDesigns, setLoadingDesigns] = useState(true);

    // Selections
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedDesign, setSelectedDesign] = useState(null);
    
    // Derived state - this simplifies the logic
    const selectedCategory = shopData.find(c => c.categoryId === selectedCategoryId);
    const selectedProduct = selectedCategory?.products.find(p => p._id === selectedProductId);
    const availableColors = selectedProduct ? [...new Map(selectedProduct.variants.map(v => [v.colorName, v])).values()] : [];
    const variantsForSelectedColor = selectedProduct?.variants.filter(v => v.colorName === selectedColor) || [];
    const selectedVariant = variantsForSelectedColor.find(v => v.size === selectedSize);
    
    // Canvas refs remain the same
    const canvasEl = useRef(null);
    const fabricCanvas = useRef(null);
    
    // MODIFIED: This useEffect now makes a single call to get all shop data.
    useEffect(() => {
        setLoading(true);
        client.get('/storefront/shop-data')
            .then(res => {
                setShopData(res.data || []);
            })
            .catch(err => {
                console.error("Failed to fetch shop data:", err);
                toast({ title: "Error", description: "Could not load products. Please try again later.", status: "error" });
            })
            .finally(() => setLoading(false));
    }, [toast]);
    
    // This useEffect for fetching designs remains the same
    useEffect(() => {
        if (user) {
            setLoadingDesigns(true);
            client.get('/mydesigns').then(res => setDesigns(res.data || [])).finally(() => setLoadingDesigns(false));
        }
    }, [user]);

    // Canvas logic remains the same
    useEffect(() => {
        const setupCanvas = (fabricInstance) => {
            if (!fabricCanvas.current && canvasEl.current) { fabricCanvas.current = new fabricInstance.Canvas(canvasEl.current, { width: 400, height: 400 }); }
            const FCanvas = fabricCanvas.current;
            if (!FCanvas) return;
            FCanvas.clear();
            
            const primaryImage = selectedVariant?.imageSet?.find(img => img.isPrimary) || selectedVariant?.imageSet?.[0];
            const mockupSrc = primaryImage?.url;

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
                    img.scaleToWidth(400 * 0.33);
                    img.set({ top: 400 * 0.24, left: (400 - img.getScaledWidth()) / 2 });
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
        
        const checkoutItem = { 
            designId: selectedDesign._id, 
            productId: selectedProductId, 
            productName: selectedProduct.name, 
            variantSku: selectedVariant.sku, 
            size: selectedVariant.size, 
            color: selectedVariant.colorName, 
            prompt: selectedDesign.prompt, 
            imageDataUrl: selectedDesign.imageDataUrl, 
            productImage: selectedVariant.imageSet?.find(img => img.isPrimary)?.url || selectedVariant.imageSet?.[0]?.url,
            // Calculate price based on base and modifier
            unitPrice: (selectedProduct.basePrice + (selectedVariant.priceModifier || 0))
        };
        localStorage.setItem('itemToCheckout', JSON.stringify(checkoutItem));
        navigate('/checkout');
    };
    
    // Handlers are now simplified
    const handleCategoryChange = (e) => {
        setSelectedCategoryId(e.target.value);
        setSelectedProductId('');
        setSelectedColor('');
        setSelectedSize('');
    };
    const handleProductChange = (e) => {
        setSelectedProductId(e.target.value);
        setSelectedColor('');
        setSelectedSize('');
    };
    const handleColorChange = (e) => {
        setSelectedColor(e.target.value);
        setSelectedSize('');
    };

    return (
        <VStack spacing={8} align="stretch">
            <Heading as="h1" size="2xl" color="brand.textLight">Customize Your Apparel</Heading>
            
            <Box bg="brand.cardBlue" p={{base: 5, md: 8}} borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight">1. Choose Your Apparel</Heading>
                    {loading ? <Spinner color="brand.accentYellow" /> :
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                        <FormControl><FormLabel color="whiteAlpha.800">Category</FormLabel><ThemedSelect value={selectedCategoryId} onChange={handleCategoryChange} placeholder="Select Category">{shopData.map(cat => <option key={cat.categoryId} value={cat.categoryId}>{cat.categoryName}</option>)}</ThemedSelect></FormControl>
                        <FormControl><FormLabel color="whiteAlpha.800">Product</FormLabel><ThemedSelect value={selectedProductId} onChange={handleProductChange} placeholder="Select Product" isDisabled={!selectedCategoryId}>{selectedCategory?.products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</ThemedSelect></FormControl>
                        <FormControl><FormLabel color="whiteAlpha.800">Color</FormLabel><ThemedSelect value={selectedColor} onChange={handleColorChange} placeholder="Select Color" isDisabled={!selectedProductId}>{availableColors.map(c => <option key={c.colorName} value={c.colorName}>{c.colorName}</option>)}</ThemedSelect></FormControl>
                        <FormControl><FormLabel color="whiteAlpha.800">Size</FormLabel><ThemedSelect value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} placeholder="Select Size" isDisabled={!selectedColor}>{variantsForSelectedColor.map(v => <option key={v.size} value={v.size}>{v.size}</option>)}</ThemedSelect></FormControl>
                    </SimpleGrid>
                    }
                </VStack>
            </Box>

            <Box bg="brand.cardBlue" p={{base: 5, md: 8}} borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight">2. Choose Your Saved Design</Heading>
                    {loadingDesigns ? <Spinner color="brand.accentYellow"/> : !designs.length ? (
                        <Text color="whiteAlpha.800" fontSize="lg">You have no saved designs. <ChakraLink as={RouterLink} to="/generate" color="brand.accentYellow" fontWeight="bold">Generate one now!</ChakraLink></Text>
                    ) : (
                        <SimpleGrid columns={{ base: 2, sm: 3, md: 5, lg: 6 }} spacing={4}>
                            {designs.map(design => (
                                <Box key={design._id} p={1} bg="brand.secondary" borderWidth="3px" borderRadius="lg" onClick={() => setSelectedDesign(design)} cursor="pointer" borderColor={selectedDesign?._id === design._id ? "brand.accentYellow" : "transparent"} transition="border-color 0.2s ease-in-out">
                                    <Image src={design.imageDataUrl} borderRadius="md" />
                                </Box>
                            ))}
                        </SimpleGrid>
                    )}
                </VStack>
            </Box>
            
            <Box bg="brand.cardBlue" p={{base: 5, md: 8}} borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight" textAlign="center">3. Preview & Checkout</Heading>
                    <Box w="400px" h="400px" bg="rgba(0,0,0,0.2)" mx="auto" borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.300">
                        <canvas ref={canvasEl} />
                    </Box>
                    {selectedDesign && selectedVariant ? (
                        <VStack spacing={4} mt={4}>
                            <Text fontSize="xl" fontWeight="medium" color="brand.textLight">Your design on a {selectedVariant.size} {selectedVariant.colorName} shirt.</Text>
                            <Button colorScheme="brandAccentOrange" size="lg" onClick={handleProceedToCheckout} leftIcon={<Icon as={FaShoppingCart} />}>Proceed to Checkout</Button>
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
