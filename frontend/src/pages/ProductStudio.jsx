import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Heading, Text, VStack, Select, SimpleGrid, Image, Spinner, Alert,
    AlertIcon, Divider, useToast, Icon, Button, FormControl, FormLabel, Link as ChakraLink,
    Flex, Tooltip, AspectRatio, Input, InputGroup, InputRightElement, IconButton, RadioGroup, Stack,
    Popover, PopoverTrigger, PopoverContent, PopoverArrow, PopoverCloseButton, PopoverHeader, PopoverBody,
    Slider, SliderTrack, SliderFilledTrack, SliderThumb,
    NumberInput, NumberInputField, NumberInputStepper,
    NumberIncrementStepper, NumberDecrementStepper, HStack // Added HStack, NumberInputSteppers
} from '@chakra-ui/react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
// Added icons for new tools and controls
import { FaShoppingCart, FaTshirt, FaPalette, FaRulerVertical, FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight, FaFont, FaSquare, FaCircle, FaTrash, FaMousePointer, FaEyeDropper, FaPaintBrush, FaArrowsAltH, FaArrowsAltV } from 'react-icons/fa'; // FaArrowsAltH/V for center

// Reusable ThemedSelect for consistency
const ThemedSelect = (props) => (
    <Select
        size="lg"
        bg="brand.secondary" // Dark background for select field
        borderColor="whiteAlpha.300"
        color="brand.textLight" // Default text color in the field
        _placeholder={{ color: "brand.textMuted" }} // Muted light placeholder
        _hover={{ borderColor: "brand.accentYellow" }}
        focusBorderColor="brand.accentYellow"
        sx={{
            option: { // Style for options within the dropdown
                bg: 'brand.secondary', // Option background also dark
                color: 'brand.textLight', // Option text light
            },
            // CRITICAL FIX: Ensure the selected value's text is light.
            // Using !important as a last resort due to potential Chakra/browser specificity conflicts.
            '.chakra-select__field': {
                color: 'brand.textLight !important',
            },
            // Style for the dropdown arrow
            '.chakra-select__icon': {
                color: 'brand.textLight',
            },
        }}
        {...props}
    />
);

// New ThemedInput component for customization controls (for text input, color pickers etc.)
const ThemedControlInput = (props) => (
    <Input
        size="sm"
        bg="brand.secondary"
        borderColor="whiteAlpha.300"
        color="brand.textLight"
        _placeholder={{ color: "brand.textMuted" }}
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
    const [selectedColorName, setSelectedColorName] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedDesign, setSelectedDesign] = useState(null);
    const [currentMockupType, setCurrentMockupType] = useState('tee'); // 'tee' or 'man'

    // New states for customization tools (Text only, Shapes removed)
    const [textInputValue, setTextInputValue] = useState('');
    const [textColor, setTextColor] = useState('#FDF6EE'); // Default to brand.textLight
    const [fontSize, setFontSize] = useState(30);
    const [fontFamily, setFontFamily] = useState('Montserrat'); // Default body font
    // Removed shapeFillColor state as shapes are removed
    // const [shapeFillColor, setShapeFillColor] = useState('#D16930');

    // Derived states based on selections
    const selectedProduct = products.find(p => p._id === selectedProductId);
    const uniqueColorVariants = selectedProduct ? [...new Map(selectedProduct.variants.map(v => [v.colorName, v])).values()] : [];
    const selectedColorVariant = selectedProduct?.variants.find(v => v.colorName === selectedColorName);
    const availableSizes = selectedColorVariant?.sizes?.filter(s => s.inStock) || [];
    const selectedSizeVariant = availableSizes.find(s => s.size === selectedSize);

    const finalVariant = selectedColorVariant && selectedSizeVariant
        ? { ...selectedColorVariant, ...selectedSizeVariant }
        : null;

    // Refs for Fabric.js Canvas
    const canvasEl = useRef(null);
    const fabricCanvas = useRef(null);
    const activeObjectRef = useRef(null); // Ref to store the currently active Fabric.js object

    // Canvas Initialization (runs once on mount)
    useEffect(() => {
        // Only initialize if window.fabric is available and canvas hasn't been initialized yet
        if (canvasEl.current && !fabricCanvas.current && window.fabric) {
            // Set canvas dimensions using an appropriate multiplier or fixed size for better quality
            // For example, 600x600 for display, might be multiplied for print.
            fabricCanvas.current = new window.fabric.Canvas(canvasEl.current, {
                width: 600, // Larger canvas for better working space
                height: 600, // Maintain aspect ratio
                backgroundColor: 'rgba(0,0,0,0)', // Transparent canvas background
            });

            // Event listeners for object selection (to track active object for tool controls)
            fabricCanvas.current.on('selection:created', (e) => activeObjectRef.current = e.target);
            fabricCanvas.current.on('selection:updated', (e) => activeObjectRef.current = e.target);
            fabricCanvas.current.on('selection:cleared', () => activeObjectRef.current = null);
        }

        // Cleanup function for Fabric.js
        return () => {
            if (fabricCanvas.current) {
                // Remove all event listeners first
                fabricCanvas.current.off('selection:created');
                fabricCanvas.current.off('selection:updated');
                fabricCanvas.current.off('selection:cleared');
                // Dispose the canvas to prevent memory leaks
                fabricCanvas.current.dispose();
                fabricCanvas.current = null;
            }
        };
    }, []); // Empty dependency array means this runs once on mount


    // Canvas Content Update (runs when finalVariant, currentMockupType, or selectedDesign changes)
    useEffect(() => {
        const FCanvas = fabricCanvas.current;
        if (!FCanvas || !window.fabric) return; // Ensure Fabric is loaded

        // Function to update background image based on selected mockup type and variant
        const updateCanvasBackground = (fabricInstance) => {
            // Define fallback logic for image selection
            const teeMockupImage = finalVariant?.imageSet?.find(img => img.url.includes('tee_') && !img.url.includes('man_'));
            const manMockupImage = finalVariant?.imageSet?.find(img => img.url.includes('man_'));
            const primaryImageFound = finalVariant?.imageSet?.find(img => img.isPrimary === true);
            const firstAvailableImage = finalVariant?.imageSet?.[0];

            let mockupSrc = '';
            if (currentMockupType === 'tee' && teeMockupImage) {
                mockupSrc = teeMockupImage.url;
            } else if (currentMockupType === 'man' && manMockupImage) {
                mockupSrc = manMockupImage.url;
            } else if (primaryImageFound) { // Fallback to primary if preferred type not found
                mockupSrc = primaryImageFound.url;
            } else if (firstAvailableImage) { // Ultimate fallback
                mockupSrc = firstAvailableImage.url;
            }

            if (mockupSrc) {
                fabricInstance.Image.fromURL(mockupSrc, (img) => {
                    // FIX: Ensure man_ image maintains aspect ratio and centers
                    FCanvas.setBackgroundImage(img, FCanvas.renderAll.bind(FCanvas), {
                        scaleX: FCanvas.width / img.width,
                        scaleY: FCanvas.height / img.height,
                        crossOrigin: 'anonymous',
                        selectable: false,
                        evented: false,
                        // --- FIX FOR STRETCHED IMAGE ---
                        alignX: 'center', // Center horizontally
                        alignY: 'center', // Center vertically
                        meetOrSlice: 'meet' // Scale down to fit without stretching
                        // --- END FIX ---
                    });
                }, { crossOrigin: 'anonymous' });
            } else {
                FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
            }
        };
        
        const pollForFabricAndSetupContent = () => {
            if (window.fabric) {
                updateCanvasBackground(window.fabric);

                // Handle selected design (add or update)
                // Remove previous design images to ensure only current selected design is present
                FCanvas.getObjects('image').filter(obj => obj.id?.startsWith('design-') || (obj.src && obj.src.startsWith('data:image'))).forEach(obj => FCanvas.remove(obj));
                
                if (selectedDesign?.imageDataUrl) {
                    // Check if the selected design is already on canvas, add it if not
                    const existingDesignObject = FCanvas.getObjects().find(obj => obj.id === `design-${selectedDesign._id}`);
                    if (!existingDesignObject) { // Only add if not already there
                        window.fabric.Image.fromURL(selectedDesign.imageDataUrl, (img) => {
                            if (!img) return;
                            img.id = `design-${selectedDesign._id}`; // Assign an ID for easy identification
                            img.scaleToWidth(FCanvas.width * 0.33); // Scale relative to new canvas size
                            img.set({
                                top: FCanvas.height * 0.24,
                                left: (FCanvas.width - img.getScaledWidth()) / 2,
                                hasControls: true, hasBorders: true, borderColor: 'brand.accentYellow',
                                cornerColor: 'brand.accentYellow', cornerSize: 8, transparentCorners: false,
                                lockMovementX: false, lockMovementY: false, lockRotation: false,
                                lockScalingX: false, lockScalingY: false, lockSkewingX: false, lockSkewingY: false,
                            });
                            FCanvas.add(img);
                            FCanvas.renderAll();
                            FCanvas.setActiveObject(img); // Make the new design active
                        }, { crossOrigin: 'anonymous' });
                    } else {
                        FCanvas.setActiveObject(existingDesignObject); // If already on canvas, just make it active
                        FCanvas.renderAll();
                    }
                } else {
                    // If no design is selected, ensure no design image is on canvas
                    FCanvas.renderAll();
                }

            } else {
                setTimeout(pollForFabricAndSetupContent, 100);
            }
        };
        pollForFabricAndSetupContent();

    }, [finalVariant, currentMockupType, selectedDesign]);


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
                toast({ title: "Error", description: "Could not load products for customization. Please try again later.", status: "error" });
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


    // --- Customization Tool Handlers (Fabric.js interactions) ---

    // Function to update properties of the active object (text/shape color/font/etc.)
    const updateActiveObject = useCallback((property, value) => {
        if (fabricCanvas.current && activeObjectRef.current) {
            activeObjectRef.current.set(property, value);
            fabricCanvas.current.renderAll();
        }
    }, []);

    const addTextToCanvas = useCallback(() => {
        if (!fabricCanvas.current || !textInputValue.trim()) {
            toast({ title: "Please enter text content.", status: "warning", isClosable: true });
            return;
        }
        const textObject = new window.fabric.IText(textInputValue, {
            left: (fabricCanvas.current.width / 2) - 100, // Center text roughly
            top: (fabricCanvas.current.height / 2) - 20,
            fill: textColor,
            fontSize: fontSize,
            fontFamily: fontFamily,
            hasControls: true, hasBorders: true, borderColor: 'brand.accentYellow',
            cornerColor: 'brand.accentYellow', cornerSize: 8, transparentCorners: false,
        });
        fabricCanvas.current.add(textObject);
        fabricCanvas.current.setActiveObject(textObject); // Make it active immediately
        fabricCanvas.current.renderAll();
        setTextInputValue(''); // Clear input after adding
    }, [textInputValue, textColor, fontSize, fontFamily]);

    // Removed addShapeToCanvas and shapeFillColor state

    const clearCanvas = useCallback(() => {
        if (fabricCanvas.current) {
            // Keep background image, remove all other objects (designs, text, shapes)
            fabricCanvas.current.getObjects().filter(obj => !obj.isType('Image') || obj.id?.startsWith('design-') || (obj.src && obj.src.startsWith('data:image'))).forEach(obj => fabricCanvas.current.remove(obj));
            fabricCanvas.current.renderAll();
            setSelectedDesign(null); // Deselect any chosen design
        }
    }, []);

    // Function to delete the currently selected Fabric.js object
    const deleteSelectedObject = useCallback(() => {
        if (fabricCanvas.current) {
            const activeObject = fabricCanvas.current.getActiveObject(); // Get the currently active object
            if (activeObject) {
                fabricCanvas.current.remove(activeObject);
                fabricCanvas.current.discardActiveObject(); // Clear selection
                fabricCanvas.current.renderAll();
                activeObjectRef.current = null; // Clear ref
                // If the deleted object was the selected AI design, deselect it
                if (selectedDesign && activeObject.id === `design-${selectedDesign._id}`) {
                    setSelectedDesign(null);
                }
            } else {
                toast({ title: "No object selected", description: "Select an object on the canvas to delete it.", status: "info", isClosable: true });
            }
        }
    }, [selectedDesign, toast]);

    // Function to center the currently selected Fabric.js object
    const centerSelectedObject = useCallback(() => {
        if (fabricCanvas.current && activeObjectRef.current) {
            activeObjectRef.current.centerH(); // Center horizontally
            activeObjectRef.current.centerV(); // Center vertically
            fabricCanvas.current.renderAll();
        } else {
            toast({ title: "No object selected", description: "Select an object on the canvas to center it.", status: "info", isClosable: true });
        }
    }, [toast]);


    const handleProceedToCheckout = useCallback(() => {
        // Check if there are ANY objects on the canvas beyond the background
        // The background image itself is an object, so we filter it out.
        const hasCustomizations = fabricCanvas.current && fabricCanvas.current.getObjects().some(obj => obj.type !== 'image' || (obj.id && obj.id.startsWith('design-')));

        if (!hasCustomizations) {
            toast({ title: "No customizations", description: "Please select a design or add custom elements.", status: "warning", isClosable: true });
            return;
        }
        if (!finalVariant) { toast({ title: "Please select all product options.", status: "warning", isClosable: true }); return; }
        
        // --- Generate Final Combined Image (Preview for Checkout/Order) ---
        // This generates a PNG of the entire canvas (mockup + all objects)
        const finalPreviewImage = fabricCanvas.current.toDataURL({
            format: 'png',
            quality: 1.0,
            multiplier: 1, // You might increase this multiplier (e.g., 2 or 3) for a higher-res preview image
        });

        // --- Generate Print-Ready Design (JUST the design/text/shapes, transparent background) ---
        // Create a temporary off-screen canvas just for the print-ready image
        const printReadyCanvas = new window.fabric.Canvas(null, {
            width: 1200, // Example: Target print dimensions (e.g., 300 DPI for a 4x4 inch design area)
            height: 1200,
            backgroundColor: 'rgba(0,0,0,0)', // Crucial for transparent background
        });

        // Clone and add only the customizable objects to the print-ready canvas
        fabricCanvas.current.getObjects().filter(obj => 
            obj.type === 'i-text' || obj.id?.startsWith('design-')
        ).forEach(obj => { // Filter for 'i-text' and 'design-' images only
            const clonedObj = window.fabric.util.object.clone(obj);
            // Position/scale for print-ready file might differ from display preview.
            // For simplicity, we'll center and scale it to fit the print canvas if possible.
            if (clonedObj.scaleToWidth) clonedObj.scaleToWidth(printReadyCanvas.width * 0.8); // Scale to 80% of print canvas
            // if (clonedObj.scaleToHeight) clonedObj.scaleToHeight(printReadyCanvas.height * 0.8); // Scale to 80% of print canvas

            clonedObj.set({
                left: (printReadyCanvas.width - clonedObj.getScaledWidth()) / 2,
                top: (printReadyCanvas.height - clonedObj.getScaledHeight()) / 2,
                hasControls: false, hasBorders: false, // Don't need controls on print file
            });
            printReadyCanvas.add(clonedObj);
        });
        printReadyCanvas.renderAll();
        const printReadyDesignDataUrl = printReadyCanvas.toDataURL({
            format: 'png', // PNG for transparency
            quality: 1.0,
            multiplier: 1, // This multiplier determines DPI. PODs often require 300 DPI.
        });
        printReadyCanvas.dispose(); // Clean up temporary canvas

        const primaryImage = finalVariant.imageSet?.find(img => img.isPrimary) || finalVariant.imageSet?.[0];
        const checkoutItem = {
            designId: selectedDesign?._2id || 'custom-design-' + Date.now(), // Unique ID for custom work
            productId: selectedProductId,
            productName: selectedProduct.name,
            variantSku: finalVariant.sku,
            size: finalVariant.size,
            color: finalVariant.colorName,
            prompt: selectedDesign?.prompt || "Customized design",
            imageDataUrl: finalPreviewImage, // This is the combined preview for display in checkout/order
            printReadyDataUrl: printReadyDesignDataUrl, // NEW: The high-res, transparent design for POD
            productImage: primaryImage?.url, // Original product image for context
            unitPrice: (selectedProduct.basePrice + (finalVariant.priceModifier || 0))
        };
        localStorage.setItem('itemToCheckout', JSON.stringify(checkoutItem));
        navigate('/checkout');
    }, [selectedDesign, finalVariant, selectedProductId, selectedProduct, navigate, toast]);
    
    // Handlers for dropdowns
    const handleProductChange = (e) => {
        const newProductId = e.target.value;
        setSelectedProductId(newProductId);
        setSelectedColorName(''); // Reset color and size when product changes
        setSelectedSize('');
        clearCanvas(); // Clear canvas when product changes

        const newSelectedProduct = products.find(p => p._id === newProductId);
        if (newSelectedProduct && newSelectedProduct.variants.length > 0) {
            const defaultColor = newSelectedProduct.variants.find(v => v.isDefaultDisplay) || newSelectedProduct.variants[0];
            setSelectedColorName(defaultColor.colorName);
            if (defaultColor.sizes?.length > 0) {
                setSelectedSize(defaultColor.sizes[0].size);
            }
        }
    };

    const handleColorChange = (e) => {
        const newColor = e.target.value;
        setSelectedColorName(newColor);
        setSelectedSize(''); // Reset size when color changes
        // No clearCanvas here, as color change implies working on same product design

        const newColorVariant = selectedProduct?.variants.find(v => v.colorName === newColor);
        if (newColorVariant?.sizes?.length > 0) {
            setSelectedSize(newColorVariant.sizes[0].size);
        }
    };

    const isCustomizeEnabled = selectedProductId && selectedColorName && selectedSize;

    return (
        <VStack spacing={8} align="stretch" px={{ base: 4, md: 8 }} py={8}>
            <Heading as="h1" size="2xl" color="brand.textLight" textAlign="center" mb={6}>Customize Your Apparel</Heading>
            
            {/* 1. Choose Your Apparel Section */}
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

            {/* 2. Choose Your Saved Design Section */}
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
            
            {/* 3. Customize & Preview Section */}
            <Box bg="brand.paper" p={{base: 5, md: 8}} borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight" textAlign="center"><Icon as={FaPaintBrush} mr={3} verticalAlign="middle"/>3. Customize & Preview</Heading>
                    
                    {/* Conditional Instructions */}
                    {!isCustomizeEnabled ? (
                        <Alert status="info" borderRadius="md" maxW="lg" mx="auto" bg="blue.900" borderWidth="1px" borderColor="blue.500">
                            <AlertIcon color="blue.300" />
                            <Text color="whiteAlpha.900">Please select a Product, Color, and Size in "Choose Your Apparel" above to enable customization.</Text>
                        </Alert>
                    ) : (
                        <Text color="brand.textMuted" textAlign="center" fontSize="md">
                            Drag, scale, and rotate your design. Add text from the tools below.
                        </Text>
                    )}

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
                        {/* Left Column: Canvas Preview */}
                        <VStack spacing={4} align="stretch">
                            {/* Mockup Toggle */}
                            <RadioGroup onChange={setCurrentMockupType} value={currentMockupType} isDisabled={!isCustomizeEnabled}>
                                <Stack direction="row" spacing={4} justifyContent="center" mb={4}>
                                    <Button size="sm" colorScheme={currentMockupType === 'tee' ? 'brandAccentYellow' : 'gray'} onClick={() => setCurrentMockupType('tee')}>Blank Tee</Button>
                                    <Button size="sm" colorScheme={currentMockupType === 'man' ? 'brandAccentYellow' : 'gray'} onClick={() => setCurrentMockupType('man')} isDisabled={!finalVariant || !finalVariant.imageSet?.some(img => img.url.includes('man_'))}>On Model</Button>
                                </Stack>
                            </RadioGroup>

                            {/* Canvas Container - made larger and responsive */}
                            <Box
                                maxW="800px" // Max width to ensure it doesn't get too huge on very wide screens
                                w="100%" // Width 100% of its parent column, will scale down on small screens
                                aspectRatio={1 / 1} // Maintain square aspect ratio
                                bg="brand.primary"
                                mx="auto" // Center horizontally
                                borderRadius="md"
                                borderWidth="1px"
                                borderColor="whiteAlpha.300"
                                overflow="hidden" // Ensure no overflow from canvas
                                position="relative" // For positioning canvas directly
                            >
                                {/* The canvas element will inherit 100% width/height from its parent Box */}
                                <canvas ref={canvasEl} style={{ width: '100%', height: '100%' }} />
                            </Box>
                            
                            <Button onClick={clearCanvas} leftIcon={<Icon as={FaTrash} />} colorScheme="red" variant="outline" size="sm" maxW="200px" mx="auto" isDisabled={!isCustomizeEnabled}>Clear All Customizations</Button>
                            <Button onClick={deleteSelectedObject} leftIcon={<Icon as={FaTrash} />} colorScheme="red" variant="outline" size="sm" maxW="200px" mx="auto" isDisabled={!isCustomizeEnabled}>Delete Selected Object</Button> {/* Delete selected object */}
                            <Button onClick={centerSelectedObject} leftIcon={<Icon as={FaArrowsAltH} />} colorScheme="gray" variant="outline" size="sm" maxW="200px" mx="auto" isDisabled={!isCustomizeEnabled}>Center Selected</Button> {/* NEW: Center selected object */}

                        </VStack>

                        {/* Right Column: Customization Tools */}
                        <VStack spacing={4} align="stretch" bg="brand.secondary" p={6} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.200" isDisabled={!isCustomizeEnabled}>
                            <Heading size="md" mb={2} color="brand.textLight">Add Text</Heading>
                            <FormControl isDisabled={!isCustomizeEnabled}>
                                <FormLabel fontSize="sm" color="brand.textLight">Text Content</FormLabel>
                                <ThemedControlInput
                                    value={textInputValue}
                                    onChange={(e) => setTextInputValue(e.target.value)}
                                    placeholder="Enter text..."
                                />
                            </FormControl>
                            <SimpleGrid columns={2} spacing={3}>
                                <FormControl isDisabled={!isCustomizeEnabled}>
                                    <FormLabel fontSize="sm" color="brand.textLight">Color</FormLabel>
                                    <InputGroup>
                                        <ThemedControlInput
                                            type="color"
                                            value={textColor}
                                            onChange={(e) => { setTextColor(e.target.value); updateActiveObject('fill', e.target.value); }}
                                            w="full"
                                            p={0}
                                            height="38px"
                                        />
                                        <InputRightElement width="3.5rem" pointerEvents="none">
                                            <Icon as={FaEyeDropper} color="brand.textMuted"/>
                                        </InputRightElement>
                                    </InputGroup>
                                </FormControl>
                                <FormControl isDisabled={!isCustomizeEnabled}>
                                    <FormLabel fontSize="sm" color="brand.textLight">Size</FormLabel>
                                    <NumberInput value={fontSize} onChange={(val) => { setFontSize(parseFloat(val)); updateActiveObject('fontSize', parseFloat(val)); }} min={10} max={100} size="md">
                                        <NumberInputField as={ThemedControlInput} />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper />
                                            <NumberDecrementStepper />
                                        </NumberInputStepper>
                                    </NumberInput>
                                </FormControl>
                            </SimpleGrid>
                            <FormControl isDisabled={!isCustomizeEnabled}>
                                <FormLabel fontSize="sm" color="brand.textLight">Font Family</FormLabel>
                                <ThemedSelect
                                    value={fontFamily}
                                    onChange={(e) => { setFontFamily(e.target.value); updateActiveObject('fontFamily', e.target.value); }}
                                    size="md"
                                    sx={{
                                        option: {
                                            bg: 'brand.secondary',
                                            color: 'brand.textLight',
                                        },
                                    }}
                                >
                                    <option value="Bungee">Bungee (Heading)</option>
                                    <option value="Montserrat">Montserrat (Body)</option>
                                    <option value="Arial">Arial</option>
                                    <option value="Verdana">Verdana</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Courier New">Courier New</option>
                                </ThemedSelect>
                            </FormControl>
                            <Button onClick={addTextToCanvas} leftIcon={<Icon as={FaFont} />} colorScheme="brandAccentYellow" size="sm" isDisabled={!textInputValue.trim() || !isCustomizeEnabled}>Add Text</Button>

                            {/* Removed Add Shapes section */}
                            {/* <Divider my={4} borderColor="whiteAlpha.300" />
                            <Heading size="md" mb={2} color="brand.textLight">Add Shapes</Heading>
                            <SimpleGrid columns={2} spacing={3}>
                                <FormControl isDisabled={!isCustomizeEnabled}>
                                    <FormLabel fontSize="sm" color="brand.textLight">Fill Color</FormLabel>
                                    <InputGroup>
                                        <ThemedControlInput
                                            type="color"
                                            value={shapeFillColor}
                                            onChange={(e) => { setShapeFillColor(e.target.value); updateActiveObject('fill', e.target.value); }}
                                            w="full"
                                            p={0}
                                            height="38px"
                                        />
                                        <InputRightElement width="3.5rem" pointerEvents="none">
                                            <Icon as={FaEyeDropper} color="brand.textMuted"/>
                                        </InputRightElement>
                                    </InputGroup>
                                </FormControl>
                                <Box> {} </Box>
                            </SimpleGrid>
                            <HStack>
                                <Button onClick={() => addShapeToCanvas('rect')} leftIcon={<Icon as={FaSquare} />} colorScheme="brandAccentYellow" size="sm" isDisabled={!isCustomizeEnabled}>Add Rectangle</Button>
                                <Button onClick={() => addShapeToCanvas('circle')} leftIcon={<Icon as={FaCircle} />} colorScheme="brandAccentYellow" size="sm" isDisabled={!isCustomizeEnabled}>Add Circle</Button>
                            </HStack> */}

                        </VStack>
                    </SimpleGrid>

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
