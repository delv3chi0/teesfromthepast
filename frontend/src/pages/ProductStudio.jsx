import { useState, useEffect, useRef } from 'react';
import {
    Box, Heading, Text, VStack, Select, SimpleGrid, Image, Spinner, Alert,
    AlertIcon, Divider, useToast, Icon, Button, FormControl, FormLabel, Link as ChakraLink
} from '@chakra-ui/react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart } from 'react-icons/fa';

// Reusable ThemedSelect for consistency (updated for proper dark theme background & light text)
const ThemedSelect = (props) => (
    <Select
        size="lg"
        bg="brand.secondary" // Use brand.secondary for dark select background
        borderColor="whiteAlpha.300"
        color="brand.textLight" // Ensure text is light on dark background
        _placeholder={{ color: "brand.textMuted" }} // Muted light placeholder
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

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [designs, setDesigns] = useState([]);
    const [loadingDesigns, setLoadingDesigns] = useState(true);

    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedColorName, setSelectedColorName] = useState(''); // Changed from selectedColor for clarity
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedDesign, setSelectedDesign] = useState(null);
    
    // Derived states (now use selectedColorName)
    const selectedProduct = products.find(p => p._id === selectedProductId);
    // Use a Set to get unique color variants based on colorName
    const uniqueColorVariants = selectedProduct ? [...new Map(selectedProduct.variants.map(v => [v.colorName, v])).values()] : [];
    
    // Find the full color variant object based on selectedColorName
    const selectedColorVariant = selectedProduct?.variants.find(v => v.colorName === selectedColorName);
    const availableSizes = selectedColorVariant?.sizes?.filter(s => s.inStock) || [];
    const selectedSizeVariant = availableSizes.find(s => s.size === selectedSize);

    // Combine color variant and size variant details for the final selected product item
    const finalVariant = selectedColorVariant && selectedSizeVariant
        ? { ...selectedColorVariant, ...selectedSizeVariant }
        : null;

    const canvasEl = useRef(null);
    const fabricCanvas = useRef(null);
    
    // Fetch products and initialize selections from URL params
    useEffect(() => {
        setLoading(true);
        // Assuming /storefront/products returns products with full variants and sizes
        client.get('/storefront/products')
            .then(res => {
                const fetchedProducts = res.data || [];
                setProducts(fetchedProducts);

                const params = new URLSearchParams(location.search);
                const productId = params.get('productId');
                const color = params.get('color');
                const size = params.get('size');

                if (productId && fetchedProducts.length > 0) {
                    setSelectedProductId(productId);
                    const initialProduct = fetchedProducts.find(p => p._id === productId);

                    if (initialProduct && color) {
                        setSelectedColorName(color);
                        const initialColorVariant = initialProduct.variants.find(v => v.colorName === color);

                        if (initialColorVariant && size) {
                            setSelectedSize(size);
                        } else if (initialColorVariant?.sizes?.length > 0) {
                            // If size not in params, but color is, select first available size
                            setSelectedSize(initialColorVariant.sizes[0].size);
                        }
                    } else if (initialProduct?.variants?.length > 0) {
                        // If product in params but no color, select default/first color & size
                        const defaultColor = initialProduct.variants.find(v => v.isDefaultDisplay) || initialProduct.variants[0];
                        setSelectedColorName(defaultColor.colorName);
                        if (defaultColor.sizes?.length > 0) {
                            setSelectedSize(defaultColor.sizes[0].size);
                        }
                    }
                }
            })
            .catch(err => {
                console.error("Failed to fetch products:", err);
                toast({ title: "Error", description: "Could not load products. Please try again later.", status: "error" });
            })
            .finally(() => setLoading(false));
    }, [location.search, toast]); // Removed products from dependency array to prevent infinite loop

    // Fetch user designs
    useEffect(() => {
        if (user) {
            setLoadingDesigns(true);
            client.get('/mydesigns').then(res => setDesigns(res.data || [])).finally(() => setLoadingDesigns(false));
        } else {
            setDesigns([]); // Clear designs if user logs out
            setLoadingDesigns(false);
        }
    }, [user]);

    // Fabric.js canvas setup and update logic
    useEffect(() => {
        const setupCanvas = (fabricInstance) => {
            if (!fabricCanvas.current && canvasEl.current) {
                fabricCanvas.current = new fabricInstance.Canvas(canvasEl.current, {
                    width: 400,
                    height: 400,
                    backgroundColor: 'rgba(0,0,0,0)', // Ensure transparent background for canvas
                });
            }
            const FCanvas = fabricCanvas.current;
            if (!FCanvas) return;

            FCanvas.clear(); // Clear existing elements

            // Load mockup image
            const primaryImage = finalVariant?.imageSet?.find(img => img.isPrimary) || finalVariant?.imageSet?.[0];
            const mockupSrc = primaryImage?.url;

            if (mockupSrc) {
                fabricInstance.Image.fromURL(mockupSrc, (img) => {
                    FCanvas.setBackgroundImage(img, FCanvas.renderAll.bind(FCanvas), {
                        scaleX: FCanvas.width / img.width,
                        scaleY: FCanvas.height / img.height,
                        crossOrigin: 'anonymous', // Important for loading external images
                    });
                }, { crossOrigin: 'anonymous' });
            } else {
                FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
            }
            
            // Add selected design to canvas
            FCanvas.getObjects('image').forEach(obj => FCanvas.remove(obj)); // Remove old design images
            if (selectedDesign?.imageDataUrl) {
                fabricInstance.Image.fromURL(selectedDesign.imageDataUrl, (img) => {
                    if (!img) return;
                    img.scaleToWidth(FCanvas.width * 0.33); // Scale design to 33% of canvas width
                    img.set({
                        top: FCanvas.height * 0.24, // Position design near top of shirt
                        left: (FCanvas.width - img.getScaledWidth()) / 2, // Center horizontally
                        hasControls: true, // Allow user to resize/move
                        hasBorders: true,
                        borderColor: 'brand.accentYellow', // Add a border for selected state
                        cornerColor: 'brand.accentYellow',
                        cornerSize: 8,
                        transparentCorners: false,
                    });
                    FCanvas.add(img);
                    FCanvas.renderAll();
                }, { crossOrigin: 'anonymous' });
            }
        };

        const pollForFabric = () => {
            if (window.fabric) {
                setupCanvas(window.fabric);
            } else {
                setTimeout(pollForFabric, 100);
            }
        };
        pollForFabric();

        // Cleanup function for Fabric.js
        return () => {
            if (fabricCanvas.current) {
                fabricCanvas.current.dispose(); // Dispose the canvas to prevent memory leaks
                fabricCanvas.current = null;
            }
        };
    }, [selectedDesign, finalVariant]); // Depend on selectedDesign and finalVariant to trigger re-render

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
    
    // Handlers for dropdowns
    const handleProductChange = (e) => {
        const newProductId = e.target.value;
        setSelectedProductId(newProductId);
        setSelectedColorName(''); // Reset color and size when product changes
        setSelectedSize('');

        // If a new product is selected, and it has variants, auto-select default color/size
        const newSelectedProduct = products.find(p => p._id === newProductId);
        if (newSelectedProduct && newSelectedProduct.variants.length > 0) {
            const defaultColor = newSelectedProduct.variants.find(v => v.isDefaultDisplay) || newSelectedProduct.variants[0];
            setSelectedColorName(defaultColor.colorName);
            if (defaultColor.sizes.length > 0) {
                setSelectedSize(defaultColor.sizes[0].size);
            }
        }
    };

    const handleColorChange = (e) => {
        const newColor = e.target.value;
        setSelectedColorName(newColor);
        setSelectedSize(''); // Reset size when color changes

        // Auto-select first available size for the new color
        const newColorVariant = selectedProduct?.variants.find(v => v.colorName === newColor);
        if (newColorVariant?.sizes?.length > 0) {
            setSelectedSize(newColorVariant.sizes[0].size);
        }
    };

    return (
        <VStack spacing={8} align="stretch" px={{ base: 4, md: 8 }} py={8}>
            <Heading as="h1" size="2xl" color="brand.textLight" textAlign="center">Customize Your Apparel</Heading>
            
            {/* 1. Choose Your Apparel Section - now uses brand.paper background */}
            <Box bg="brand.paper" p={{base: 5, md: 8}} borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight">1. Choose Your Apparel</Heading>
                    {loading ? <Spinner size="xl" color="brand.accentYellow" /> :
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                        <FormControl><FormLabel color="brand.textLight">Product</FormLabel>
                            <ThemedSelect value={selectedProductId} onChange={handleProductChange} placeholder="Select Product">
                                {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </ThemedSelect>
                        </FormControl>
                        <FormControl><FormLabel color="brand.textLight">Color</FormLabel>
                            <ThemedSelect value={selectedColorName} onChange={handleColorChange} placeholder="Select Color" isDisabled={!selectedProductId}>
                                {uniqueColorVariants.map(c => <option key={c.colorName} value={c.colorName}>{c.colorName}</option>)}
                            </ThemedSelect>
                        </FormControl>
                        <FormControl><FormLabel color="brand.textLight">Size</FormLabel>
                            <ThemedSelect value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} placeholder="Select Size" isDisabled={!selectedColorName}>
                                {availableSizes.map(s => <option key={s.size} value={s.size}>{s.size}</option>)} {/* Changed key to s.size */}
                            </ThemedSelect>
                        </FormControl>
                    </SimpleGrid>
                    }
                </VStack>
            </Box>

            {/* 2. Choose Your Saved Design Section - now uses brand.paper background */}
            <Box bg="brand.paper" p={{base: 5, md: 8}} borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight">2. Choose Your Saved Design</Heading>
                    {loadingDesigns ? <Spinner size="xl" color="brand.accentYellow"/> : !designs.length ? (
                        <Text color="brand.textLight" fontSize="lg">You have no saved designs. <ChakraLink as={RouterLink} to="/generate" color="brand.accentYellow" fontWeight="bold">Generate one now!</ChakraLink></Text>
                    ) : (
                        <SimpleGrid columns={{ base: 2, sm: 3, md: 5, lg: 6 }} spacing={4}>
                            {designs.map(design => (
                                <Box key={design._id} p={1} bg={selectedDesign?._id === design._id ? "brand.accentYellow" : "brand.secondary"} borderWidth="3px" borderRadius="lg" onClick={() => setSelectedDesign(design)} cursor="pointer" borderColor={selectedDesign?._id === design._id ? "brand.accentYellow" : "transparent"} transition="border-color 0.2s ease-in-out">
                                    <Image src={design.imageDataUrl} borderRadius="md" objectFit="cover" /> {/* Added objectFit */}
                                </Box>
                            ))}
                        </SimpleGrid>
                    )}
                </VStack>
            </Box>
            
            {/* 3. Preview & Checkout Section - now uses brand.paper background */}
            <Box bg="brand.paper" p={{base: 5, md: 8}} borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight" textAlign="center">3. Preview & Checkout</Heading>
                    <Box w="400px" h="400px" bg="brand.primary" mx="auto" borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.300"> {/* Changed bg to brand.primary */}
                        <canvas ref={canvasEl} />
                    </Box>
                    <VStack spacing={4} mt={4}>
                        <Text fontSize="xl" fontWeight="medium" color="brand.textLight">
                            {selectedProduct && selectedColorVariant && selectedSizeVariant
                                ? `Your design on a ${selectedSizeVariant.size} ${selectedColorVariant.colorName} ${selectedProduct.name}.`
                                : "Select product options to see preview."
                            }
                        </Text>
                        <Text fontSize="2xl" fontWeight="bold" color="brand.accentYellow">
                            {finalVariant && selectedProduct
                                ? `$${(selectedProduct.basePrice + (finalVariant.priceModifier || 0)).toFixed(2)}`
                                : "$0.00" // Default price if options not selected
                            }
                        </Text>
                        <Button colorScheme="brandAccentOrange" size="lg" onClick={handleProceedToCheckout} leftIcon={<Icon as={FaShoppingCart} />} isDisabled={!selectedDesign || !finalVariant}>Proceed to Checkout</Button>
                    </VStack>
                </VStack>
            </Box>
        </VStack>
    );
}
