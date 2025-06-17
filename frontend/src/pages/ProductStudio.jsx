import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Heading, Text, VStack, Select, SimpleGrid, Image, Spinner, Alert,
    AlertIcon, Divider, useToast, Icon, Button, FormControl, FormLabel, Link as ChakraLink,
    Flex, Tooltip, AspectRatio, Input, InputGroup, InputRightElement, IconButton, RadioGroup, Stack,
    Popover, PopoverTrigger, PopoverContent, PopoverArrow, PopoverCloseButton, PopoverHeader, PopoverBody,
    Slider, SliderTrack, SliderFilledTrack, SliderThumb,
    NumberInput, NumberInputField, NumberInputStepper,
    NumberIncrementStepper, NumberDecrementStepper,
    HStack
} from '@chakra-ui/react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart, FaTshirt, FaPalette, FaRulerVertical, FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight, FaFont, FaSquare, FaCircle, FaTrash, FaMousePointer, FaEyeDropper } from 'react-icons/fa';

// Reusable ThemedSelect for consistency
const ThemedSelect = (props) => (
    <Select
        size="lg"
        bg="brand.secondary"
        borderColor="whiteAlpha.300"
        color="brand.textLight"
        _placeholder={{ color: "brand.textMuted" }}
        _hover={{ borderColor: "whiteAlpha.400" }}
        focusBorderColor="brand.accentYellow"
        sx={{
            option: {
                bg: 'brand.secondary',
                color: 'brand.textLight',
            },
            '.chakra-select__field': {
                color: 'brand.textLight !important',
            },
            '.chakra-select__icon': {
                color: 'brand.textLight',
            },
        }}
        {...props}
    />
);

// New ThemedInput component for customization controls
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

    // New states for customization tools
    const [textInputValue, setTextInputValue] = useState('');
    const [textColor, setTextColor] = useState('#FDF6EE'); // Default to textLight
    const [fontSize, setFontSize] = useState(30);
    const [fontFamily, setFontFamily] = useState('Montserrat'); // Default body font
    const [shapeFillColor, setShapeFillColor] = useState('#D16930'); // Default to accentOrange

    // Derived states
    const selectedProduct = products.find(p => p._id === selectedProductId);
    const uniqueColorVariants = selectedProduct ? [...new Map(selectedProduct.variants.map(v => [v.colorName, v])).values()] : [];
    const selectedColorVariant = selectedProduct?.variants.find(v => v.colorName === selectedColorName);
    const availableSizes = selectedColorVariant?.sizes?.filter(s => s.inStock) || [];
    const selectedSizeVariant = availableSizes.find(s => s.size === selectedSize);

    const finalVariant = selectedColorVariant && selectedSizeVariant
        ? { ...selectedColorVariant, ...selectedSizeVariant }
        : null;

    const canvasEl = useRef(null);
    const fabricCanvas = useRef(null);
    const activeObjectRef = useRef(null); // Ref to store the currently active Fabric.js object

    // Canvas Initialization (runs once)
    useEffect(() => {
        if (canvasEl.current && !fabricCanvas.current && window.fabric) {
            fabricCanvas.current = new window.fabric.Canvas(canvasEl.current, {
                width: 400,
                height: 400,
                backgroundColor: 'rgba(0,0,0,0)', // Transparent canvas background
            });

            // Event listener for object selection (to update activeObjectRef)
            fabricCanvas.current.on('selection:created', (e) => activeObjectRef.current = e.target);
            fabricCanvas.current.on('selection:updated', (e) => activeObjectRef.current = e.target);
            fabricCanvas.current.on('selection:cleared', () => activeObjectRef.current = null);
        }
        // Cleanup function for Fabric.js
        return () => {
            if (fabricCanvas.current) {
                fabricCanvas.current.off('selection:created');
                fabricCanvas.current.off('selection:updated');
                fabricCanvas.current.off('selection:cleared');
                fabricCanvas.current.dispose();
                fabricCanvas.current = null;
            }
        };
    }, []); // Empty dependency array means this runs once on mount

    // Canvas Content Update (runs when product/design/tools change)
    useEffect(() => {
        const FCanvas = fabricCanvas.current;
        if (!FCanvas) return;

        // Load mockup image based on currentMockupType and selected product variant
        const setupMockup = (fabricInstance) => {
            const teeMockupImage = finalVariant?.imageSet?.find(img => img.url.includes('tee_') && !img.url.includes('man_'));
            const manMockupImage = finalVariant?.imageSet?.find(img => img.url.includes('man_'));

            let mockupSrc = '';
            if (currentMockupType === 'tee' && teeMockupImage) {
                mockupSrc = teeMockupImage.url;
            } else if (currentMockupType === 'man' && manMockupImage) {
                mockupSrc = manMockupImage.url;
            } else if (primaryImage) { // Fallback to primary if selected type not found
                mockupSrc = primaryImage.url;
            }


            if (mockupSrc) {
                fabricInstance.Image.fromURL(mockupSrc, (img) => {
                    FCanvas.setBackgroundImage(img, FCanvas.renderAll.bind(FCanvas), {
                        scaleX: FCanvas.width / img.width,
                        scaleY: FCanvas.height / img.height,
                        crossOrigin: 'anonymous',
                        selectable: false, // Ensure background image is not selectable
                        evented: false,   // It doesn't emit events
                    });
                }, { crossOrigin: 'anonymous' });
            } else {
                FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
            }
        };
        
        const pollForFabricAndSetupMockup = () => {
            if (window.fabric) {
                setupMockup(window.fabric);
                // After mockup is set, re-add or update selected design
                // Ensure existing objects (text, shapes) are preserved unless explicitly cleared
                if (selectedDesign?.imageDataUrl) {
                    // Check if the selected design is already on canvas, remove if it's old design
                    const existingDesignObject = FCanvas.getObjects().find(obj => obj.id === selectedDesign._id);
                    if (existingDesignObject) {
                        // If it's already there and is the current selected design, do nothing
                    } else {
                        // Remove previous design images
                        FCanvas.getObjects('image').filter(obj => obj.id?.startsWith('design-') || obj.src?.startsWith('data:image')).forEach(obj => FCanvas.remove(obj));
                        window.fabric.Image.fromURL(selectedDesign.imageDataUrl, (img) => {
                            if (!img) return;
                            img.id = `design-${selectedDesign._id}`; // Assign an ID to easily find it later
                            img.scaleToWidth(FCanvas.width * 0.33);
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
                        }, { crossOrigin: 'anonymous' });
                    }
                } else {
                    // If no design selected, remove any existing design images
                    FCanvas.getObjects('image').filter(obj => obj.id?.startsWith('design-') || obj.src?.startsWith('data:image')).forEach(obj => FCanvas.remove(obj));
                    FCanvas.renderAll();
                }

            } else {
                setTimeout(pollForFabricAndSetupMockup, 100);
            }
        };
        pollForFabricAndSetupMockup();

    }, [finalVariant, currentMockupType, selectedDesign]); // Dependencies updated

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

    // --- New Customization Tool Handlers ---
    const addTextToCanvas = useCallback(() => {
        if (!fabricCanvas.current || !textInputValue.trim()) {
            toast({ title: "Please enter text.", status: "warning", isClosable: true });
            return;
        }
        const textObject = new window.fabric.IText(textInputValue, {
            left: 50,
            top: 50,
            fill: textColor,
            fontSize: fontSize,
            fontFamily: fontFamily,
            hasControls: true,
            hasBorders: true,
            borderColor: 'brand.accentYellow',
            cornerColor: 'brand.accentYellow',
            cornerSize: 8,
            transparentCorners: false,
        });
        fabricCanvas.current.add(textObject);
        fabricCanvas.current.setActiveObject(textObject);
        fabricCanvas.current.renderAll();
        setTextInputValue(''); // Clear input after adding
    }, [textInputValue, textColor, fontSize, fontFamily]);

    const addShapeToCanvas = useCallback((shapeType) => {
        if (!fabricCanvas.current) return;
        let shapeObject;
        const commonProps = {
            left: 50,
            top: 50,
            fill: shapeFillColor,
            hasControls: true,
            hasBorders: true,
            borderColor: 'brand.accentYellow',
            cornerColor: 'brand.accentYellow',
            cornerSize: 8,
            transparentCorners: false,
        };

        if (shapeType === 'rect') {
            shapeObject = new window.fabric.Rect({
                width: 100,
                height: 100,
                ...commonProps,
            });
        } else if (shapeType === 'circle') {
            shapeObject = new window.fabric.Circle({
                radius: 50,
                ...commonProps,
            });
        }
        if (shapeObject) {
            fabricCanvas.current.add(shapeObject);
            fabricCanvas.current.setActiveObject(shapeObject);
            fabricCanvas.current.renderAll();
        }
    }, [shapeFillColor]);

    const clearCanvas = useCallback(() => {
        if (fabricCanvas.current) {
            // Keep background image, remove all other objects
            const objects = fabricCanvas.current.getObjects().filter(obj => !obj.backgroundColor && !obj._originalElement);
            fabricCanvas.current.remove(...objects);
            fabricCanvas.current.renderAll();
            setSelectedDesign(null); // Deselect any chosen design
        }
    }, []);

    // Function to update properties of the active object (text/shape color/font)
    const updateActiveObject = useCallback((property, value) => {
        if (fabricCanvas.current && activeObjectRef.current) {
            activeObjectRef.current.set(property, value);
            fabricCanvas.current.renderAll();
        }
    }, []);


    const handleProceedToCheckout = useCallback(() => {
        if (!selectedDesign && fabricCanvas.current.getObjects().length === 0) {
            toast({ title: "Please select a design or add custom elements.", status: "warning", isClosable: true });
            return;
        }
        if (!finalVariant) { toast({ title: "Please select all product options.", status: "warning", isClosable: true }); return; }
        
        // --- Generate Final Combined Image ---
        // Create a new canvas to ensure it's exactly the size needed for print, if different
        // For now, we'll use the main canvas's content.
        const finalPreviewImage = fabricCanvas.current.toDataURL({
            format: 'png', // or 'jpeg'
            quality: 1.0, // Best quality
            multiplier: 1, // Keep original size or increase for higher resolution if needed (e.g., 2 or 3)
        });

        const primaryImage = finalVariant.imageSet?.find(img => img.isPrimary) || finalVariant.imageSet?.[0];
        const checkoutItem = {
            // Using selectedDesign for ID, prompt, imageDataUrl, even if text/shapes are added
            // For actual POD, you'd need the finalPreviewImage itself.
            designId: selectedDesign?._id || 'custom-design', // Assign a unique ID for custom work
            productId: selectedProductId,
            productName: selectedProduct.name,
            variantSku: finalVariant.sku,
            size: finalVariant.size,
            color: finalVariant.colorName,
            prompt: selectedDesign?.prompt || "Customized design",
            // Pass the generated image data URL for the combined preview
            imageDataUrl: finalPreviewImage, // This is the combined preview for display in checkout/order
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
        setSelectedColorName('');
        setSelectedSize('');

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
                    <Heading as="h2" size="xl" color="brand.textLight" textAlign="center">3. Customize & Preview</Heading>
                    
                    {/* Instructions for customization */}
                    <Text color="brand.textMuted" textAlign="center" fontSize="md">
                        Drag, scale, and rotate your chosen design. Add text or shapes below.
                    </Text>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
                        {/* Left Column: Canvas Preview */}
                        <VStack spacing={4} align="stretch">
                            {/* Mockup Toggle */}
                            <RadioGroup onChange={setCurrentMockupType} value={currentMockupType}>
                                <Stack direction="row" spacing={4} justifyContent="center" mb={4}>
                                    <Button size="sm" colorScheme={currentMockupType === 'tee' ? 'brandAccentYellow' : 'gray'} onClick={() => setCurrentMockupType('tee')}>Blank Tee</Button>
                                    <Button size="sm" colorScheme={currentMockupType === 'man' ? 'brandAccentYellow' : 'gray'} onClick={() => setCurrentMockupType('man')} isDisabled={!finalVariant || !finalVariant.imageSet?.some(img => img.url.includes('man_'))}>On Model</Button>
                                </Stack>
                            </RadioGroup>

                            <Flex justifyContent="center" alignItems="center" bg="brand.primary" mx="auto" borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.300" w="400px" h="400px">
                                <canvas ref={canvasEl} />
                            </Flex>
                            
                            <Button onClick={clearCanvas} leftIcon={<Icon as={FaTrash} />} colorScheme="red" variant="outline" size="sm" maxW="200px" mx="auto">Clear All Customizations</Button>
                        </VStack>

                        {/* Right Column: Customization Tools */}
                        <VStack spacing={4} align="stretch" bg="brand.secondary" p={6} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.200">
                            <Heading size="md" mb={2} color="brand.textLight">Add Text</Heading>
                            <FormControl>
                                <FormLabel fontSize="sm" color="brand.textLight">Text Content</FormLabel>
                                <ThemedControlInput
                                    value={textInputValue}
                                    onChange={(e) => setTextInputValue(e.target.value)}
                                    placeholder="Enter text..."
                                />
                            </FormControl>
                            <SimpleGrid columns={2} spacing={3}>
                                <FormControl>
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
                                <FormControl>
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
                            <FormControl>
                                <FormLabel fontSize="sm" color="brand.textLight">Font Family</FormLabel>
                                <ThemedSelect
                                    value={fontFamily}
                                    onChange={(e) => { setFontFamily(e.target.value); updateActiveObject('fontFamily', e.target.value); }}
                                    size="md" // Smaller size for controls
                                >
                                    <option value="Bungee">Bungee (Heading)</option>
                                    <option value="Montserrat">Montserrat (Body)</option>
                                    <option value="Arial">Arial</option>
                                    <option value="Verdana">Verdana</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Courier New">Courier New</option>
                                </ThemedSelect>
                            </FormControl>
                            <Button onClick={addTextToCanvas} leftIcon={<Icon as={FaFont} />} colorScheme="brandAccentYellow" size="sm" isDisabled={!textInputValue.trim()}>Add Text</Button>

                            <Divider my={4} borderColor="whiteAlpha.300" />

                            <Heading size="md" mb={2} color="brand.textLight">Add Shapes</Heading>
                            <SimpleGrid columns={2} spacing={3}>
                                <FormControl>
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
                                <Box> {/* Placeholder for potential stroke color later */} </Box>
                            </SimpleGrid>
                            <HStack>
                                <Button onClick={() => addShapeToCanvas('rect')} leftIcon={<Icon as={FaSquare} />} colorScheme="brandAccentYellow" size="sm">Add Rectangle</Button>
                                <Button onClick={() => addShapeToCanvas('circle')} leftIcon={<Icon as={FaCircle} />} colorScheme="brandAccentYellow" size="sm">Add Circle</Button>
                            </HStack>

                            {/* Additional controls for selected object properties can go here */}
                            {/* E.g., if you want to allow changing position, scale, opacity of selected items */}
                            {/* <Divider my={4} borderColor="whiteAlpha.300" />
                            <Heading size="md" mb={2} color="brand.textLight">Selected Item Properties</Heading>
                            <Text color="brand.textMuted">Select an item on the canvas to adjust its properties.</Text>
                            <Slider defaultValue={100} min={0} max={100} step={1} onChangeEnd={(val) => updateActiveObject('opacity', val / 100)}>
                                <SliderTrack><SliderFilledTrack bg="brand.accentYellow"/></SliderTrack>
                                <SliderThumb><Icon as={FaMousePointer} color="brand.accentYellow"/></SliderThumb>
                            </Slider> */}

                        </VStack>
                    </SimpleGrid>

                    <Divider my={6} borderColor="whiteAlpha.300"/>

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
                        <Button colorScheme="brandAccentOrange" size="lg" onClick={handleProceedToCheckout} leftIcon={<Icon as={FaShoppingCart} />} isDisabled={!finalVariant || (fabricCanvas.current && fabricCanvas.current.getObjects().length === 0 && !selectedDesign)} width="full" maxW="md">Proceed to Checkout</Button>
                    </VStack>
                </VStack>
            </Box>
        </VStack>
    );
}
