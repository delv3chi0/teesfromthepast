import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Heading, Text, VStack, Select, SimpleGrid, Image, Spinner, Alert,
    AlertIcon, Divider, useToast, Icon, Button, FormControl, FormLabel, Link as ChakraLink,
    Flex, Tooltip, AspectRatio, Input, InputGroup, InputRightElement, IconButton, RadioGroup, Stack,
    NumberInput, NumberInputField, NumberInputStepper,
    NumberIncrementStepper, NumberDecrementStepper, HStack
} from '@chakra-ui/react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart, FaTshirt, FaPalette, FaFont, FaTrash, FaEyeDropper, FaArrowsAltH, FaArrowUp, FaArrowDown } from 'react-icons/fa';

// This is a complete overhaul of the ProductStudio component.
// It features a new layout with a prominent canvas area and a dedicated sidebar for controls.
// It dynamically handles mockup images and print area sizes based on data from the backend.

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

// Reusable ThemedInput component for customization controls
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
    const reactLocation = useLocation();

    // --- GLOBAL CONSTANTS FOR PRINT ALIGNMENT ---
    const DPI = 300;

    // *** FINAL IDEAL STANDARD PREVIEW AREA DIMENSIONS ***
    // All mockup images and the canvas will be scaled to this size to ensure a perfect fit.
    const MOCKUP_PREVIEW_WIDTH = 1024;
    const MOCKUP_PREVIEW_HEIGHT = 1536; // This maintains a perfect 2:3 aspect ratio.

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
    const [selectedPrintAreaPlacement, setSelectedPrintAreaPlacement] = useState('');
    const [currentPrintAreaDimensions, setCurrentPrintAreaDimensions] = useState({ widthInches: 0, heightInches: 0, mockupImage: '' });
    const [textInputValue, setTextInputValue] = useState('');
    const [textColor, setTextColor] = useState('#FDF6EE');
    const [fontSize, setFontSize] = useState(30);
    const [fontFamily, setFontFamily] = useState('Montserrat');
    const [hasCanvasObjects, setHasCanvasObjects] = useState(false);

    const canvasEl = useRef(null);
    const fabricCanvas = useRef(null);

    // --- Derived States ---
    const selectedProduct = products.find(p => p._id === selectedProductId);
    const uniqueColorVariants = selectedProduct ? [...new Map(selectedProduct.variants.map(v => [v.colorName, v])).values()] : [];
    const selectedColorVariant = selectedProduct?.variants.find(v => v.colorName === selectedColorName);
    const availableSizes = selectedColorVariant?.sizes?.filter(s => s.inStock) || [];
    const selectedSizeVariant = availableSizes.find(s => s.size === selectedSize);
    const finalVariant = selectedColorVariant && selectedSizeVariant ? { ...selectedColorVariant, ...selectedSizeVariant } : null;
    const hasSelectedDesign = selectedDesign !== null;

    // Dynamic Print Area Dimensions in Pixels (for the dotted line on preview)
    const printAreaPxWidth = currentPrintAreaDimensions.widthInches * DPI;
    const printAreaPxHeight = currentPrintAreaDimensions.heightInches * DPI;

    // --- Core Fabric.js Canvas Logic & Callbacks ---

    const addTextToCanvas = useCallback(() => {
        if (!fabricCanvas.current || !textInputValue.trim()) {
            toast({ title: "Please enter text content.", status: "warning", isClosable: true });
            return;
        }
        const textObject = new window.fabric.IText(textInputValue, {
            left: (fabricCanvas.current.width / 2),
            top: (fabricCanvas.current.height * 0.40), // Centered on the chest area
            originX: 'center',
            originY: 'center',
            fill: textColor,
            fontSize: fontSize,
            fontFamily: fontFamily,
            hasControls: true, hasBorders: true, borderColor: 'brand.accentYellow',
            cornerColor: 'brand.accentYellow', cornerSize: 8, transparentCorners: false,
        });
        fabricCanvas.current.add(textObject);
        fabricCanvas.current.setActiveObject(textObject);
        fabricCanvas.current.renderAll();
        setTextInputValue('');
    }, [textInputValue, textColor, fontSize, fontFamily, toast]);

    const clearCanvas = useCallback(() => {
        if (fabricCanvas.current) {
            const userAddedObjects = fabricCanvas.current.getObjects().filter(obj =>
                obj.id !== 'printAreaGuideline' && obj.id !== 'teeMockupImage'
            );
            fabricCanvas.current.remove(...userAddedObjects);
            fabricCanvas.current.renderAll();
            setSelectedDesign(null);
            fabricCanvas.current.discardActiveObject();
        }
    }, []);

    const deleteSelectedObject = useCallback(() => {
        if (fabricCanvas.current) {
            const activeObject = fabricCanvas.current.getActiveObject();
            if (activeObject && activeObject.id !== 'printAreaGuideline' && activeObject.id !== 'teeMockupImage') {
                fabricCanvas.current.remove(activeObject);
                fabricCanvas.current.discardActiveObject();
                fabricCanvas.current.renderAll();
                if (selectedDesign && activeObject.id === `design-${selectedDesign._id}`) {
                  setSelectedDesign(null);
                }
            } else {
                toast({ title: "No deletable object selected", description: "Select custom text or a design on the canvas to delete it. The shirt and print area are not deletable.", status: "info", isClosable: true });
            }
        }
    }, [selectedDesign, toast]);

    const centerSelectedObject = useCallback(() => {
        if (fabricCanvas.current) {
            const activeObject = fabricCanvas.current.getActiveObject();
            if (activeObject && activeObject.id !== 'printAreaGuideline') {
                activeObject.centerH();
                fabricCanvas.current.renderAll();
            } else {
                toast({ title: "No object selected", description: "Select text or a design on the canvas to center it.", status: "info", isClosable: true });
            }
        }
    }, [toast]);

    // --- Main Effect Hooks ---

    // Effect to handle canvas initialization and events
    useEffect(() => {
        if (canvasEl.current && !fabricCanvas.current && window.fabric) {
            const canvasWidth = MOCKUP_PREVIEW_WIDTH;
            const canvasHeight = MOCKUP_PREVIEW_HEIGHT;

            fabricCanvas.current = new window.fabric.Canvas(canvasEl.current, {
                width: canvasWidth,
                height: canvasHeight,
                backgroundColor: 'rgba(0,0,0,0)',
                selection: true,
            });

            const FCanvas = fabricCanvas.current;

            const handleSelectionChange = () => {
                const userAddedObjects = FCanvas.getObjects().filter(obj => obj.type === 'i-text' || (obj.id && obj.id.startsWith('design-')));
                setHasCanvasObjects(userAddedObjects.length > 0);
            };

            FCanvas.on('selection:created', handleSelectionChange);
            FCanvas.on('selection:updated', handleSelectionChange);
            FCanvas.on('selection:cleared', handleSelectionChange);
            FCanvas.on('object:added', handleSelectionChange);
            FCanvas.on('object:removed', handleSelectionChange);

            const handleKeyDown = (e) => {
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) { return; }
                    deleteSelectedObject();
                }
            };
            document.addEventListener('keydown', handleKeyDown);

            return () => {
                if (fabricCanvas.current) {
                    FCanvas.off('selection:created', handleSelectionChange);
                    FCanvas.off('selection:updated', handleSelectionChange);
                    FCanvas.off('selection:cleared', handleSelectionChange);
                    FCanvas.off('object:added', handleSelectionChange);
                    FCanvas.off('object:removed', handleSelectionChange);
                    FCanvas.dispose();
                    fabricCanvas.current = null;
                    document.removeEventListener('keydown', handleKeyDown);
                }
            };
        }
    }, [deleteSelectedObject]);

    // Effect to dynamically load mockup image, dotted line, and design
    useEffect(() => {
        const FCanvas = fabricCanvas.current;
        if (!FCanvas) return;

        const updateCanvas = (fabricInstance) => {
            const specificMockup = selectedColorVariant?.printAreas?.find(pa => pa.placement === selectedPrintAreaPlacement)?.mockupImage;
            const fallbackMockup = finalVariant?.imageSet?.find(img => img.isPrimary)?.url || finalVariant?.imageSet?.[0]?.url;
            let mockupSrc = specificMockup || fallbackMockup;

            FCanvas.remove(FCanvas.getObjects().find(obj => obj.id === 'printAreaGuideline'));

            if (mockupSrc) {
              fabricInstance.Image.fromURL(mockupSrc, (img) => {
                if (!img) return;

                const scaleX = FCanvas.width / img.width;
                const scaleY = FCanvas.height / img.height;
                const scale = Math.max(scaleX, scaleY);

                FCanvas.setBackgroundImage(img, FCanvas.renderAll.bind(FCanvas), {
                  scaleX: scale,
                  scaleY: scale,
                  top: FCanvas.height / 2,
                  left: FCanvas.width / 2,
                  originX: 'center',
                  originY: 'center',
                  crossOrigin: 'anonymous',
                  selectable: false,
                  evented: false,
                });

                if (currentPrintAreaDimensions.widthInches && currentPrintAreaDimensions.heightInches) {
                  const printAreaPxWidth = currentPrintAreaDimensions.widthInches * DPI;
                  const printAreaPxHeight = currentPrintAreaDimensions.heightInches * DPI;
                  const dottedRectScaleFactor = Math.min(FCanvas.width / printAreaPxWidth, FCanvas.height / printAreaPxHeight);
                  
                  const printAreaRect = new window.fabric.Rect({
                    id: 'printAreaGuideline',
                    left: FCanvas.width / 2,
                    top: FCanvas.height * 0.40,
                    width: printAreaPxWidth * dottedRectScaleFactor,
                    height: printAreaPxHeight * dottedRectScaleFactor,
                    stroke: 'white',
                    strokeWidth: 2,
                    strokeDashArray: [5, 5],
                    fill: 'transparent',
                    originX: 'center',
                    originY: 'center',
                    selectable: false,
                    evented: false,
                    hoverCursor: 'default'
                  });
                  FCanvas.add(printAreaRect);
                  FCanvas.sendToBack(printAreaRect);
                }
                FCanvas.renderAll();

                if (selectedDesign?.imageDataUrl) {
                    const existingDesignObject = FCanvas.getObjects().find(obj => obj.id === `design-${selectedDesign._id}`);
                    if (!existingDesignObject) {
                        fabricInstance.Image.fromURL(selectedDesign.imageDataUrl, (designImg) => {
                            if (!designImg) return;
                            designImg.id = `design-${selectedDesign._id}`;
                            
                            const printAreaPxWidth = currentPrintAreaDimensions.widthInches * DPI;
                            const printAreaPxHeight = currentPrintAreaDimensions.heightInches * DPI;
                            const scaleFactorToFitPrintArea = Math.min(FCanvas.width / printAreaPxWidth, FCanvas.height / printAreaPxHeight);

                            designImg.scale(scaleFactorToFitPrintArea * 0.9);
                            designImg.set({
                                left: (FCanvas.width / 2),
                                top: (FCanvas.height * 0.40),
                                originX: 'center',
                                originY: 'center',
                                hasControls: true, hasBorders: true, borderColor: 'brand.accentYellow',
                                cornerColor: 'brand.accentYellow', cornerSize: 8, transparentCorners: false,
                                lockMovementX: false, lockMovementY: false, lockRotation: false,
                                lockScalingX: false, lockScalingY: false, lockSkewingX: false, lockSkewingY: false,
                            });
                            FCanvas.add(designImg);
                            FCanvas.renderAll();
                        }, { crossOrigin: 'anonymous' });
                    }
                }
              }, { crossOrigin: 'anonymous' });
            } else {
              FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
            }
        };
        
        const pollForFabric = () => { window.fabric ? updateCanvas(window.fabric) : setTimeout(pollForFabric, 100); };
        pollForFabric();

    }, [finalVariant, selectedPrintAreaPlacement, currentPrintAreaDimensions, selectedDesign, currentMockupType, MOCKUP_PREVIEW_WIDTH, MOCKUP_PREVIEW_HEIGHT, toast]);


    // Effect for initial data fetching and URL parameter handling
    useEffect(() => {
      setLoading(true);
      client.get('/storefront/products')
        .then(res => {
          const fetchedProducts = res.data || [];
          setProducts(fetchedProducts);
          const params = new URLSearchParams(reactLocation.search);
          const productId = params.get('productId');
          const color = params.get('color');
          const size = params.get('size');
          if (productId && fetchedProducts.length > 0) {
            setSelectedProductId(productId);
            const initialProduct = fetchedProducts.find(p => p._id === productId);
            if (initialProduct && color) {
              setSelectedColorName(color);
              const initialColorVariant = initialProduct.variants.find(v => v.colorName === color);
              if (initialColorVariant && size) { setSelectedSize(size); } else if (initialColorVariant?.sizes?.length > 0) { setSelectedSize(initialColorVariant.sizes[0].size); }
              if (initialColorVariant?.printAreas?.length > 0) { setSelectedPrintAreaPlacement(initialColorVariant.printAreas[0].placement); }
            } else if (initialProduct?.variants?.length > 0) {
              const defaultColor = initialProduct.variants.find(v => v.isDefaultDisplay) || initialProduct.variants[0];
              setSelectedProductId(initialProduct._id); // Set product ID for default
              setSelectedColorName(defaultColor.colorName);
              if (defaultColor.sizes?.length > 0) { setSelectedSize(defaultColor.sizes[0].size); }
              if (defaultColor?.printAreas?.length > 0) { setSelectedPrintAreaPlacement(defaultColor.printAreas[0].placement); }
            }
          }
        })
        .catch(err => {
          console.error("Failed to fetch products for Product Studio:", err);
          toast({ title: "Error", description: "Could not load products for customization. Please try again later.", status: "error" });
        })
        .finally(() => setLoading(false));
    }, [reactLocation.search, toast]);

    // Effect to sync currentPrintAreaDimensions state
    useEffect(() => {
      if (selectedProduct && selectedColorName) {
        const variant = selectedProduct.variants.find(v => v.colorName === selectedColorName);
        if (variant && variant.printAreas) {
          const selectedArea = variant.printAreas.find(pa => pa.placement === selectedPrintAreaPlacement);
          if (selectedArea) {
            setCurrentPrintAreaDimensions({
              widthInches: selectedArea.widthInches,
              heightInches: selectedArea.heightInches,
              mockupImage: selectedArea.mockupImage,
            });
          } else {
            // Fallback to first print area if selected one is not found or no placement selected
            const defaultArea = variant.printAreas[0] || { widthInches: 12, heightInches: 14, mockupImage: '' };
            setCurrentPrintAreaDimensions({
              widthInches: defaultArea.widthInches,
              heightInches: defaultArea.heightInches,
              mockupImage: defaultArea.mockupImage,
            });
            if (variant.printAreas[0]) {
              setSelectedPrintAreaPlacement(variant.printAreas[0].placement);
            }
          }
        }
      }
    }, [selectedProduct, selectedColorName, selectedPrintAreaPlacement]);

    useEffect(() => {
        if (user) {
            setLoadingDesigns(true);
            client.get('/mydesigns').then(res => setDesigns(res.data || [])).finally(() => setLoadingDesigns(false));
        } else {
            setDesigns([]);
            setLoadingDesigns(false);
        }
    }, [user, reactLocation, navigate]);

    const isCustomizeEnabled = selectedProductId && selectedColorName && selectedSize;

    return (
        <Flex direction={{ base: 'column', md: 'row' }} minH="100vh" bg="brand.primary">
            {/* Left Column: Design Canvas Area */}
            <Box flex="1" p={4} maxW={{ base: '100%', md: '60%' }}>
                <VStack spacing={4} align="stretch" h="100%">
                    <Heading as="h1" size="2xl" color="brand.textLight" textAlign="center" mb={6}>3. Customize & Preview</Heading>
                    {!isCustomizeEnabled && (
                        <Alert status="info" borderRadius="md" maxW="lg" mx="auto" bg="blue.900" borderWidth="1px" borderColor="blue.500">
                            <AlertIcon color="blue.300" />
                            <Text color="whiteAlpha.900">Please select a Product, Color, and Size to begin designing.</Text>
                        </Alert>
                    )}

                    <Box
                        flexGrow="1"
                        w="100%"
                        maxW="1000px" // Limits the maximum width of the canvas container
                        mx="auto"
                        aspectRatio={MOCKUP_PREVIEW_WIDTH / MOCKUP_PREVIEW_HEIGHT}
                        bg="brand.primary"
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor="whiteAlpha.300"
                        overflow="hidden"
                        position="relative"
                    >
                        <canvas ref={canvasEl} style={{ width: '100%', height: '100%' }} />
                    </Box>
                </VStack>
            </Box>

            {/* Right Column: Controls Sidebar */}
            <Box flex="1" p={4} bg="brand.paper" borderRadius="xl">
                <VStack spacing={6} align="stretch">
                    <Heading as="h2" size="xl" color="brand.textLight">Design Controls</Heading>

                    {/* Section 1: Choose Your Apparel */}
                    <Box bg="brand.secondary" p={5} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.200">
                        <Heading as="h3" size="md" color="brand.textLight" mb={4}>1. Choose Apparel</Heading>
                        {loading ? <Spinner size="md" color="brand.accentYellow" /> :
                            <VStack spacing={4} align="stretch">
                                <FormControl><FormLabel color="brand.textLight">Product</FormLabel>
                                    <ThemedSelect value={selectedProductId} onChange={handleProductChange} placeholder="Select Product">
                                        {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                    </ThemedSelect>
                                </FormControl>
                                <FormControl><FormLabel color="brand.textLight">Color</FormLabel>
                                    <ThemedSelect value={selectedColorName} onChange={handleColorChange} placeholder="Select Color" isDisabled={!selectedProductId}>
                                        {uniqueColorVariants.map(c => (
                                            <option key={c.colorName} value={c.colorName}>{c.colorName}</option>
                                        ))}
                                    </ThemedSelect>
                                </FormControl>
                                <FormControl><FormLabel color="brand.textLight">Size</FormLabel>
                                    <ThemedSelect value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} placeholder="Select Size" isDisabled={!selectedColorName}>
                                        {availableSizes.map(s => <option key={s.size} value={s.size}>{s.size}</option>)}
                                    </ThemedSelect>
                                </FormControl>
                                {finalVariant?.printAreas?.length > 0 && (
                                    <FormControl>
                                        <FormLabel color="brand.textLight">Print Placement</FormLabel>
                                        <Select
                                            size="md"
                                            value={selectedPrintAreaPlacement}
                                            onChange={(e) => setSelectedPrintAreaPlacement(e.target.value)}
                                        >
                                            {finalVariant.printAreas.map(pa => (
                                                <option key={pa.placement} value={pa.placement}>
                                                    {`${pa.placement} (${pa.widthInches}"x${pa.heightInches}")`}
                                                </option>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}
                            </VStack>
                        }
                    </Box>

                    {/* Section 2: Choose Your Saved Design */}
                    <Box bg="brand.secondary" p={5} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.200">
                        <Heading as="h3" size="md" color="brand.textLight" mb={4}>2. Add Your Design</Heading>
                        {loadingDesigns ? <Spinner size="md" color="brand.accentYellow" /> : !designs.length ? (
                            <Text color="brand.textLight" fontSize="sm">You have no saved designs. <ChakraLink as={RouterLink} to="/generate" color="brand.accentYellow" fontWeight="bold">Generate one now!</ChakraLink></Text>
                        ) : (
                            <SimpleGrid columns={{ base: 3, lg: 4 }} spacing={2}>
                                {designs.map(design => (
                                    <Tooltip key={design._id} label={design.prompt} placement="top" bg="gray.700" color="white" hasArrow>
                                        <Box
                                            p={1}
                                            bg="brand.secondary"
                                            borderWidth="2px"
                                            borderRadius="md"
                                            onClick={() => setSelectedDesign(design)}
                                            cursor="pointer"
                                            borderColor={selectedDesign?._id === design._id ? "brand.accentYellow" : "transparent"}
                                            transition="all 0.2s ease-in-out"
                                            _hover={{ borderColor: selectedDesign?._id === design._id ? "brand.accentYellow" : "whiteAlpha.300", transform: 'scale(1.02)' }}
                                        >
                                            <AspectRatio ratio={1 / 1}>
                                                <Image src={design.imageDataUrl} borderRadius="sm" objectFit="cover" alt={design.prompt} />
                                            </AspectRatio>
                                        </Box>
                                    </Tooltip>
                                ))}
                            </SimpleGrid>
                        )}
                    </Box>

                    {/* Section 3: Add Text Controls */}
                    <Box bg="brand.secondary" p={5} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.200" isDisabled={!isCustomizeEnabled}>
                        <Heading size="md" mb={2} color="brand.textLight">3. Add Text</Heading>
                        <FormControl isDisabled={!isCustomizeEnabled} mb={3}>
                            <FormLabel fontSize="sm" color="brand.textLight">Text Content</FormLabel>
                            <ThemedControlInput
                                value={textInputValue}
                                onChange={(e) => setTextInputValue(e.target.value)}
                                placeholder="Enter text..."
                            />
                        </FormControl>
                        <SimpleGrid columns={2} spacing={3} mb={3}>
                            <FormControl isDisabled={!isCustomizeEnabled}>
                                <FormLabel fontSize="sm" color="brand.textLight">Color</FormLabel>
                                <InputGroup>
                                    <ThemedControlInput
                                        type="color"
                                        value={textColor}
                                        onChange={(e) => {
                                            setTextColor(e.target.value);
                                            const currentActiveObject = fabricCanvas.current.getActiveObject();
                                            if (fabricCanvas.current && currentActiveObject && currentActiveObject.type === 'i-text') {
                                                currentActiveObject.set('fill', e.target.value);
                                                fabricCanvas.current.renderAll();
                                            }
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
                                  const currentActiveObject = fabricCanvas.current.getActiveObject();
                                  if (fabricCanvas.current && currentActiveObject && currentActiveObject.type === 'i-text') {
                                      currentActiveObject.set('fontSize', newSize);
                                      fabricCanvas.current.renderAll();
                                  }
                                }} min={10} max={100} size="md">
                                    <NumberInputField as={ThemedControlInput} />
                                    <NumberInputStepper>
                                        <NumberIncrementStepper />
                                        <NumberDecrementStepper />
                                    </NumberInputStepper>
                                </NumberInput>
                            </FormControl>
                        </SimpleGrid>
                        <FormControl isDisabled={!isCustomizeEnabled} mb={3}>
                            <FormLabel fontSize="sm" color="brand.textLight">Font Family</FormLabel>
                            <ThemedSelect
                                value={fontFamily}
                                onChange={(e) => {
                                    const newFontFamily = e.target.value;
                                    setFontFamily(newFontFamily);
                                    const currentActiveObject = fabricCanvas.current.getActiveObject();
                                    if (fabricCanvas.current && currentActiveObject && currentActiveObject.type === 'i-text') {
                                        currentActiveObject.set('fontFamily', newFontFamily);
                                        fabricCanvas.current.renderAll();
                                    }
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
                    </Box>
                </VStack>

                <Divider my={6} borderColor="whiteAlpha.300" />

                {/* Final Price & Checkout */}
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
            </Box>
        </Flex>
    );
}
