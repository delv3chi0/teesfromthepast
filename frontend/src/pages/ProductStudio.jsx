import { useState, useEffect, useRef } from 'react';
import {
    Box, Heading, Text, VStack, Select, SimpleGrid, Image, Spinner, Alert,
    AlertIcon, Divider, useToast, Icon, Button, FormControl, FormLabel, Link as ChakraLink
} from '@chakra-ui/react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart } from 'react-icons/fa';

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

    // State for data fetched from API
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [designs, setDesigns] = useState([]);
    const [loadingDesigns, setLoadingDesigns] = useState(true);

    // State for user selections
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedDesign, setSelectedDesign] = useState(null);
    
    // --- REFACTORED LOGIC ---
    // Derivations are now based on the flat products list and current selections
    const selectedProduct = products.find(p => p._id === selectedProductId);
    
    const availableColors = selectedProduct 
        ? [...new Map(selectedProduct.variants.map(v => [v.colorName, v])).values()] 
        : [];

    const selectedColorVariant = selectedProduct?.variants.find(v => v.colorName === selectedColor);
    
    const availableSizes = selectedColorVariant?.sizes?.filter(s => s.inStock) || [];

    const selectedSizeVariant = availableSizes.find(s => s.size === selectedSize);
    
    // Combine color and size info for the final variant object used by canvas/checkout
    const finalVariant = selectedColorVariant && selectedSizeVariant 
        ? { ...selectedColorVariant, ...selectedSizeVariant } 
        : null;

    const canvasEl = useRef(null);
    const fabricCanvas = useRef(null);
    
    useEffect(() => {
        setLoading(true);
        client.get('/storefront/products')
            .then(res => {
                setProducts(res.data || []);
            })
            .catch(err => {
                console.error("Failed to fetch products:", err);
                toast({ title: "Error", description: "Could not load products. Please try again later.", status: "error" });
            })
            .finally(() => setLoading(false));
    }, [toast]);
    
    useEffect(() => {
        if (user) {
            setLoadingDesigns(true);
            client.get('/mydesigns').then(res => setDesigns(res.data || [])).finally(() => setLoadingDesigns(false));
        }
    }, [user]);

    useEffect(() => {
        const setupCanvas = (fabricInstance) => {
            if (!fabricCanvas.current && canvasEl.current) { fabricCanvas.current = new fabricInstance.Canvas(canvasEl.current, { width: 400, height: 400 }); }
            const FCanvas = fabricCanvas.current;
            if (!FCanvas) return;
            FCanvas.clear();
            
            const primaryImage = finalVariant?.imageSet?.find(img => img.isPrimary) || finalVariant?.imageSet?.[0];
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
    }, [selectedDesign, finalVariant]);

    const handleProceedToCheckout = () => {
        if (!selectedDesign) { toast({ title: "Please select a design.", status: "warning", isClosable: true }); return; }
        if (!finalVariant) { toast({ title: "Please select all product options.", status: "warning", isClosable: true }); return; }
        
        const primaryImage = finalVariant.imageSet?.find(img => img.isPrimary) || finalVariant.imageSet?.[0];
        const checkoutItem = { 
            designId: selectedDesign._id, 
            productId: selectedProductId, 
            productName: selectedProduct.name, 
            variantSku: finalVariant.sku, 
            size: finalVariant.size, 
            color: finalVariant.colorName, 
            prompt: selectedDesign.prompt, 
            imageDataUrl: selectedDesign.imageDataUrl, 
            productImage: primaryImage?.url,
            unitPrice: (selectedProduct.basePrice + (finalVariant.priceModifier || 0))
        };
        localStorage.setItem('itemToCheckout', JSON.stringify(checkoutItem));
        navigate('/checkout');
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
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                        <FormControl><FormLabel color="whiteAlpha.800">Product</FormLabel><ThemedSelect value={selectedProductId} onChange={handleProductChange} placeholder="Select Product">{products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</ThemedSelect></FormControl>
                        <FormControl><FormLabel color="whiteAlpha.800">Color</FormLabel><ThemedSelect value={selectedColor} onChange={handleColorChange} placeholder="Select Color" isDisabled={!selectedProductId}>{availableColors.map(c => <option key={c.colorName} value={c.colorName}>{c.colorName}</option>)}</ThemedSelect></FormControl>
                        <FormControl><FormLabel color="whiteAlpha.800">Size</FormLabel><ThemedSelect value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} placeholder="Select Size" isDisabled={!selectedColor}>{availableSizes.map(s => <option key={s.sku} value={s.size}>{s.size}</option>)}</ThemedSelect></FormControl>
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
                    {selectedDesign && finalVariant ? (
                        <VStack spacing={4} mt={4}>
                            <Text fontSize="xl" fontWeight="medium" color="brand.textLight">Your design on a {finalVariant.size} {finalVariant.colorName} shirt.</Text>
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
