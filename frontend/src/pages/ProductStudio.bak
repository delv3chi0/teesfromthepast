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
import { FaShoppingCart, FaTshirt, FaPalette, FaFont, FaTrash, FaEyeDropper, FaArrowsAltH, FaArrowUp, FaArrowDown, FaCube } from 'react-icons/fa';

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

// *** NEW: Frontend map for default mockup images based on color and placement ***
// You MUST expand this map to include all your colors and placements
// The paths should match where your images are stored in public/images/mockups/
const DEFAULT_MOCKUP_IMAGE_MAP = {
    "Black": {
        "Full-front": "/images/mockups/tee_black.png",
        "Full-back": "/images/mockups/tee_black_back.png",
        "Sleeve": "/images/mockups/tee_black_sleeve.png",
        "Center-chest": "/images/mockups/tee_black.png", // Often same as full-front
        "Oversized front": "/images/mockups/tee_black.png", // Often same as full-front
    },
    "White": {
        "Full-front": "/images/mockups/tee_white.png",
        "Full-back": "/images/mockups/tee_white_back.png",
        "Sleeve": "/images/mockups/tee_white_sleeve.png",
        "Center-chest": "/images/mockups/tee_white.png",
        "Oversized front": "/images/mockups/tee_white.png",
    },
    // *** ADD MORE COLORS AND THEIR MOCKUP PATHS HERE ***
    // Example for another color:
    // "Navy Blue": {
    //      "Full-front": "/images/mockups/tee_navy.png",
    //      "Full-back": "/images/mockups/tee_navy_back.png",
    //      "Sleeve": "/images/mockups/tee_navy_sleeve.png",
    // },
};


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
    const [currentMockupType, setCurrentMockupType] = useState('front'); // UPDATED: Default view to 'front'
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

    const addDesignToCanvas = useCallback((design) => {
        if (!fabricCanvas.current || !design?.imageDataUrl) {
            toast({ title: "No design to add.", status: "warning", isClosable: true });
            return;
        }
        const activeObjects = fabricCanvas.current.getObjects().filter(obj => obj.id && obj.id.startsWith('design-'));
        if (activeObjects.length > 0) {
            toast({ title: "Design already on canvas", description: "You can only place one design at a time. To add a new one, please delete the current one first.", status: "info", isClosable: true });
            return;
        }
        window.fabric.Image.fromURL(design.imageDataUrl, img => {
            img.set({
                id: `design-${design._id}`,
                left: fabricCanvas.current.width / 2,
                top: fabricCanvas.current.height / 2,
                originX: 'center',
                originY: 'center',
                hasControls: true, hasBorders: true, borderColor: 'brand.accentYellow',
                cornerColor: 'brand.accentYellow', cornerSize: 8, transparentCorners: false,
                scaleX: 0.5,
                scaleY: 0.5
            });
            fabricCanvas.current.add(img);
            fabricCanvas.current.setActiveObject(img);
            fabricCanvas.current.renderAll();
            setSelectedDesign(design);
        }, { crossOrigin: 'anonymous' });
    }, [toast]);

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

    const handleProceedToCheckout = useCallback(async () => {
      const { widthInches, heightInches } = currentPrintAreaDimensions;
      const isCustomizeEnabled = selectedProductId && selectedColorName && selectedSize;
      if (!finalVariant || (!hasSelectedDesign && !hasCanvasObjects) || !isCustomizeEnabled) {
          toast({
              title: "Incomplete Customization",
              description: "Please select a Product, Color, and Size, AND select a design or add custom text/elements.",
              status: "warning",
              isClosable: true
          });
          return;
      }
      
      const DYNAMIC_PRINT_READY_WIDTH = widthInches * DPI;
      const DYNAMIC_PRINT_READY_HEIGHT = heightInches * DPI;

      let previewCanvasTemp = new window.fabric.Canvas(null, { width: MOCKUP_PREVIEW_WIDTH, height: MOCKUP_PREVIEW_HEIGHT });
      if (fabricCanvas.current.backgroundImage) {
            previewCanvasTemp.setBackgroundImage(fabricCanvas.current.backgroundImage, previewCanvasTemp.renderAll.bind(previewCanvasTemp));
      }
      fabricCanvas.current.getObjects().filter(obj => obj.id !== 'printAreaGuideline').forEach(obj => {
          previewCanvasTemp.add(window.fabric.util.object.clone(obj));
      });
      previewCanvasTemp.renderAll();
      const finalPreviewImage = previewCanvasTemp.toDataURL({ format: 'png', quality: 1.0, multiplier: 1 });
      previewCanvasTemp.dispose(); 

      const printReadyCanvas = new window.fabric.Canvas(null, { width: DYNAMIC_PRINT_READY_WIDTH, height: DYNAMIC_PRINT_READY_HEIGHT });
      const printAreaPxWidth = currentPrintAreaDimensions.widthInches * DPI;
      const printAreaPxHeight = currentPrintAreaDimensions.heightInches * DPI;
      const previewToPrintScalingFactor = DYNAMIC_PRINT_READY_WIDTH / (printAreaPxWidth * Math.min(MOCKUP_PREVIEW_WIDTH / printAreaPxWidth, MOCKUP_PREVIEW_HEIGHT / printAreaPxHeight));
      const printAreaLeftOnPreview = (MOCKUP_PREVIEW_WIDTH - (printAreaPxWidth * Math.min(MOCKUP_PREVIEW_WIDTH / printAreaPxWidth, MOCKUP_PREVIEW_HEIGHT / printAreaPxHeight))) / 2;
      const printAreaTopOnPreview = (MOCKUP_PREVIEW_HEIGHT - (printAreaPxHeight * Math.min(MOCKUP_PREVIEW_WIDTH / printAreaPxWidth, MOCKUP_PREVIEW_HEIGHT / printAreaPxHeight))) / 2;
      
      const customizableObjects = fabricCanvas.current.getObjects().filter(obj => obj.type === 'i-text' || (obj.id && obj.id.startsWith('design-')));

      if (customizableObjects.length === 0) {
          toast({ title: "Error", description: "No design elements found on canvas for print.", status: "error" });
          return;
      }
      
      customizableObjects.forEach(obj => {
        const clonedObject = window.fabric.util.object.clone(obj);
        const originalRelX = obj.left - printAreaLeftOnPreview;
        const originalRelY = obj.top - printAreaTopOnPreview;
        
        clonedObject.set({
          hasControls: false, hasBorders: false,
          angle: obj.angle, 
          scaleX: obj.scaleX * previewToPrintScalingFactor,
          scaleY: obj.scaleY * previewToPrintScalingFactor,
          left: originalRelX * previewToPrintScalingFactor,
          top: originalRelY * previewToPrintScalingFactor,
          originX: 'center',
          originY: 'center',
          fontSize: obj.type === 'i-text' ? obj.fontSize * previewToPrintScalingFactor : undefined,
        });
        printReadyCanvas.add(clonedObject);
      });
          
      if (printReadyCanvas.getObjects().length === 0) {
          toast({ title: "Error", description: "Canvas content disappeared during print generation.", status: "error" });
          return;
      }

      printReadyCanvas.renderAll();
      const printReadyDesignDataUrl = printReadyCanvas.toDataURL({ format: 'png', quality: 1.0, multiplier: 1 });
      printReadyCanvas.dispose();

      let cloudinaryPublicUrl = '';
      try {
          toast({
              title: "Uploading design...",
              description: "Preparing your custom design for print. This may take a moment. Please do not close this window.",
              status: "info", duration: null, isClosable: false, position: "top",
          });
          const uploadResponse = await client.post('/upload-print-file', {
              imageData: printReadyDesignDataUrl,
              designName: selectedDesign?.prompt || `${selectedProduct.name} Custom Design`,
          });
          cloudinaryPublicUrl = uploadResponse.data.publicUrl;
          toast.closeAll();
          toast({ title: "Design uploaded!", description: "Your custom design is ready.", status: "success", isClosable: true });
      } catch (error) {
          console.error("Error uploading print file to Cloudinary:", error);
          toast.closeAll();
          toast({
              title: "Upload Failed",
              description: "Could not upload your design for printing. Please try again.",
              status: "error", isClosable: true,
          });
          return;
      }

      // We'll need to send the correct mockup URL based on the current view to the checkout page
      const primaryImage = finalVariant.imageSet?.find(img => img.isPrimary) || finalVariant.imageSet?.[0];
      const checkoutItem = {
          designId: selectedDesign?._id || 'custom-design-' + Date.now(),
          productId: selectedProductId, productName: selectedProduct.name, variantSku: finalVariant.sku,
          size: finalVariant.size, color: finalVariant.colorName,
          prompt: selectedDesign?.prompt || "Customized design",
          imageDataUrl: finalPreviewImage, // This is the image with the design overlaid on the mockup
          printReadyDataUrl: cloudinaryPublicUrl,
          productImage: primaryImage?.url, // This should be the default product image, not a specific mockup view
          unitPrice: (selectedProduct.basePrice + (finalVariant.priceModifier || 0)),
          // We can also store the current view to show in the cart/checkout
          view: currentMockupType
      };
      localStorage.setItem('itemToCheckout', JSON.stringify(checkoutItem));
      navigate('/checkout');
    }, [selectedDesign, finalVariant, selectedProductId, selectedProduct, navigate, toast, hasSelectedDesign, hasCanvasObjects,
        DPI, MOCKUP_PREVIEW_WIDTH, MOCKUP_PREVIEW_HEIGHT, currentPrintAreaDimensions, currentMockupType
    ]);

    const handleProductChange = useCallback((e) => {
        const newProductId = e.target.value;
        setSelectedProductId(newProductId);
        setSelectedColorName('');
        setSelectedSize('');
        const newSelectedProduct = products.find(p => p._id === newProductId);
        if (newSelectedProduct?.variants?.length > 0) {
            const defaultColor = newSelectedProduct.variants.find(v => v.isDefaultDisplay) || newSelectedProduct.variants[0];
            setSelectedColorName(defaultColor.colorName);
            if (defaultColor.sizes?.length > 0) { setSelectedSize(defaultColor.sizes[0].size); }
            if (defaultColor.printAreas?.length > 0) { setSelectedPrintAreaPlacement(defaultColor.printAreas[0].placement); }
        }
    }, [products]);

    const handleColorChange = useCallback((e) => {
        const newColor = e.target.value;
        setSelectedColorName(newColor);
        setSelectedSize('');
        const newColorVariant = selectedProduct?.variants.find(v => v.colorName === newColor);
        if (newColorVariant?.sizes?.length > 0) { setSelectedSize(newColorVariant.sizes[0].size); }
        if (newColorVariant?.printAreas?.length > 0) { setSelectedPrintAreaPlacement(newColorVariant.printAreas[0].placement); }
    }, [selectedProduct]);

    // *** UPDATED: useEffect to handle canvas initialization and updates ***
    useEffect(() => {
        if (!window.fabric) {
            console.error("Fabric.js is not loaded.");
            return;
        }

        // Initialize canvas
        if (!fabricCanvas.current) {
            fabricCanvas.current = new window.fabric.Canvas(canvasEl.current, {
                width: MOCKUP_PREVIEW_WIDTH,
                height: MOCKUP_PREVIEW_HEIGHT,
                preserveObjectStacking: true,
            });
            fabricCanvas.current.on('object:added', () => setHasCanvasObjects(true));
            fabricCanvas.current.on('object:removed', () => setHasCanvasObjects(fabricCanvas.current.getObjects().length > 0));
        }

        // --- Core logic to update the canvas ---
        const updateCanvas = async () => {
            if (!selectedProduct || !selectedColorVariant || !selectedPrintAreaPlacement) {
                fabricCanvas.current.clear();
                return;
            }
            
            const selectedPrintArea = selectedColorVariant.printAreas.find(pa => pa.placement === selectedPrintAreaPlacement);
            if (!selectedPrintArea) {
                // If a placement is selected but no area is found, clear canvas and stop.
                fabricCanvas.current.clear();
                return;
            }

            // Get the appropriate mockup URL
            // First, try to get the URL from the new `imageSet` fields
            const imageSource = selectedColorVariant.imageSet?.[0];
            let mockupImageURL = '';

            switch(currentMockupType) {
              case 'front':
                mockupImageURL = imageSource?.frontMockupUrl || DEFAULT_MOCKUP_IMAGE_MAP[selectedColorName]?.['Full-front'];
                break;
              case 'back':
                mockupImageURL = imageSource?.backMockupUrl || DEFAULT_MOCKUP_IMAGE_MAP[selectedColorName]?.['Full-back'];
                break;
              case 'sleeve':
                mockupImageURL = imageSource?.sleeveMockupUrl || DEFAULT_MOCKUP_IMAGE_MAP[selectedColorName]?.['Sleeve'];
                break;
              default:
                mockupImageURL = imageSource?.frontMockupUrl || DEFAULT_MOCKUP_IMAGE_MAP[selectedColorName]?.['Full-front'];
            }
            
            if (!mockupImageURL) {
              console.error(`No mockup URL found for ${selectedColorName} and view ${currentMockupType}`);
              // Fallback or show error state if no image is available
              return;
            }
            
            setCurrentPrintAreaDimensions({
              widthInches: selectedPrintArea.widthInches,
              heightInches: selectedPrintArea.heightInches,
              mockupImage: mockupImageURL,
            });

            // Clear previous canvas content except user-added designs/text
            const userAddedObjects = fabricCanvas.current.getObjects().filter(obj =>
              obj.id !== 'printAreaGuideline' && obj.id !== 'teeMockupImage'
            );
            fabricCanvas.current.clear();
            userAddedObjects.forEach(obj => fabricCanvas.current.add(obj));
            
            // Load and set the mockup image as the canvas background
            window.fabric.Image.fromURL(mockupImageURL, (img) => {
                fabricCanvas.current.setBackgroundImage(img, fabricCanvas.current.renderAll.bind(fabricCanvas.current), {
                    scaleX: fabricCanvas.current.width / img.width,
                    scaleY: fabricCanvas.current.height / img.height,
                });
                
                // Add the print area guideline to the canvas
                const printAreaPxWidth = selectedPrintArea.widthInches * DPI;
                const printAreaPxHeight = selectedPrintArea.heightInches * DPI;

                // Scale print area to fit on the mockup canvas
                const canvasScaleX = MOCKUP_PREVIEW_WIDTH / img.width;
                const canvasScaleY = MOCKUP_PREVIEW_HEIGHT / img.height;
                const canvasScale = Math.min(canvasScaleX, canvasScaleY);

                const scaledPrintAreaWidth = printAreaPxWidth * (MOCKUP_PREVIEW_WIDTH / printAreaPxWidth);
                const scaledPrintAreaHeight = printAreaPxHeight * (MOCKUP_PREVIEW_HEIGHT / printAreaPxHeight);
                
                const printAreaGuideline = new window.fabric.Rect({
                    id: 'printAreaGuideline',
                    left: (fabricCanvas.current.width / 2),
                    top: (fabricCanvas.current.height / 2),
                    originX: 'center',
                    originY: 'center',
                    width: scaledPrintAreaWidth, // Use scaled dimensions
                    height: scaledPrintAreaHeight,
                    fill: '',
                    stroke: 'rgba(255, 255, 255, 0.7)',
                    strokeDashArray: [5, 5],
                    strokeWidth: 2,
                    selectable: false,
                    evented: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    lockRotation: true,
                    lockScalingX: true,
                    lockScalingY: true,
                });
                fabricCanvas.current.add(printAreaGuideline);
            });
        };

        updateCanvas();

    }, [selectedProduct, selectedColorVariant, selectedPrintAreaPlacement, currentMockupType, MOCKUP_PREVIEW_WIDTH, MOCKUP_PREVIEW_HEIGHT]);


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

                let initialProduct = null;
                let initialColorVariant = null;

                if (productId && fetchedProducts.length > 0) {
                    initialProduct = fetchedProducts.find(p => p._id === productId);
                } else if (fetchedProducts.length > 0) {
                    initialProduct = fetchedProducts[0]; // Default to first product if no ID in URL
                }

                if (initialProduct) {
                    setSelectedProductId(initialProduct._id);
                    if (color) {
                        initialColorVariant = initialProduct.variants.find(v => v.colorName === color);
                    } else {
                        initialColorVariant = initialProduct.variants.find(v => v.isDefaultDisplay) || initialProduct.variants[0];
                    }

                    if (initialColorVariant) {
                        setSelectedColorName(initialColorVariant.colorName);
                        if (size) {
                            setSelectedSize(initialColorVariant.sizes.find(s => s.size === size)?.size || (initialColorVariant.sizes.length > 0 ? initialColorVariant.sizes[0].size : ''));
                        } else if (initialColorVariant.sizes.length > 0) {
                            setSelectedSize(initialColorVariant.sizes[0].size);
                        }
                        if (initialColorVariant.printAreas.length > 0) {
                            setSelectedPrintAreaPlacement(initialColorVariant.printAreas[0].placement);
                        }
                    }
                }
            })
            .catch(err => {
                console.error("Failed to fetch products for Product Studio:", err);
                toast({ title: "Error", description: "Could not load products for customization. Please try again later.", status: "error" });
            })
            .finally(() => setLoading(false));
    }, [reactLocation.search, toast]);

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
                    {/* NEW: Mockup View Selector */}
                    <Flex justifyContent="center" mb={4}>
                      <HStack spacing={2} p={2} bg="brand.secondary" borderRadius="full">
                        <Tooltip label="Front View" placement="top"><IconButton icon={<Icon as={FaTshirt} />} onClick={() => setCurrentMockupType('front')} colorScheme={currentMockupType === 'front' ? 'brandAccentYellow' : 'gray'} aria-label="Front View"/></Tooltip>
                        <Tooltip label="Back View" placement="top"><IconButton icon={<Icon as={FaTshirt} transform="scaleX(-1)" />} onClick={() => setCurrentMockupType('back')} colorScheme={currentMockupType === 'back' ? 'brandAccentYellow' : 'gray'} aria-label="Back View"/></Tooltip>
                        <Tooltip label="Sleeve View" placement="top"><IconButton icon={<Icon as={FaCube} />} onClick={() => setCurrentMockupType('sleeve')} colorScheme={currentMockupType === 'sleeve' ? 'brandAccentYellow' : 'gray'} aria-label="Sleeve View"/></Tooltip>
                      </HStack>
                    </Flex>
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
                    <HStack justifyContent="center" spacing={4} mt={4}>
                      <Tooltip label="Delete selected item" placement="bottom"><Button onClick={deleteSelectedObject} leftIcon={<Icon as={FaTrash} />} colorScheme="red" variant="outline" size="sm">Delete</Button></Tooltip>
                      <Tooltip label="Center selected item horizontally" placement="bottom"><Button onClick={centerSelectedObject} leftIcon={<Icon as={FaArrowsAltH} />} colorScheme="blue" variant="outline" size="sm">Center</Button></Tooltip>
                    </HStack>
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
                    <Box bg="brand.secondary" p={5} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.200" isDisabled={!isCustomizeEnabled}>
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
                                            onClick={() => addDesignToCanvas(design)}
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
