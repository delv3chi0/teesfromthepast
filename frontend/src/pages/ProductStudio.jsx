import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Heading, Text, VStack, Select, SimpleGrid, Image, Spinner, Alert,
    AlertIcon, Divider, useToast, Icon, Button, FormControl, FormLabel, Link as ChakraLink,
    Flex, Tooltip, AspectRatio, Input, InputGroup, InputRightElement, IconButton, RadioGroup, Stack,
    Popover, PopoverTrigger, PopoverContent, PopoverArrow, PopoverCloseButton, PopoverHeader, PopoverBody,
    Slider, SliderTrack, SliderFilledTrack, SliderThumb,
    NumberInput, NumberInputField, NumberInputStepper,
    NumberIncrementStepper, NumberDecrementStepper, HStack
} from '@chakra-ui/react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart, FaTshirt, FaPalette, FaRulerVertical, FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight, FaFont, FaSquare, FaCircle, FaTrash, FaMousePointer, FaEyeDropper, FaPaintBrush, FaArrowsAltH, FaArrowsAltV, FaArrowUp, FaArrowDown, FaArrowLeft, FaArrowRight, FaLayerGroup, FaPlusSquare, FaMinusSquare } from 'react-icons/fa';

// Reusable ThemedSelect for consistency
const ThemedSelect = (props) => (
    <Select
        size="lg"
        bg="brand.secondary"
        borderColor="whiteAlpha.300"
        _hover={{ borderColor: "brand.accentYellow" }}
        focusBorderColor="brand.accentYellow"
        {...props}
    />
);

// New ThemedInput component for customization controls
const ThemedControlInput = (props) => (
    <Input
        size="sm"
        bg="brand.secondary"
        borderColor="whiteAlpha.300"
        _hover={{ borderColor: "brand.accentYellow" }}
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
    // REMOVED 'man_' mockup option from state. Only 'tee' is supported now.
    const [currentMockupType, setCurrentMockupType] = useState('tee');

    // States for customization tools (Text only)
    const [textInputValue, setTextInputValue] = useState('');
    const [textColor, setTextColor] = useState('#FDF6EE');
    const [fontSize, setFontSize] = useState(30);
    const [fontFamily, setFontFamily] = useState('Montserrat');

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
    const activeObjectRef = useRef(null);

    // Canvas Initialization (runs once on mount)
    useEffect(() => {
        if (canvasEl.current && !fabricCanvas.current && window.fabric) {
            const canvasWidth = 600;
            const canvasHeight = 600;

            fabricCanvas.current = new window.fabric.Canvas(canvasEl.current, {
                width: canvasWidth,
                height: canvasHeight,
                backgroundColor: 'rgba(0,0,0,0)',
                selection: true, // Ensure canvas selection is enabled
            });

            fabricCanvas.current.on('selection:created', (e) => activeObjectRef.current = e.target);
            fabricCanvas.current.on('selection:updated', (e) => activeObjectRef.current = e.target);
            fabricCanvas.current.on('selection:cleared', () => activeObjectRef.current = null);

            const handleKeyDown = (e) => {
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                        return;
                    }
                    deleteSelectedObject();
                }
            };
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            if (fabricCanvas.current) {
                fabricCanvas.current.off('selection:created');
                fabricCanvas.current.off('selection:updated');
                fabricCanvas.current.off('selection:cleared');
                fabricCanvas.current.dispose();
                fabricCanvas.current = null;
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, [deleteSelectedObject]);


    // Canvas Content Update (mockup and design)
    useEffect(() => {
        const FCanvas = fabricCanvas.current;
        if (!FCanvas || !window.fabric) return;

        const updateCanvasBackground = (fabricInstance) => {
            // FIX FOR 'xe' / 'ie' error: Consolidate mockupSrc determination for explicit flow
            let mockupSrc = '';
            
            // Prioritize 'tee_' image if available
            const teeMockupImage = finalVariant?.imageSet?.find(img => img.url.includes('tee_') && !img.url.includes('man_'));
            if (teeMockupImage) {
                mockupSrc = teeMockupImage.url;
            } else {
                // Fallback to primary image
                const primaryImageFound = finalVariant?.imageSet?.find(img => img.isPrimary === true);
                if (primaryImageFound) {
                    mockupSrc = primaryImageFound.url;
                } else {
                    // Fallback to man_ image if tee_ and primary not available
                    const manMockupImage = finalVariant?.imageSet?.find(img => img.url.includes('man_'));
                    if (manMockupImage) {
                        mockupSrc = manMockupImage.url;
                    } else {
                        // Ultimate fallback to the very first image in the set
                        const firstAvailableImage = finalVariant?.imageSet?.[0];
                        if (firstAvailableImage) {
                            mockupSrc = firstAvailableImage.url;
                        }
                    }
                }
            }

            if (mockupSrc) {
                fabricInstance.Image.fromURL(mockupSrc, (img) => {
                    FCanvas.setBackgroundImage(img, FCanvas.renderAll.bind(FCanvas), {
                        scaleX: FCanvas.width / img.width,
                        scaleY: FCanvas.height / img.height,
                        crossOrigin: 'anonymous',
                        selectable: false,
                        evented: false,
                        alignX: 'center',
                        alignY: 'center',
                        meetOrSlice: 'meet' // Ensure aspect ratio is maintained
                    });
                }, { crossOrigin: 'anonymous' });
            } else {
                FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
            }
        };
        
        const pollForFabricAndSetupContent = () => {
            if (window.fabric) {
                updateCanvasBackground(window.fabric);

                FCanvas.getObjects('image').filter(obj => obj.id?.startsWith('design-') || (obj.src && obj.src.startsWith('data:image'))).forEach(obj => FCanvas.remove(obj));
                
                if (selectedDesign?.imageDataUrl) {
                    const existingDesignObject = FCanvas.getObjects().find(obj => obj.id === `design-${selectedDesign._id}`);
                    if (!existingDesignObject) {
                        window.fabric.Image.fromURL(selectedDesign.imageDataUrl, (img) => {
                            if (!img) return;
                            img.id = `design-${selectedDesign._id}`;
                            img.scaleToWidth(FCanvas.width * 0.33);
                            img.set({
                                top: FCanvas.height * 0.24,
                                left: (FCanvas.width - img.getScaledWidth()) / 2,
                                hasControls: true, hasBorders: true, borderColor: 'brand.accentYellow',
                                cornerColor: 'brand.accentYellow', cornerSize: 8, transparentCorners: false,
                                lockMovementX: false, lockMovementY: false, lockRotation: false,
                                lockScalingX: false, lockScalingY: false, lockSkewingX: false, lockSkewingY: false,
                                selectable: true,
                            });
                            FCanvas.add(img);
                            img.sendToBack(); // Ensure design image is behind text objects
                            FCanvas.renderAll();
                            FCanvas.setActiveObject(img);
                        }, { crossOrigin: 'anonymous' });
                    } else {
                        FCanvas.setActiveObject(existingDesignObject);
                        existingDesignObject.sendToBack(); // Ensure it's sent to back if already there
                        FCanvas.renderAll();
                    }
                } else {
                    FCanvas.renderAll();
                }

            } else {
                setTimeout(pollForFabricAndSetupContent, 100);
            }
        };
        pollForFabricAndSetupContent();

    }, [finalVariant, selectedDesign]); // Removed currentMockupType from dependencies because toggle logic is gone from display


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

    // Function to update properties of the active object (text color/font/size)
    const updateActiveObject = useCallback((property, value) => {
        if (fabricCanvas.current) {
            const activeObject = fabricCanvas.current.getActiveObject();
            if (activeObject) {
                if (activeObject.type === 'i-text' || activeObject.type === 'text') {
                     activeObject.set(property, value);
                     fabricCanvas.current.renderAll();
                } else {
                    toast({ title: "Property not applicable", description: "Select a text object to update its font or size.", status: "info", isClosable: true });
                }
            } else {
                toast({ title: "No object selected", description: "Select text or a design on the canvas to update its properties.", status: "info", isClosable: true });
            }
        }
    }, [toast]);

    const addTextToCanvas = useCallback(() => {
        if (!fabricCanvas.current || !textInputValue.trim()) {
            toast({ title: "Please enter text content.", status: "warning", isClosable: true });
            return;
        }
        const textObject = new window.fabric.IText(textInputValue, {
            left: (fabricCanvas.current.width / 2) - (textInputValue.length * (fontSize / 4)),
            top: (fabricCanvas.current.height / 2) + 50, // Default text placement below image center
            fill: textColor,
            fontSize: fontSize,
            fontFamily: fontFamily,
            hasControls: true, hasBorders: true, borderColor: 'brand.accentYellow',
            cornerColor: 'brand.accentYellow', cornerSize: 8, transparentCorners: false,
            selectable: true,
        });
        fabricCanvas.current.add(textObject);
        fabricCanvas.current.setActiveObject(textObject);
        fabricCanvas.current.renderAll();
        setTextInputValue('');
    }, [textInputValue, textColor, fontSize, fontFamily, toast]);

    const clearCanvas = useCallback(() => {
        if (fabricCanvas.current) {
            fabricCanvas.current.getObjects().filter(obj => obj !== fabricCanvas.current.backgroundImage).forEach(obj => fabricCanvas.current.remove(obj));
            fabricCanvas.current.renderAll();
            setSelectedDesign(null);
            activeObjectRef.current = null;
        }
    }, []);

    // Function to delete the currently selected Fabric.js object
    const deleteSelectedObject = useCallback(() => {
        if (fabricCanvas.current) {
            const activeObject = fabricCanvas.current.getActiveObject();
            if (activeObject) {
                if (activeObject === fabricCanvas.current.backgroundImage) {
                    toast({ title: "Cannot delete background", description: "The product image cannot be deleted.", status: "info", isClosable: true });
                    return;
                }
                fabricCanvas.current.remove(activeObject);
                fabricCanvas.current.discardActiveObject();
                fabricCanvas.current.renderAll();
                activeObjectRef.current = null;
                if (selectedDesign && activeObject.id === `design-${selectedDesign._id}`) {
                    setSelectedDesign(null);
                }
            } else {
                toast({ title: "No object selected", description: "Select text or a design on the canvas to delete it.", status: "info", isClosable: true });
            }
        }
    }, [selectedDesign, toast]);

    // Function to center the currently selected Fabric.js object (only horizontally)
    const centerObjectHorizontally = useCallback(() => {
        if (fabricCanvas.current) {
            const activeObject = fabricCanvas.current.getActiveObject();
            if (activeObject) {
                activeObject.centerH(); // Center horizontally
                //activeObject.centerV(); // Removed vertical centering
                fabricCanvas.current.renderAll();
            } else {
                toast({ title: "No object selected", description: "Select text or a design on the canvas to center it horizontally.", status: "info", isClosable: true });
            }
        }
    }, [toast]);

    // Function to move selected object by a small amount
    const nudgeObject = useCallback((direction, amount = 5) => {
        if (fabricCanvas.current) {
            const activeObject = fabricCanvas.current.getActiveObject();
            if (activeObject) {
                switch (direction) {
                    case 'up': activeObject.set({ top: activeObject.top - amount }); break;
                    case 'down': activeObject.set({ top: activeObject.top + amount }); break;
                    case 'left': activeObject.set({ left: activeObject.left - amount }); break;
                    case 'right': activeObject.set({ left: activeObject.left + amount }); break;
                    default: break;
                }
                activeObject.setCoords(); // Update object's coordinates after moving
                fabricCanvas.current.renderAll();
            } else {
                toast({ title: "No object selected", description: "Select text or a design to move it.", status: "info", isClosable: true });
            }
        }
    }, [toast]);

    // Function to toggle between objects (next/previous in z-order)
    const toggleObjectSelection = useCallback((direction) => {
        if (!fabricCanvas.current) return;

        // Filter out background image and non-selectable objects
        const objects = fabricCanvas.current.getObjects().filter(obj => obj !== fabricCanvas.current.backgroundImage && obj.selectable);
        if (objects.length === 0) {
            toast({ title: "No selectable objects", description: "No designs or text elements to toggle.", status: "info", isClosable: true });
            return;
        }

        const activeObject = fabricCanvas.current.getActiveObject();
        let currentIndex = activeObject ? objects.indexOf(activeObject) : -1; // Find current index
        let newIndex;

        if (direction === 'next') {
            newIndex = (currentIndex + 1) % objects.length;
        } else if (direction === 'prev') {
            newIndex = (currentIndex - 1 + objects.length) % objects.length; // Ensure positive index
        } else {
            newIndex = 0; // Default to first if no active or invalid direction
        }

        fabricCanvas.current.setActiveObject(objects[newIndex]);
        fabricCanvas.current.renderAll();
    }, [toast]);

    // Function to change object layer (bring to front or send to back)
    const changeObjectLayer = useCallback((layerAction) => {
        if (fabricCanvas.current) {
            const activeObject = fabricCanvas.current.getActiveObject();
            if (activeObject) {
                if (activeObject === fabricCanvas.current.backgroundImage) {
                    toast({ title: "Cannot change layer", description: "The product image layer cannot be modified.", status: "info", isClosable: true });
                    return;
                }

                if (layerAction === 'bringToFront') {
                    activeObject.bringToFront();
                } else if (layerAction === 'sendToBack') {
                    activeObject.sendToBack();
                    // After sending to back, ensure it's still above the background image
                    if (fabricCanvas.current.getObjects()[0] === activeObject) {
                        activeObject.bringForward();
                    }
                }
                fabricCanvas.current.renderAll();
            } else {
                toast({ title: "No object selected", description: "Select an object to change its layer.", status: "info", isClosable: true });
            }
        }
    }, [toast]);


    const handleProceedToCheckout = useCallback(() => {
        const hasCustomizations = fabricCanvas.current && fabricCanvas.current.getObjects().some(obj => obj.type !== 'image' || (obj.id && obj.id.startsWith('design-')));

        if (!hasCustomizations) {
            toast({ title: "No customizations", description: "Please select a design or add custom elements.", status: "warning", isClosable: true });
            return;
        }
        if (!finalVariant) { toast({ title: "Please select all product options.", status: "warning", isClosable: true }); return; }
        
        const finalPreviewImage = fabricCanvas.current.toDataURL({
            format: 'png',
            quality: 1.0,
            multiplier: 1,
        });

        const printReadyCanvas = new window.fabric.Canvas(null, {
            width: 1200,
            height: 1200,
            backgroundColor: 'rgba(0,0,0,0)',
        });

        fabricCanvas.current.getObjects().filter(obj => 
            obj.type === 'i-text' || obj.id?.startsWith('design-')
        ).forEach(obj => {
            const clonedObj = window.fabric.util.object.clone(obj);
            if (clonedObj.scaleToWidth) clonedObj.scaleToWidth(printReadyCanvas.width * 0.8);

            clonedObj.set({
                left: (printReadyCanvas.width - clonedObj.getScaledWidth()) / 2,
                top: (printReadyCanvas.height - clonedObj.getScaledHeight()) / 2,
                hasControls: false, hasBorders: false,
            });
            printReadyCanvas.add(clonedObj);
        });
        printReadyCanvas.renderAll();
        const printReadyDesignDataUrl = printReadyCanvas.toDataURL({
            format: 'png',
            quality: 1.0,
            multiplier: 1,
        });
        printReadyCanvas.dispose();

        const primaryImage = finalVariant.imageSet?.find(img => img.isPrimary) || finalVariant.imageSet?.[0];
        const checkoutItem = {
            designId: selectedDesign?._id || 'custom-design-' + Date.now(),
            productId: selectedProductId,
            productName: selectedProduct.name,
            variantSku: finalVariant.sku,
            size: finalVariant.size,
            color: finalVariant.colorName,
            prompt: selectedDesign?.prompt || "Customized design",
            imageDataUrl: finalPreviewImage,
            printReadyDataUrl: printReadyDesignDataUrl,
            productImage: primaryImage?.url,
            unitPrice: (selectedProduct.basePrice + (finalVariant.priceModifier || 0))
        };
        localStorage.setItem('itemToCheckout', JSON.stringify(checkoutItem));
        navigate('/checkout');
    }, [selectedDesign, finalVariant, selectedProductId, selectedProduct, navigate, toast]);
    
    // Handlers for dropdowns
    const handleProductChange = (e) => {
        const newProductId = e.target.value;
        setSelectedProductId(newProductId);
        setSelectedColorName('');
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
        setSelectedSize('');

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
                            {/* Mockup Toggle (man_ removed) */}
                            <RadioGroup onChange={setCurrentMockupType} value={currentMockupType} isDisabled={!isCustomizeEnabled}>
                                <Stack direction="row" spacing={4} justifyContent="center" mb={4}>
                                    <Button size="sm" colorScheme={currentMockupType === 'tee' ? 'brandAccentYellow' : 'gray'} onClick={() => setCurrentMockupType('tee')}>Blank Tee</Button>
                                    {/* Removed 'On Model' button */}
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
                            
                            {/* Canvas Control Buttons */}
                            <HStack justifyContent="center" spacing={2} maxW="full" flexWrap="wrap">
                                <Button onClick={clearCanvas} leftIcon={<Icon as={FaTrash} />} colorScheme="red" variant="outline" size="sm" isDisabled={!isCustomizeEnabled}>Clear All</Button>
                                <Button onClick={deleteSelectedObject} leftIcon={<Icon as={FaTrash} />} colorScheme="red" variant="outline" size="sm" isDisabled={!isCustomizeEnabled}>Delete Selected</Button>
                            </HStack>
                            <HStack justifyContent="center" spacing={2} maxW="full" flexWrap="wrap">
                                {/* Center & Nudge Buttons */}
                                <Button onClick={centerObjectHorizontally} leftIcon={<Icon as={FaArrowsAltH} />} colorScheme="gray" variant="outline" size="sm" isDisabled={!isCustomizeEnabled}>Center Horizontally</Button>
                                <Button onClick={() => nudgeObject('up')} leftIcon={<Icon as={FaArrowUp} />} colorScheme="gray" variant="outline" size="sm" isDisabled={!isCustomizeEnabled}>Nudge Up</Button>
                                <Button onClick={() => nudgeObject('down')} leftIcon={<Icon as={FaArrowDown} />} colorScheme="gray" variant="outline" size="sm" isDisabled={!isCustomizeEnabled}>Nudge Down</Button>
                                <Button onClick={() => nudgeObject('left')} leftIcon={<Icon as={FaArrowLeft} />} colorScheme="gray" variant="outline" size="sm" isDisabled={!isCustomizeEnabled}>Nudge Left</Button>
                                <Button onClick={() => nudgeObject('right')} leftIcon={<Icon as={FaArrowRight} />} colorScheme="gray" variant="outline" size="sm" isDisabled={!isCustomizeEnabled}>Nudge Right</Button>
                            </HStack>
                            {/* Object Layering & Toggle Buttons */}
                            <HStack justifyContent="center" spacing={2} maxW="full" flexWrap="wrap">
                                <Button onClick={() => changeObjectLayer('bringToFront')} leftIcon={<Icon as={FaLayerGroup} />} colorScheme="gray" variant="outline" size="sm" isDisabled={!isCustomizeEnabled}>Bring Front</Button>
                                <Button onClick={() => changeObjectLayer('sendToBack')} leftIcon={<Icon as={FaLayerGroup} />} colorScheme="gray" variant="outline" size="sm" isDisabled={!isCustomizeEnabled}>Send Back</Button>
                                <Button onClick={() => toggleObjectSelection('next')} leftIcon={<Icon as={FaMousePointer} />} colorScheme="gray" variant="outline" size="sm" isDisabled={!isCustomizeEnabled}>Select Next</Button>
                                <Button onClick={() => toggleObjectSelection('prev')} leftIcon={<Icon as={FaMousePointer} />} colorScheme="gray" variant="outline" size="sm" isDisabled={!isCustomizeEnabled}>Select Prev</Button>
                            </HStack>
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
