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
import { useAuth } from '../context/AuthProvider'; // Corrected import path
import { FaShoppingCart, FaTshirt, FaPalette, FaFont, FaTrash, FaEyeDropper, FaPaintBrush, FaArrowsAltH } from 'react-icons/fa';

// Reusable ThemedSelect for consistency
const ThemedSelect = (props) => (
    <Select
        size="lg"
        bg="brand.secondary" // Dark background for select field
        borderColor="whiteAlpha.300"
        _hover={{ borderColor: "brand.accentYellow" }}
        focusBorderColor="brand.accentYellow"
        {...props}
    />
);

// New ThemedInput component for customization controls (for text input, color pickers etc.)
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

    // --- State Declarations ---
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [designs, setDesigns] = useState([]);
    const [loadingDesigns, setLoadingDesigns] = useState(true);

    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedColorName, setSelectedColorName] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedDesign, setSelectedDesign] = useState(null);
    const [currentMockupType, setCurrentMockupType] = useState('tee'); // 'tee' or 'man'

    // States for customization tools (reflect properties of ACTIVE text object)
    const [textInputValue, setTextInputValue] = useState(''); // Only for adding new text
    const [textColor, setTextColor] = useState('#FDF6EE'); // Default, or actual active text color
    const [fontSize, setFontSize] = useState(30); // Default, or actual active text size
    const [fontFamily, setFontFamily] = useState('Montserrat'); // Default, or actual active text font

    // Refs for Fabric.js Canvas and the active object
    const canvasEl = useRef(null);
    const fabricCanvas = useRef(null);
    const activeObjectRef = useRef(null); // CRITICAL: This ref will hold the actual active Fabric.js object instance

    // --- Derived States ---
    const selectedProduct = products.find(p => p._id === selectedProductId);
    const uniqueColorVariants = selectedProduct ? [...new Map(selectedProduct.variants.map(v => [v.colorName, v])).values()] : [];
    const selectedColorVariant = selectedProduct?.variants.find(v => v.colorName === selectedColorName);
    const availableSizes = selectedColorVariant?.sizes?.filter(s => s.inStock) || [];
    const selectedSizeVariant = availableSizes.find(s => s.size === selectedSize);

    const finalVariant = selectedColorVariant && selectedSizeVariant
        ? { ...selectedColorVariant, ...selectedSizeVariant }
        : null;
    
    const hasSelectedDesign = selectedDesign !== null;
    const [hasCanvasObjects, setHasCanvasObjects] = useState(false);

    // Effect to update hasCanvasObjects state whenever canvas objects change
    useEffect(() => {
        const FCanvas = fabricCanvas.current;
        if (!FCanvas) return;

        const updateHasCanvasObjects = () => {
            const userAddedObjects = FCanvas.getObjects().filter(obj => 
                obj.type === 'i-text' || (obj.id && obj.id.startsWith('design-'))
            );
            setHasCanvasObjects(userAddedObjects.length > 0);
        };

        FCanvas.on('object:added', updateHasCanvasObjects);
        FCanvas.on('object:removed', updateHasCanvasObjects);
        FCanvas.on('selection:created', updateHasCanvasObjects); 
        FCanvas.on('selection:cleared', updateHasCanvasObjects); 
        
        updateHasCanvasObjects(); 

        return () => {
            FCanvas.off('object:added', updateHasCanvasObjects);
            FCanvas.off('object:removed', updateHasCanvasObjects);
            FCanvas.off('selection:created', updateHasCanvasObjects);
            FCanvas.off('selection:cleared', updateHasCanvasObjects);
        };
    }, [selectedDesign]);


    // --- Customization Tool Handlers (Fabric.js interactions) ---

    // This function directly updates the Fabric.js object and ensures selection persistence
    const updateFabricObjectProperty = useCallback((property, value) => {
        const FCanvas = fabricCanvas.current;
        const currentActiveObject = activeObjectRef.current; // Get the object from the ref

        if (!FCanvas || !currentActiveObject || currentActiveObject.type !== 'i-text') {
            return; // Only proceed if canvas and a text object are active
        }

        currentActiveObject.set(property, value);
        FCanvas.renderAll();
        // IMPORTANT: DO NOT call FCanvas.setActiveObject(currentActiveObject) here.
        // Let Fabric.js manage the selection naturally via its event system.
        // The selection:updated event should fire and keep activeObjectRef.current correct.
    }, []); // No dependencies here, as it operates on refs

    const addTextToCanvas = useCallback(() => {
        if (!fabricCanvas.current || !textInputValue.trim()) {
            toast({ title: "Please enter text content.", status: "warning", isClosable: true });
            return;
        }
        const textObject = new window.fabric.IText(textInputValue, {
            left: (fabricCanvas.current.width / 2),
            top: (fabricCanvas.current.height * 0.6), // 60% down for text
            originX: 'center',
            originY: 'center',
            fill: textColor,
            fontSize: fontSize,
            fontFamily: fontFamily,
            hasControls: true, hasBorders: true, borderColor: 'brand.accentYellow',
            cornerColor: 'brand.accentYellow', cornerSize: 8, transparentCorners: false,
        });
        fabricCanvas.current.add(textObject);
        fabricCanvas.current.setActiveObject(textObject); // Make newly added text active
        fabricCanvas.current.renderAll();
        setTextInputValue('');
    }, [textInputValue, textColor, fontSize, fontFamily, toast]);

    const clearCanvas = useCallback(() => {
        if (fabricCanvas.current) {
            fabricCanvas.current.getObjects().forEach(obj => {
                if (obj !== fabricCanvas.current.backgroundImage) {
                    fabricCanvas.current.remove(obj);
                }
            });
            fabricCanvas.current.renderAll();
            setSelectedDesign(null);
            fabricCanvas.current.discardActiveObject(); // Ensure no object is active after clear
            activeObjectRef.current = null; // Clear active ref
        }
    }, []);

    const deleteSelectedObject = useCallback(() => {
        if (fabricCanvas.current) {
            const activeObject = fabricCanvas.current.getActiveObject();
            if (activeObject) {
                fabricCanvas.current.remove(activeObject);
                fabricCanvas.current.discardActiveObject();
                fabricCanvas.current.renderAll();
                activeObjectRef.current = null; // Clear active ref
                if (selectedDesign && activeObject.id === `design-${selectedDesign._id}`) {
                    setSelectedDesign(null);
                }
            } else {
                toast({ title: "No object selected", description: "Select text or a design on the canvas to delete it.", status: "info", isClosable: true });
            }
        }
    }, [selectedDesign, toast]);

    const centerSelectedObject = useCallback(() => {
        if (fabricCanvas.current) {
            const activeObject = fabricCanvas.current.getActiveObject();
            if (activeObject) {
                activeObject.centerH(); // Only center horizontally
                fabricCanvas.current.renderAll();
            } else {
                toast({ title: "No object selected", description: "Select text or a design on the canvas to center it.", status: "info", isClosable: true });
            }
        }
    }, [toast]);

    const handleProceedToCheckout = useCallback(async () => {
        if (!finalVariant || (!hasSelectedDesign && !hasCanvasObjects)) {
            toast({
                title: "Incomplete Customization",
                description: "Please select a Product, Color, and Size, AND select a design or add custom text/elements.",
                status: "warning",
                isClosable: true
            });
            return;
        }

        // 1. Generate low-res preview image (for display in cart/order history)
        const finalPreviewImage = fabricCanvas.current.toDataURL({
            format: 'png',
            quality: 1.0,
            multiplier: 1, // At 600x600 resolution
        });

        // 2. Generate high-res print-ready image (for Printful)
        const PRINT_READY_WIDTH = 4500; // Corresponds to 15 inches at 300 DPI
        const PRINT_READY_HEIGHT = 5400; // Corresponds to 18 inches at 300 DPI

        const printReadyCanvas = new window.fabric.Canvas(null, {
            width: PRINT_READY_WIDTH,
            height: PRINT_READY_HEIGHT,
            backgroundColor: 'rgba(0,0,0,0)', // Transparent background for POD
        });

        const previewCanvasWidth = fabricCanvas.current.width;
        const previewCanvasHeight = fabricCanvas.current.height;

        const customizableObjects = fabricCanvas.current.getObjects().filter(obj =>
            obj.type === 'i-text' || (obj.id && obj.id.startsWith('design-'))
        );

        customizableObjects.forEach(obj => {
            const clonedObj = window.fabric.util.object.clone(obj);

            // Get original object's properties on the PREVIEW canvas
            const originalCenter = obj.getCenterPoint();
            const originalScaledWidth = obj.getScaledWidth();
            const originalScaledHeight = obj.getScaledHeight();
            const originalAngle = obj.angle; // Preserve rotation

            // Calculate overall scaling factor from preview canvas to print-ready canvas
            const scaleFactorCanvasWidth = PRINT_READY_WIDTH / previewCanvasWidth;
            const scaleFactorCanvasHeight = PRINT_READY_HEIGHT / previewCanvasHeight;
            const overallResolutionScale = Math.min(scaleFactorCanvasWidth, scaleFactorCanvasHeight); // Use min to avoid distortion if aspect ratios differ

            // Calculate the relative center position (0-1 range) from the PREVIEW canvas
            const relativeCenterX = originalCenter.x / previewCanvasWidth;
            const relativeCenterY = originalCenter.y / previewCanvasHeight;

            // Calculate the target center position on the PRINT_READY canvas
            const targetCenterX = relativeCenterX * PRINT_READY_WIDTH;
            const targetCenterY = relativeCenterY * PRINT_READY_HEIGHT;
            
            // Set scale to 1 on cloned object, and set width/height or fontSize directly
            // This ensures we don't compound scales and rely on absolute pixel values
            clonedObj.set({
                hasControls: false, hasBorders: false, // No controls on print file
                originX: obj.originX, // Maintain original origin setting
                originY: obj.originY, // Maintain original origin setting
                angle: originalAngle // Preserve rotation
            });

            if (clonedObj.type === 'i-text') {
                clonedObj.set({
                    fontSize: obj.fontSize * overallResolutionScale, // Scale font size directly
                    scaleX: 1, // Reset scale to 1 to prevent compounding
                    scaleY: 1,
                    left: targetCenterX, // Position using calculated center
                    top: targetCenterY,
                });
            } else { // For image objects (like selected designs)
                clonedObj.set({
                    width: originalScaledWidth * overallResolutionScale,
                    height: originalScaledHeight * overallResolutionScale,
                    scaleX: 1, // Reset scale to 1
                    scaleY: 1,
                    left: targetCenterX, // Position using calculated center
                    top: targetCenterY,
                });
            }
            printReadyCanvas.add(clonedObj);
        });
        printReadyCanvas.renderAll();
        const printReadyDesignDataUrl = printReadyCanvas.toDataURL({
            format: 'png',
            quality: 1.0, // High quality for print
            multiplier: 1, // Already at target resolution, no further scaling
        });
        printReadyCanvas.dispose(); // Clean up the temporary canvas

        // 3. Upload print-ready image to Cloudinary via backend
        let cloudinaryPublicUrl = '';
        try {
            toast({
                title: "Uploading design...",
                description: "Preparing your custom design for print. This may take a moment. Please do not close this window.",
                status: "info",
                duration: null, // Keep open until resolved
                isClosable: false,
                position: "top",
            });
            const uploadResponse = await client.post('/upload-print-file', {
                imageData: printReadyDesignDataUrl,
                designName: selectedDesign?.prompt || `${selectedProduct.name} Custom Design`,
            });
            cloudinaryPublicUrl = uploadResponse.data.publicUrl;
            toast.closeAll(); // Close previous toast
            toast({ title: "Design uploaded!", description: "Your custom design is ready.", status: "success", isClosable: true });
        } catch (error) {
            console.error("Error uploading print file to Cloudinary:", error);
            toast.closeAll(); // Close previous toast
            toast({
                title: "Upload Failed",
                description: "Could not upload your design for printing. Please try again.",
                status: "error",
                isClosable: true,
            });
            return; // Stop checkout process if upload fails
        }

        // 4. Prepare checkout item with the Cloudinary URL
        const primaryImage = finalVariant.imageSet?.find(img => img.isPrimary) || finalVariant.imageSet?.[0];
        const checkoutItem = {
            designId: selectedDesign?._id || 'custom-design-' + Date.now(),
            productId: selectedProductId,
            productName: selectedProduct.name,
            variantSku: finalVariant.sku,
            size: finalVariant.size,
            color: finalVariant.colorName,
            prompt: selectedDesign?.prompt || "Customized design",
            imageDataUrl: finalPreviewImage, // Low-res preview
            printReadyDataUrl: cloudinaryPublicUrl, // HIGH-RES CLOUDINARY URL
            productImage: primaryImage?.url,
            unitPrice: (selectedProduct.basePrice + (finalVariant.priceModifier || 0))
        };
        localStorage.setItem('itemToCheckout', JSON.stringify(checkoutItem));
        navigate('/checkout');
    }, [selectedDesign, finalVariant, selectedProductId, selectedProduct, navigate, toast, hasSelectedDesign, hasCanvasObjects]);


    // Handlers for dropdowns - use `useCallback` for consistency and stability
    const handleProductChange = useCallback((e) => {
        const newProductId = e.target.value;
        setSelectedProductId(newProductId);
        setSelectedColorName('');
        setSelectedSize('');
        clearCanvas();

        const newSelectedProduct = products.find(p => p._id === newProductId);
        if (newSelectedProduct && newSelectedProduct.variants.length > 0) {
            const defaultColor = newSelectedProduct.variants.find(v => v.isDefaultDisplay) || newSelectedProduct.variants[0];
            setSelectedColorName(defaultColor.colorName);
            if (defaultColor.sizes?.length > 0) {
                setSelectedSize(defaultColor.sizes[0].size);
            }
        }
    }, [products, clearCanvas]); // Dependencies

    const handleColorChange = useCallback((e) => {
        const newColor = e.target.value;
        setSelectedColorName(newColor);
        setSelectedSize('');

        const newColorVariant = selectedProduct?.variants.find(v => v.colorName === newColor);
        if (newColorVariant?.sizes?.length > 0) {
            setSelectedSize(newColorVariant.sizes[0].size);
        }
    }, [selectedProduct]); // Dependencies


    // --- Effects (Data Fetching and Canvas Initialization) ---

    // Canvas Initialization: Runs once to set up Fabric.js canvas and core event listeners
    useEffect(() => {
        if (canvasEl.current && !fabricCanvas.current && window.fabric) {
            const canvasWidth = 600;
            const canvasHeight = 600;

            fabricCanvas.current = new window.fabric.Canvas(canvasEl.current, {
                width: canvasWidth,
                height: canvasHeight,
                backgroundColor: 'rgba(0,0,0,0)',
                selection: true,
            });

            const FCanvas = fabricCanvas.current;

            // --- IMPORTANT: Fabric.js Event Listeners for UI Sync & Active Object Ref ---
            // These listeners keep `activeObjectRef.current` and the UI control states updated
            const handleSelectionChange = (e) => {
                const target = e.target;
                activeObjectRef.current = target; // Always update the ref with the active object instance

                if (target && target.type === 'i-text') {
                    // Update React states for text controls to reflect the selected object's properties
                    setTextColor(target.fill || '#FDF6EE');
                    setFontSize(target.fontSize || 30);
                    setFontFamily(target.fontFamily || 'Montserrat');
                } else {
                    // If a non-text object is selected or nothing is selected, controls will show default/last values.
                    // You could reset them here if desired.
                }
                // Update hasCanvasObjects state whenever selection changes (good for checkout button)
                const userAddedObjects = FCanvas.getObjects().filter(obj => obj.type === 'i-text' || (obj.id && obj.id.startsWith('design-')));
                setHasCanvasObjects(userAddedObjects.length > 0);
            };

            // Event listener for when objects are modified (e.g., dragged, scaled manually)
            const handleObjectModified = () => {
                // Ensure UI controls reflect changes if the modified object is text
                const activeObject = FCanvas.getActiveObject(); // Re-get active object just in case
                if (activeObject && activeObject.type === 'i-text') {
                    setTextColor(activeObject.fill || '#FDF6EE');
                    setFontSize(activeObject.fontSize || 30);
                    setFontFamily(activeObject.fontFamily || 'Montserrat');
                }
            };

            const handleObjectAdded = () => {
                 const userAddedObjects = FCanvas.getObjects().filter(obj => obj.type === 'i-text' || (obj.id && obj.id.startsWith('design-')));
                 setHasCanvasObjects(userAddedObjects.length > 0);
            };
            const handleObjectRemoved = () => {
                const userAddedObjects = FCanvas.getObjects().filter(obj => obj.type === 'i-text' || (obj.id && obj.id.startsWith('design-')));
                setHasCanvasObjects(userAddedObjects.length > 0);
            };


            FCanvas.on('selection:created', handleSelectionChange);
            FCanvas.on('selection:updated', handleSelectionChange);
            FCanvas.on('selection:cleared', handleSelectionChange);
            FCanvas.on('object:added', handleObjectAdded);
            FCanvas.on('object:removed', handleObjectRemoved);
            FCanvas.on('object:modified', handleObjectModified); // Important for reflecting manual changes

            // Global keydown listener for delete key
            const handleKeyDown = (e) => {
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                        return;
                    }
                    deleteSelectedObject();
                }
            };
            document.addEventListener('keydown', handleKeyDown);

            // Initial check for canvas objects (e.g., if a design is pre-loaded via selectedDesign state change)
            // This is handled by selectedDesign dependency in the main canvas content useEffect.

            // Cleanup function
            return () => {
                if (fabricCanvas.current) {
                    FCanvas.off('selection:created', handleSelectionChange);
                    FCanvas.off('selection:updated', handleSelectionChange);
                    FCanvas.off('selection:cleared', handleSelectionChange);
                    FCanvas.off('object:added', handleObjectAdded);
                    FCanvas.off('object:removed', handleObjectRemoved);
                    FCanvas.off('object:modified', handleObjectModified);
                    FCanvas.dispose();
                    fabricCanvas.current = null;
                    document.removeEventListener('keydown', handleKeyDown);
                }
            };
        }
    }, [deleteSelectedObject]); // Only re-run if deleteSelectedObject callback itself changes (which it shouldn't)

    // Canvas Content Update (runs when finalVariant, currentMockupType, or selectedDesign changes)
    useEffect(() => {
        const FCanvas = fabricCanvas.current;
        if (!FCanvas) return; // Canvas not initialized yet

        const updateCanvasBackground = (fabricInstance) => {
            const teeMockupImage = finalVariant?.imageSet?.find(img => img.url.includes('tee_') && !img.url.includes('man_'));
            const manMockupImage = finalVariant?.imageSet?.find(img => img.url.includes('man_'));
            const primaryImageFound = finalVariant?.imageSet?.find(img => img.isPrimary === true);
            const firstAvailableImage = finalVariant?.imageSet?.[0];

            let mockupSrc = '';
            if (currentMockupType === 'tee' && teeMockupImage) {
                mockupSrc = teeMockupImage.url;
            } else if (currentMockupType === 'man' && manMockupImage) {
                mockupSrc = manMockupImage.url; 
            } else if (primaryImageFound) {
                mockupSrc = primaryImageFound.url;
            } else if (firstAvailableImage) {
                mockupSrc = firstAvailableImage.url;
            }

            if (mockupSrc) {
                fabricInstance.Image.fromURL(mockupSrc, (img) => {
                    if (!img) return;
                    FCanvas.setBackgroundImage(img, FCanvas.renderAll.bind(FCanvas), {
                        scaleX: FCanvas.width / img.width,
                        scaleY: FCanvas.height / img.height,
                        crossOrigin: 'anonymous',
                        selectable: false,
                        evented: false,
                        alignX: 'center',
                        alignY: 'center',
                        meetOrSlice: 'meet'
                    });
                }, { crossOrigin: 'anonymous' });
            } else {
                FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
            }
        };

        const pollForFabricAndSetupContent = () => {
            if (window.fabric) { // Ensure Fabric.js is loaded
                updateCanvasBackground(window.fabric);

                // Remove previous design image if any, but preserve other objects like text
                // Filter out current selectedDesign from removal if it's the one being kept/updated
                FCanvas.getObjects().filter(obj => obj.id?.startsWith('design-') && obj.id !== `design-${selectedDesign?._id}`).forEach(obj => FCanvas.remove(obj));

                if (selectedDesign?.imageDataUrl) {
                    const existingDesignObject = FCanvas.getObjects().find(obj => obj.id === `design-${selectedDesign._id}`);
                    if (!existingDesignObject) {
                        window.fabric.Image.fromURL(selectedDesign.imageDataUrl, (img) => {
                            if (!img) return;
                            img.id = `design-${selectedDesign._id}`; // Assign a unique ID for tracking
                            img.scaleToWidth(FCanvas.width * 0.33); // Initial scale for display
                            img.set({
                                left: (FCanvas.width / 2),
                                top: (FCanvas.height * 0.375), // 37.5% down from top for center of image
                                originX: 'center',
                                originY: 'center',
                                hasControls: true, hasBorders: true, borderColor: 'brand.accentYellow',
                                cornerColor: 'brand.accentYellow', cornerSize: 8, transparentCorners: false,
                                lockMovementX: false, lockMovementY: false, lockRotation: false,
                                lockScalingX: false, lockScalingY: false, lockSkewingX: false, lockSkewingY: false,
                            });
                            FCanvas.add(img);
                            img.sendToBack(); // Send image behind text if text is added later
                            FCanvas.renderAll();
                            // REMOVED: FCanvas.setActiveObject(img); // Let Fabric.js event listeners handle activation
                            // REMOVED: activeObjectRef.current = img; // Let selection:created handle this
                        }, { crossOrigin: 'anonymous' });
                    } else {
                        // REMOVED: FCanvas.setActiveObject(existingDesignObject); // Let Fabric.js event listeners handle activation
                        // REMOVED: activeObjectRef.current = existingDesignObject; // Let selection:created handle this
                        FCanvas.renderAll();
                    }
                } else {
                    FCanvas.renderAll();
                }

            } else {
                setTimeout(pollForFabricAndSetupContent, 100); // Polling for window.fabric
            }
        };
        pollForFabricAndSetupContent();

    }, [finalVariant, currentMockupType, selectedDesign]); // Reruns when product/mockup/selected design changes


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


    const isCustomizeEnabled = selectedProductId && selectedColorName && selectedSize;

    return (
        <VStack spacing={8} align="stretch" px={{ base: 4, md: 8 }} py={8}>
            <Heading as="h1" size="2xl" color="brand.textLight" textAlign="center" mb={6}>Customize Your Apparel</Heading>

            {/* 1. Choose Your Apparel Section */}
            <Box bg="brand.paper" p={{ base: 5, md: 8 }} borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight"><Icon as={FaTshirt} mr={3} verticalAlign="middle" />1. Choose Your Apparel</Heading>
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
            <Box bg="brand.paper" p={{ base: 5, md: 8 }} borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight"><Icon as={FaPalette} mr={3} verticalAlign="middle" />2. Choose Your Saved Design</Heading>
                    {loadingDesigns ? <Spinner size="xl" color="brand.accentYellow" /> : !designs.length ? (
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
            <Box bg="brand.paper" p={{ base: 5, md: 8 }} borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight" textAlign="center"><Icon as={FaPaintBrush} mr={3} verticalAlign="middle" />3. Customize & Preview</Heading>

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

                            {/* Canvas Container */}
                            <Box
                                maxW="800px"
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

                            <Button onClick={clearCanvas} leftIcon={<Icon as={FaTrash} />} colorScheme="red" variant="outline" size="sm" maxW="200px" mx="auto" isDisabled={!isCustomizeEnabled}>Clear All Customizations</Button>
                            <Button onClick={deleteSelectedObject} leftIcon={<Icon as={FaTrash} />} colorScheme="red" variant="outline" size="sm" maxW="200px" mx="auto" isDisabled={!isCustomizeEnabled}>Delete Selected Object</Button>
                            <Button onClick={centerSelectedObject} leftIcon={<Icon as={FaArrowsAltH} />} colorScheme="gray" variant="outline" size="sm" maxW="200px" mx="auto" isDisabled={!isCustomizeEnabled}>Center Selected</Button>

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
                                            onChange={(e) => {
                                                setTextColor(e.target.value);
                                                updateFabricObjectProperty('fill', e.target.value);
                                            }}
                                            w="full"
                                            p={0}
                                            height="38px"
                                        />
                                        <InputRightElement width="3.5rem" pointerEvents="none">
                                            <Icon as={FaEyeDropper} color="brand.textMuted" />
                                        </InputRightElement>
                                    </InputGroup>
                                </FormControl>
                                <FormControl isDisabled={!isCustomizeEnabled}>
                                    <FormLabel fontSize="sm" color="brand.textLight">Size</FormLabel>
                                    <NumberInput value={fontSize} onChange={(val) => {
                                        const newSize = parseFloat(val);
                                        setFontSize(newSize);
                                        updateFabricObjectProperty('fontSize', newSize);
                                    }} min={10} max={100} size="md">
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
                                    onChange={(e) => {
                                        const newFontFamily = e.target.value;
                                        setFontFamily(newFontFamily);
                                        updateFabricObjectProperty('fontFamily', newFontFamily);
                                    }}
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

                    <Divider my={6} borderColor="whiteAlpha.300" />

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
                        <Button
                            colorScheme="brandAccentOrange"
                            size="lg"
                            onClick={handleProceedToCheckout}
                            leftIcon={<Icon as={FaShoppingCart} />}
                            isDisabled={!finalVariant || (!hasSelectedDesign && !hasCanvasObjects)}
                            width="full"
                            maxW="md"
                        >
                            Proceed to Checkout
                        </Button>
                    </VStack>
                </VStack>
            </Box>
        </VStack>
    );
}
