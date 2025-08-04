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
    const DPI = 300; // Standard for Printful

    // *** FINAL IDEAL STANDARD PREVIEW AREA DIMENSIONS ***
    // This is the target size for your mockup image files as well.
    const MOCKUP_PREVIEW_WIDTH = 1024;
    const MOCKUP_PREVIEW_HEIGHT = 1536; // This maintains a perfect 2:3 aspect ratio.

    // Conceptual reference for how the dotted print area relates to Printify's usual defaults.
    const CONCEPTUAL_PRINT_AREA_WIDTH_DEFAULT = 12; // inches
    const CONCEPTUAL_PRINT_AREA_HEIGHT_DEFAULT = 14; // inches (for Full-Front)

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
    const [currentPrintAreaDimensions, setCurrentPrintAreaDimensions] = useState({ widthInches: 0, heightInches: 0 });

    const [textInputValue, setTextInputValue] = useState('');
    const [textColor, setTextColor] = useState('#FDF6EE');
    const [fontSize, setFontSize] = useState(30);
    const [fontFamily, setFontFamily] = useState('Montserrat');

    const canvasEl = useRef(null);
    const fabricCanvas = useRef(null);

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

    // Dynamic Print Area Dimensions in Pixels (for the dotted line on preview)
    const printAreaPxWidth = currentPrintAreaDimensions.widthInches * DPI;
    const printAreaPxHeight = currentPrintAreaDimensions.heightInches * DPI;

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

    const updateFabricObjectProperty = useCallback((property, value) => {
        const FCanvas = fabricCanvas.current;
        const currentActiveObject = FCanvas.getActiveObject();
        if (!FCanvas || !currentActiveObject || currentActiveObject.type !== 'i-text') {
            return;
        }
        currentActiveObject.set(property, value);
        FCanvas.renderAll();
    }, []);

    const addTextToCanvas = useCallback(() => {
        if (!fabricCanvas.current || !textInputValue.trim()) {
            toast({ title: "Please enter text content.", status: "warning", isClosable: true });
            return;
        }
        const textObject = new window.fabric.IText(textInputValue, {
            left: (fabricCanvas.current.width / 2),
            top: (fabricCanvas.current.height * 0.6),
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
            fabricCanvas.current.getObjects().forEach(obj => {
                if (obj !== fabricCanvas.current.backgroundImage && obj.id !== 'printAreaGuideline') {
                    fabricCanvas.current.remove(obj);
                }
            });
            fabricCanvas.current.renderAll();
            setSelectedDesign(null);
            fabricCanvas.current.discardActiveObject();
        }
    }, []);

    const deleteSelectedObject = useCallback(() => {
        if (fabricCanvas.current) {
            const activeObject = fabricCanvas.current.getActiveObject();
            if (activeObject && activeObject !== fabricCanvas.current.backgroundImage && activeObject.id !== 'printAreaGuideline') {
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
        if (!finalVariant || (!hasSelectedDesign && !hasCanvasObjects)) {
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

        let previewCanvasTemp = new window.fabric.Canvas(null, {
            width: MOCKUP_PREVIEW_WIDTH,
            height: MOCKUP_PREVIEW_HEIGHT,
            backgroundColor: 'rgba(0,0,0,0)',
        });
        if (fabricCanvas.current.backgroundImage) {
             previewCanvasTemp.setBackgroundImage(fabricCanvas.current.backgroundImage, previewCanvasTemp.renderAll.bind(previewCanvasTemp));
        }
        fabricCanvas.current.getObjects().filter(obj => obj.id !== 'printAreaGuideline').forEach(obj => {
            previewCanvasTemp.add(window.fabric.util.object.clone(obj));
        });
        previewCanvasTemp.renderAll();
        const finalPreviewImage = previewCanvasTemp.toDataURL({
            format: 'png',
            quality: 1.0,
            multiplier: 1,
        });
        previewCanvasTemp.dispose(); 

        const printReadyCanvas = new window.fabric.Canvas(null, {
            width: DYNAMIC_PRINT_READY_WIDTH, 
            height: DYNAMIC_PRINT_READY_HEIGHT,
            backgroundColor: 'rgba(0,0,0,0)',
        });
        
        // This scaling factor is key: it scales objects from their preview size to the high-res print size.
        // It uses the relationship between the Dotted Area's pixel dimensions and the final print file dimensions.
        const printAreaPxWidth = currentPrintAreaDimensions.widthInches * DPI;
        const printAreaPxHeight = currentPrintAreaDimensions.heightInches * DPI;

        const scaleFactorForPrint = Math.min(
            DYNAMIC_PRINT_READY_WIDTH / (printAreaPxWidth),
            DYNAMIC_PRINT_READY_HEIGHT / (printAreaPxHeight)
        );

        const customizableObjects = fabricCanvas.current.getObjects().filter(obj =>
            obj.type === 'i-text' || (obj.id && obj.id.startsWith('design-'))
        );

        if (customizableObjects.length === 0) {
            toast({ title: "Error", description: "No design elements found on canvas for print.", status: "error" });
            return;
        }

        let mainImageObj = null;
        const textObjArray = [];
        customizableObjects.forEach(obj => {
            if (obj.id && obj.id.startsWith('design-')) { mainImageObj = obj; } 
            else if (obj.type === 'i-text') { textObjArray.push(obj); }
        });

        const previewToPrintScalingFactor = DYNAMIC_PRINT_READY_WIDTH / (printAreaPxWidth * Math.min(MOCKUP_PREVIEW_WIDTH / printAreaPxWidth, MOCKUP_PREVIEW_HEIGHT / printAreaPxHeight));
        
        const printAreaLeftOnPreview = (MOCKUP_PREVIEW_WIDTH - (printAreaPxWidth * Math.min(MOCKUP_PREVIEW_WIDTH / printAreaPxWidth, MOCKUP_PREVIEW_HEIGHT / printAreaPxHeight))) / 2;
        const printAreaTopOnPreview = (MOCKUP_PREVIEW_HEIGHT - (printAreaPxHeight * Math.min(MOCKUP_PREVIEW_WIDTH / printAreaPxWidth, MOCKUP_PREVIEW_HEIGHT / printAreaPxHeight))) / 2;
        

        if (mainImageObj) {
            const clonedImage = window.fabric.util.object.clone(mainImageObj);
            const originalImageRelX = mainImageObj.left - printAreaLeftOnPreview;
            const originalImageRelY = mainImageObj.top - printAreaTopOnPreview;

            clonedImage.set({
                hasControls: false, hasBorders: false,
                angle: mainImageObj.angle, 
                scaleX: mainImageObj.scaleX * previewToPrintScalingFactor,
                scaleY: mainImageObj.scaleY * previewToPrintScalingFactor,
                left: originalImageRelX * previewToPrintScalingFactor,
                top: originalImageRelY * previewToPrintScalingFactor,
                originX: 'center',
                originY: 'center',
            });
            printReadyCanvas.add(clonedImage);
        }
        
        textObjArray.sort((a, b) => a.top - b.top);
        for (const textObj of textObjArray) {
            const clonedText = window.fabric.util.object.clone(textObj);
            const originalTextRelX = textObj.left - printAreaLeftOnPreview;
            const originalTextRelY = textObj.top - printAreaTopOnPreview;

            clonedText.set({
                fontSize: textObj.fontSize * previewToPrintScalingFactor,
                left: originalTextRelX * previewToPrintScalingFactor,
                top: originalTextRelY * previewToPrintScalingFactor,
                originX: 'center',
                originY: 'center',
                hasControls: false, hasBorders: false,
                angle: textObj.angle,
                scaleX: 1, scaleY: 1,
            });
            printReadyCanvas.add(clonedText);
        }
            
        if (printReadyCanvas.getObjects().length === 0) {
            toast({ title: "Error", description: "Canvas content disappeared during print generation.", status: "error" });
            return;
        }

        printReadyCanvas.renderAll();
        const printReadyDesignDataUrl = printReadyCanvas.toDataURL({
            format: 'png',
            quality: 1.0,
            multiplier: 1,
        });
        printReadyCanvas.dispose();

        let cloudinaryPublicUrl = '';
        try {
            toast({
                title: "Uploading design...",
                description: "Preparing your custom design for print. This may take a moment. Please do not close this window.",
                status: "info",
                duration: null,
                isClosable: false,
                position: "top",
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
                status: "error",
                isClosable: true,
            });
            return;
        }

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
            printReadyDataUrl: cloudinaryPublicUrl,
            productImage: primaryImage?.url,
            unitPrice: (selectedProduct.basePrice + (finalVariant.priceModifier || 0))
        };
        localStorage.setItem('itemToCheckout', JSON.stringify(checkoutItem));
        navigate('/checkout');
    }, [selectedDesign, finalVariant, selectedProductId, selectedProduct, navigate, toast, hasSelectedDesign, hasCanvasObjects,
        DPI, MOCKUP_PREVIEW_WIDTH, MOCKUP_PREVIEW_HEIGHT, DOTTED_PRINT_AREA_WIDTH, DOTTED_PRINT_AREA_HEIGHT, currentPrintAreaDimensions
    ]);


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
            if (defaultColor.printAreas && defaultColor.printAreas.length > 0) {
                setSelectedPrintAreaPlacement(defaultColor.printAreas[0].placement);
                setCurrentPrintAreaDimensions({
                    widthInches: defaultColor.printAreas[0].widthInches,
                    heightInches: defaultColor.printAreas[0].heightInches,
                });
            } else {
                setSelectedPrintAreaPlacement('Full-front'); 
                setCurrentPrintAreaDimensions({ widthInches: 12, heightInches: 14 }); // Fallback
            }
        }
    }, [products, clearCanvas]); 

    const handleColorChange = useCallback((e) => {
        const newColor = e.target.value;
        setSelectedColorName(newColor);
        setSelectedSize('');

        const newColorVariant = selectedProduct?.variants.find(v => v.colorName === newColor);
        if (newColorVariant?.sizes?.length > 0) {
            setSelectedSize(newColorVariant.sizes[0].size);
        }
        if (!selectedPrintAreaPlacement && newColorVariant?.printAreas && newColorVariant.printAreas.length > 0) {
             setSelectedPrintAreaPlacement(newColorVariant.printAreas[0].placement);
             setCurrentPrintAreaDimensions({
                 widthInches: newColorVariant.printAreas[0].widthInches,
                 heightInches: newColorVariant.printAreas[0].heightInches,
             });
        }
    }, [selectedProduct, selectedPrintAreaPlacement]);


    useEffect(() => {
        if (selectedProduct && selectedColorName && selectedPrintAreaPlacement) {
            const variant = selectedProduct.variants.find(v => v.colorName === selectedColorName);
            if (variant && variant.printAreas) {
                const selectedArea = variant.printAreas.find(pa => pa.placement === selectedPrintAreaPlacement);
                if (selectedArea) {
                    setCurrentPrintAreaDimensions({
                        widthInches: selectedArea.widthInches,
                        heightInches: selectedArea.heightInches,
                    });
                } else {
                    setCurrentPrintAreaDimensions({ widthInches: 12, heightInches: 14 });
                }
            }
        } else if (!selectedProduct || !selectedPrintAreaPlacement) {
            setCurrentPrintAreaDimensions({ widthInches: 12, heightInches: 14 });
        }
    }, [selectedProduct, selectedColorName, selectedPrintAreaPlacement]);

    useEffect(() => {
        const FCanvas = fabricCanvas.current;
        if (!FCanvas) return;
        const updateCanvasBackground = (fabricInstance) => {
            const teeMockupImage = finalVariant?.imageSet?.find(img => img.isPrimary === true);
            const backMockupImage = finalVariant?.imageSet?.find(img => img.url.includes('_back'));
            const sleeveMockupImage = finalVariant?.imageSet?.find(img => img.url.includes('_sleeve'));
            const specificMockup = finalVariant?.printAreas?.find(pa => pa.placement === selectedPrintAreaPlacement)?.mockupImage;

            let mockupSrc = '';
            if (specificMockup) {
                mockupSrc = specificMockup;
            } else if (selectedPrintAreaPlacement === 'Full-back' && backMockupImage) {
                mockupSrc = backMockupImage.url;
            } else if (selectedPrintAreaPlacement === 'Left-sleeve' && sleeveMockupImage) {
                 mockupSrc = sleeveMockupImage.url;
            } else if (teeMockupImage) {
                mockupSrc = teeMockupImage.url;
            } else if (finalVariant?.imageSet?.[0]) {
                mockupSrc = finalVariant.imageSet[0].url;
            }

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

                    const printAreaPxWidth = currentPrintAreaDimensions.widthInches * DPI;
                    const printAreaPxHeight = currentPrintAreaDimensions.heightInches * DPI;
                    
                    const dottedRectScaleFactor = Math.min(
                        FCanvas.width / printAreaPxWidth,
                        FCanvas.height / printAreaPxHeight
                    );

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
                    FCanvas.renderAll();

                }, { crossOrigin: 'anonymous' });
            } else {
                FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
            }
        };
        const pollForFabricAndSetupContent = () => {
            if (window.fabric) {
                updateCanvasBackground(window.fabric);
                FCanvas.getObjects().filter(obj => obj.id?.startsWith('design-') && obj.id !== `design-${selectedDesign?._id}` && obj.id !== 'printAreaGuideline').forEach(obj => FCanvas.remove(obj));
                if (selectedDesign?.imageDataUrl) {
                    const existingDesignObject = FCanvas.getObjects().find(obj => obj.id === `design-${selectedDesign._id}`);
                    if (!existingDesignObject) {
                        window.fabric.Image.fromURL(selectedDesign.imageDataUrl, (img) => {
                            if (!img) return;
                            img.id = `design-${selectedDesign._id}`;
                            const printAreaPxWidth = currentPrintAreaDimensions.widthInches * DPI;
                            const printAreaPxHeight = currentPrintAreaDimensions.heightInches * DPI;
                            const scaleFactorToFitScaledPrintArea = Math.min(
                                FCanvas.width / printAreaPxWidth,
                                FCanvas.height / printAreaPxHeight
                            );
                            img.scale(scaleFactorToFitScaledPrintArea * 0.9);
                            img.set({
                                left: (FCanvas.width / 2),
                                top: (FCanvas.height * 0.40),
                                originX: 'center',
                                originY: 'center',
                                hasControls: true, hasBorders: true, borderColor: 'brand.accentYellow',
                                cornerColor: 'brand.accentYellow', cornerSize: 8, transparentCorners: false,
                                lockMovementX: false, lockMovementY: false, lockRotation: false,
                                lockScalingX: false, lockScalingY: false, lockSkewingX: false, lockSkewingY: false,
                            });
                            FCanvas.add(img);
                            img.sendToBack();
                            FCanvas.renderAll();
                        }, { crossOrigin: 'anonymous' });
                    } else {
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

    }, [finalVariant, currentMockupType, selectedDesign, MOCKUP_PREVIEW_WIDTH, MOCKUP_PREVIEW_HEIGHT, currentPrintAreaDimensions, selectedPrintAreaPlacement]);

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
                        <VStack spacing={4} align="stretch" alignSelf="center">
                            {/* Mockup Toggle and Print Area Selector */}
                            <HStack justifyContent="center" spacing={4} mb={4}>
                                <RadioGroup onChange={setCurrentMockupType} value={currentMockupType} isDisabled={!isCustomizeEnabled}>
                                    <Stack direction="row" spacing={4}>
                                        <Button size="sm" colorScheme={currentMockupType === 'tee' ? 'brandAccentYellow' : 'gray'} onClick={() => setCurrentMockupType('tee')}>Blank Tee</Button>
                                        <Button size="sm" colorScheme={currentMockupType === 'man' ? 'brandAccentYellow' : 'gray'} onClick={() => setCurrentMockupType('man')} isDisabled={!finalVariant || !finalVariant.imageSet?.some(img => img.url.includes('man_'))}>On Model</Button>
                                    </Stack>
                                </RadioGroup>
                                {/* New Print Area Placement Selector */}
                                {finalVariant?.printAreas?.length > 0 && (
                                    <FormControl maxW="200px">
                                        <Select
                                            size="sm"
                                            value={selectedPrintAreaPlacement}
                                            onChange={(e) => setSelectedPrintAreaPlacement(e.target.value)}
                                        >
                                            {finalVariant.printAreas.map(pa => (
                                                <option key={pa.placement} value={pa.placement}>
                                                    {pa.placement}
                                                </option>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}
                            </HStack>

                            {/* Canvas Container */}
                            <Box
                                w="100%"
                                maxW={MOCKUP_PREVIEW_WIDTH}
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

                            {/* Action Buttons for Canvas */}
                            <HStack justifyContent="center" spacing={4} mt={4}>
                                <Button onClick={clearCanvas} leftIcon={<Icon as={FaTrash} />} colorScheme="red" variant="outline" size="sm" isDisabled={!isCustomizeEnabled}>Clear All</Button>
                                <Button onClick={deleteSelectedObject} leftIcon={<Icon as={FaTrash} />} colorScheme="red" variant="outline" size="sm" isDisabled={!isCustomizeEnabled}>Delete Selected</Button>
                                <Button onClick={centerSelectedObject} leftIcon={<Icon as={FaArrowsAltH} />} colorScheme="gray" variant="outline" size="sm" isDisabled={!isCustomizeEnabled}>Center</Button>
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
                            <FormControl isDisabled={!isCustomizeEnabled}>
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
