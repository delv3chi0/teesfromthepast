// frontend/src/pages/ProductStudio.jsx (ROLLED BACK TO A SIMPLER, STABLE VERSION)

import { useState, useEffect, useRef } from 'react'; // Removed useCallback
import {
    Box, Heading, Text, VStack, Select, SimpleGrid, Image, Spinner, Alert,
    AlertIcon, Divider, useToast, Icon, Button, FormControl, FormLabel, Link as ChakraLink
    // Removed all new Chakra UI components related to customization tools and granular controls
} from '@chakra-ui/react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart, FaTshirt, FaPalette, FaPaintBrush } from 'react-icons/fa'; // Simplified icons: FaTshirt, FaPalette, FaPaintBrush for sections

// Reusable ThemedSelect (simplified to avoid complex styling conflicts for now)
const ThemedSelect = (props) => (
    <Select
        size="lg"
        bg="brand.secondary" // Dark background for select field
        borderColor="whiteAlpha.300"
        color="brand.textLight" // Explicitly set color for displayed text
        _placeholder={{ color: "brand.textMuted" }}
        _hover={{ borderColor: "brand.accentYellow" }}
        focusBorderColor="brand.accentYellow"
        sx={{ // Basic option styling
            option: {
                bg: 'brand.secondary',
                color: 'brand.textLight',
            },
        }}
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
    const [selectedColorName, setSelectedColorName] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedDesign, setSelectedDesign] = useState(null);
    // Removed currentMockupType state and toggle UI, as we're simplifying the mockup display for now
    // The canvas will load the default primary image from the variant.

    // Removed states for customization tools (text input, color, font, etc.)
    // const [textInputValue, setTextInputValue] = useState('');
    // const [textColor, setTextColor] = useState('#FDF6EE');
    // const [fontSize, setFontSize] = useState(30);
    // const [fontFamily, setFontFamily] = useState('Montserrat');

    // Derived states based on selections
    const selectedProduct = products.find(p => p._id === selectedProductId);
    // Use unique color variants logic as it's safe and robust
    const uniqueColorVariants = selectedProduct ? [...new Map(selectedProduct.variants.map(v => [v.colorName, v])).values()] : [];
    const selectedColorVariant = selectedProduct?.variants.find(v => v.colorName === selectedColorName);
    const availableSizes = selectedColorVariant?.sizes?.filter(s => s.inStock) || [];
    const selectedSizeVariant = availableSizes.find(s => s.size === selectedSize);

    const finalVariant = selectedColorVariant && selectedSizeVariant
        ? { ...selectedColorVariant, ...selectedSizeVariant }
        : null;

    const canvasEl = useRef(null);
    const fabricCanvas = useRef(null);
    // Removed activeObjectRef, as we're not manipulating active objects yet.

    // Canvas Initialization & Content Update (Combined simplified useEffect)
    // This useEffect is streamlined to be as basic as possible to avoid the ReferenceError.
    useEffect(() => {
        const initializeAndRenderCanvas = () => {
            if (canvasEl.current && !fabricCanvas.current && window.fabric) {
                // Initialize canvas only once
                fabricCanvas.current = new window.fabric.Canvas(canvasEl.current, {
                    width: 400, // Smaller, fixed size for simplicity in rollback
                    height: 400,
                    backgroundColor: 'rgba(0,0,0,0)',
                    selection: false, // Disable selection for now, no active object manipulation yet
                });
            }

            const FCanvas = fabricCanvas.current;
            if (!FCanvas || !window.fabric) {
                setTimeout(initializeAndRenderCanvas, 100); // Poll until fabric is ready
                return;
            }

            FCanvas.clear(); // Clear existing elements

            // Determine mockup source (Always use primary image of the selected variant)
            let mockupSrc = '';
            const primaryImage = finalVariant?.imageSet?.find(img => img.isPrimary) || finalVariant?.imageSet?.[0]; // Use optional chaining safely

            if (primaryImage?.url) { // Check if URL exists
                mockupSrc = primaryImage.url;
            }
            
            // Set Background Image
            if (mockupSrc) {
                window.fabric.Image.fromURL(mockupSrc, (img) => {
                    FCanvas.setBackgroundImage(img, FCanvas.renderAll.bind(FCanvas), {
                        scaleX: FCanvas.width / img.width,
                        scaleY: FCanvas.height / img.height,
                        crossOrigin: 'anonymous',
                        selectable: false,
                        evented: false,
                        alignX: 'center', // Keep centering
                        alignY: 'center',
                        meetOrSlice: 'meet' // Keep aspect ratio fix
                    });
                }, { crossOrigin: 'anonymous' });
            } else {
                FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
            }
            
            // Add selected design to canvas (if any)
            if (selectedDesign?.imageDataUrl) {
                window.fabric.Image.fromURL(selectedDesign.imageDataUrl, (img) => {
                    if (!img) return;
                    img.scaleToWidth(FCanvas.width * 0.33);
                    img.set({
                        top: FCanvas.height * 0.24,
                        left: (FCanvas.width - img.getScaledWidth()) / 2,
                        selectable: false, // Designs are not selectable in this basic version
                        evented: false, // Not interactive yet
                        hasControls: false, hasBorders: false,
                    });
                    FCanvas.add(img);
                    FCanvas.renderAll();
                }, { crossOrigin: 'anonymous' });
            }
        };
        initializeAndRenderCanvas(); // Start the canvas process

        // Cleanup for Fabric.js
        return () => {
            if (fabricCanvas.current) {
                fabricCanvas.current.dispose();
                fabricCanvas.current = null;
            }
        };
    }, [selectedDesign, finalVariant]); // Dependencies: rerender when design or variant changes


    // Fetch products and initialize selections from URL params
    useEffect(() => {
        setLoading(true);
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
                            setSelectedSize(initialColorVariant.sizes[0].size);
                        }
                    } else if (initialProduct?.variants?.length > 0) {
                        const defaultColor = initialProduct.variants.find(v => v.isDefaultDisplay) || initialProduct.variants[0];
                        setSelectedColorName(defaultColor.colorName);
                        if (defaultColor.sizes?.length > 0) {
                            setSelectedSize(defaultColor.sizes[0].size);
                        }
                    }
                }
            })
            .catch(err => {
                console.error("Failed to fetch products for Product Studio:", err);
                toast({ title: "Error", description: "Could not load products. Please try again later.", status: "error" });
            })
            .finally(() => setLoading(false));
    }, [location.search, toast]);

    // Fetch user designs
    useEffect(() => {
        if (user) {
            setLoadingDesigns(true);
            client.get('/mydesigns').then(res => setDesigns(res.data || [])).finally(() => setLoadingDesigns(false));
        } else {
            setDesigns([]);
            setLoadingDesigns(false);
        }
    }, [user, location, navigate]);

    // Removed all custom tool handlers (updateActiveObject, addTextToCanvas, clearCanvas, deleteSelectedObject, etc.)
    // These will be re-added one-by-one in subsequent steps.

    const handleProceedToCheckout = () => { // Simplified to remove complexity for rollback
        if (!selectedDesign) { toast({ title: "Please select a design.", status: "warning", isClosable: true }); return; }
        if (!finalVariant) { toast({ title: "Please select all product options.", status: "warning", isClosable: true }); return; }
        
        // Basic image capture for now, no print-ready generation in this rolled-back version
        // Fabric.js will capture the background image + the selectedDesign
        const finalPreviewImage = fabricCanvas.current ? fabricCanvas.current.toDataURL({ format: 'png', quality: 1.0, multiplier: 1 }) : null;

        const primaryImage = finalVariant.imageSet?.find(img => img.isPrimary) || finalVariant.imageSet?.[0];
        const checkoutItem = {
            designId: selectedDesign._id, // Always use selectedDesign ID
            productId: selectedProductId,
            productName: selectedProduct.name,
            variantSku: finalVariant.sku,
            size: finalVariant.size,
            color: finalVariant.colorName,
            prompt: selectedDesign.prompt,
            imageDataUrl: selectedDesign.imageDataUrl, // Use original design for now
            // printReadyDataUrl: printReadyDesignDataUrl, // Removed for rollback
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
        setSelectedColorName('');
        setSelectedSize('');
        // clearCanvas removed temporarily
    };

    const handleColorChange = (e) => {
        const newColor = e.target.value;
        setSelectedColorName(newColor);
        setSelectedSize('');
    };

    const isCustomizeEnabled = selectedProductId && selectedColorName && selectedSize;

    return (
        <VStack spacing={8} align="stretch" px={{ base: 4, md: 8 }} py={8}>
            <Heading as="h1" size="2xl" color="brand.textLight" textAlign="center" mb={6}>Customize Your Apparel</Heading>
            
            {/* 1. Choose Your Apparel Section (using brand.paper) */}
            <Box bg="brand.paper" p={{base: 5, md: 8}} borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight"><Icon as={FaTshirt} mr={3} verticalAlign="middle"/>1. Choose Your Apparel</Heading>
                    {loading ? <Spinner size="xl" color="brand.accentYellow" /> :
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                        <FormControl><FormLabel color="brand.textLight">Product</FormLabel>
                            <ThemedSelect value={selectedProductId} onChange={handleProductChange} placeholder="Select Product">
                                {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </ThemedSelect>
                        </FormControl>
                        <FormControl><FormLabel color="brand.textLight">Color</FormLabel>
                            <ThemedSelect value={selectedColorName} onChange={handleColorChange} placeholder="Select Color" isDisabled={!selectedProductId}>
                                {uniqueColorVariants.map(c => (
                                    <option key={c.colorName} value={c.colorName}>
                                        {c.colorName}
                                    </option>
                                ))}
                            </ThemedSelect>
                        </FormControl>
                        <FormControl><FormLabel color="brand.textLight">Size</FormLabel>
                            <ThemedSelect value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} placeholder="Select Size" isDisabled={!selectedColorName}>
                                {availableSizes.map(s => <option key={s.size} value={s.size}>{s.size}</option>)}
                            </ThemedSelect>
                        </FormControl>
                    </SimpleGrid>
                    }
                </VStack>
            </Box>

            {/* 2. Choose Your Saved Design Section (using brand.paper) */}
            <Box bg="brand.paper" p={{base: 5, md: 8}} borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight"><Icon as={FaPalette} mr={3} verticalAlign="middle"/>2. Choose Your Saved Design</Heading>
                    {loadingDesigns ? <Spinner size="xl" color="brand.accentYellow"/> : !designs.length ? (
                        <Text color="brand.textLight" fontSize="lg">You have no saved designs. <ChakraLink as={RouterLink} to="/generate" color="brand.accentYellow" fontWeight="bold">Generate one now!</ChakraLink></Text>
                    ) : (
                        <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={4}>
                            {designs.map(design => (
                                <Tooltip key={design._id} label={design.prompt} placement="top" bg="gray.700" color="white" hasArrow>
                                    <Box
                                        p={1}
                                        bg="brand.secondary"
                                        borderWidth="3px"
                                        borderRadius="lg"
                                        onClick={() => setSelectedDesign(design)}
                                        cursor="pointer"
                                        borderColor={selectedDesign?._id === design._id ? "brand.accentYellow" : "transparent"}
                                        transition="all 0.2s ease-in-out"
                                        _hover={{ borderColor: selectedDesign?._id === design._id ? "brand.accentYellow" : "whiteAlpha.300", transform: 'scale(1.02)' }}
                                    >
                                        <AspectRatio ratio={1 / 1}>
                                            <Image src={design.imageDataUrl} borderRadius="md" objectFit="cover" alt={design.prompt} />
                                        </AspectRatio>
                                    </Box>
                                </Tooltip>
                            ))}
                        </SimpleGrid>
                    )}
                </VStack>
            </Box>
            
            {/* 3. Customize & Preview Section (using brand.paper) */}
            <Box bg="brand.paper" p={{base: 5, md: 8}} borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight" textAlign="center"><Icon as={FaPaintBrush} mr={3} verticalAlign="middle"/>3. Customize & Preview</Heading>
                    
                    {!isCustomizeEnabled ? (
                        <Alert status="info" borderRadius="md" maxW="lg" mx="auto" bg="blue.900" borderWidth="1px" borderColor="blue.500">
                            <AlertIcon color="blue.300" />
                            <Text color="whiteAlpha.900">Please select a Product, Color, and Size in "Choose Your Apparel" above to enable customization.</Text>
                        </Alert>
                    ) : (
                        // Simplified canvas preview area for rollback
                        <VStack spacing={4} align="stretch">
                            <Box
                                maxW="400px" // Smaller fixed size for rollback
                                w="100%"
                                aspectRatio={1 / 1}
                                bg="brand.primary"
                                mx="auto"
                                borderRadius="md"
                                borderWidth="1px"
                                borderColor="whiteAlpha.300"
                                overflow="hidden"
                                position="relative"
                            >
                                <canvas ref={canvasEl} style={{ width: '100%', height: '100%' }} />
                            </Box>
                        </VStack>
                    )}

                    <Divider my={6} borderColor="whiteAlpha.300"/>

                    {/* Final Preview & Checkout */}
                    <VStack spacing={4} mt={4}>
                        <Text fontSize="xl" fontWeight="medium" color="brand.textLight" textAlign="center">
                            {selectedProduct && selectedColorVariant && selectedSizeVariant
                                ? `Your design on a ${selectedSizeVariant.size} ${selectedColorVariant.colorName} ${selectedProduct.name}.`
                                : "Select an apparel option and a design above to see your creation."
                            }
                        </Text>
                        <Text fontSize="3xl" fontWeight="extrabold" color="brand.accentYellow">
                            {finalVariant && selectedProduct
                                ? `$${(selectedProduct.basePrice + (finalVariant.priceModifier || 0)).toFixed(2)}`
                                : "$0.00"
                            }
                        </Text>
                        <Button colorScheme="brandAccentOrange" size="lg" onClick={handleProceedToCheckout} leftIcon={<Icon as={FaShoppingCart} />} isDisabled={!finalVariant || (fabricCanvas.current && fabricCanvas.current.getObjects().length === 1 && !selectedDesign)} width="full" maxW="md">Proceed to Checkout</Button>
                    </VStack>
                </VStack>
            </Box>
        </VStack>
    );
}
