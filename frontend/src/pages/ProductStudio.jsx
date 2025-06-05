// frontend/src/pages/ProductStudio.jsx
import { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback
import {
  Box, Heading, Text, VStack, Select,
  SimpleGrid, Image, Spinner, Alert, AlertIcon, CloseButton as ChakraCloseButton, // Renamed CloseButton to ChakraCloseButton to avoid conflict
  Link as ChakraLink, Divider, useToast, Icon, Button
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart } from 'react-icons/fa';

// REMOVE Hardcoded arrays: productTypes, productColors, productSizes (will be fetched or derived)

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const INFO_ALERT_DISMISSED_KEY = 'productStudioInfoAlertDismissed_v1';

export default function ProductStudio() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // --- STATE FOR USER'S SAVED DESIGNS ---
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [designsError, setDesignsError] = useState('');
  const [selectedDesign, setSelectedDesign] = useState(null); // Stores the full design object

  // --- NEW STATE FOR DYNAMIC PRODUCT DATA ---
  const [availableProductTypes, setAvailableProductTypes] = useState([]); // e.g., [{_id: "1", name: "T-Shirt"}, ...]
  const [loadingProductTypes, setLoadingProductTypes] = useState(true);

  const [productsOfType, setProductsOfType] = useState([]); // Actual products for selected type, e.g., ["Men's Premium Tee", "Women's Basic Tee"]
  const [loadingProductsOfType, setLoadingProductsOfType] = useState(false);

  // --- NEW STATE FOR USER SELECTIONS ---
  const [selectedProductTypeId, setSelectedProductTypeId] = useState(''); // ID of selected ProductType (e.g., "T-Shirt")
  const [selectedProductId, setSelectedProductId] = useState('');       // ID of selected Product (e.g., "Men's Premium Tee")
  
  const [availableColors, setAvailableColors] = useState([]); // Derived from selectedProduct's variants
  const [selectedProductColor, setSelectedProductColor] = useState(''); // e.g., "Vintage Black" (colorName from variant)

  const [availableSizes, setAvailableSizes] = useState([]);   // Derived from selectedProduct's variants, filtered by color
  const [selectedProductSize, setSelectedProductSize] = useState(''); // e.g., "M" (size from variant)

  const [selectedVariant, setSelectedVariant] = useState(null); // The fully chosen variant object {_id, sku, colorName, size, imageMockupFront, etc.}

  // --- EXISTING UI STATE ---
  const [showInfoAlert, setShowInfoAlert] = useState(false);

  const canvasEl = useRef(null);
  const fabricCanvas = useRef(null); // For Fabric.js instance

  useEffect(() => {
    const dismissed = localStorage.getItem(INFO_ALERT_DISMISSED_KEY);
    if (dismissed !== 'true') {
      setShowInfoAlert(true);
    }
  }, []);

  // Fetch User's Saved Designs (Existing Logic)
  const fetchUserDesigns = useCallback(() => {
    if (!user) {
      setLoadingDesigns(false); setDesigns([]); setDesignsError(''); return;
    }
    setLoadingDesigns(true); setDesignsError(''); setDesigns([]);
    client.get('/mydesigns')
      .then(response => { setDesigns(response.data); })
      .catch(err => {
        console.error("[ProductStudio] Error fetching designs:", err);
        setDesignsError('Could not load your saved designs.');
        if (err.response?.status === 401) {
          toast({ title: "Session Expired", description: "Please log in again.", status: "warning", duration: 3000, isClosable: true });
          logout(); navigate('/login');
        }
      })
      .finally(() => setLoadingDesigns(false));
  }, [user, toast, logout, navigate]);

  useEffect(() => {
    fetchUserDesigns();
  }, [fetchUserDesigns]);


  // --- NEW: FETCH AVAILABLE PRODUCT TYPES ---
  useEffect(() => {
    setLoadingProductTypes(true);
    client.get('/storefront/product-types') // API endpoint we created
      .then(response => {
        setAvailableProductTypes(response.data || []);
        if (response.data && response.data.length > 0) {
          // Optionally auto-select first type, or leave it for user
          // setSelectedProductTypeId(response.data[0]._id); 
        }
      })
      .catch(err => {
        console.error("[ProductStudio] Error fetching product types:", err);
        toast({ title: "Load Error", description: "Could not load available product types.", status: "error" });
      })
      .finally(() => setLoadingProductTypes(false));
  }, [toast]);

  // --- NEW: FETCH PRODUCTS WHEN A PRODUCT TYPE IS SELECTED ---
  useEffect(() => {
    if (!selectedProductTypeId) {
      setProductsOfType([]);
      setSelectedProductId(''); // Clear selected product if type changes
      return;
    }
    setLoadingProductsOfType(true);
    setProductsOfType([]); // Clear previous
    setSelectedProductId(''); // Clear previous
    client.get(`/storefront/products/type/${selectedProductTypeId}`) // API endpoint
      .then(response => {
        setProductsOfType(response.data || []);
         if (response.data && response.data.length > 0) {
          // Optionally auto-select first product for the type
          // setSelectedProductId(response.data[0]._id);
        }
      })
      .catch(err => {
        console.error(`[ProductStudio] Error fetching products for type ${selectedProductTypeId}:`, err);
        toast({ title: "Load Error", description: `Could not load products for selected type.`, status: "error" });
      })
      .finally(() => setLoadingProductsOfType(false));
  }, [selectedProductTypeId, toast]);

  // --- NEW: DERIVE AVAILABLE COLORS WHEN A PRODUCT IS SELECTED ---
  useEffect(() => {
    if (!selectedProductId || productsOfType.length === 0) {
      setAvailableColors([]);
      setSelectedProductColor('');
      return;
    }
    const currentProduct = productsOfType.find(p => p._id === selectedProductId);
    if (currentProduct && currentProduct.variants) {
      const uniqueColorObjects = currentProduct.variants.reduce((acc, variant) => {
        if (!acc.find(c => c.value === variant.colorName)) {
          acc.push({ value: variant.colorName, label: variant.colorName, hex: variant.colorHex });
        }
        return acc;
      }, []);
      setAvailableColors(uniqueColorObjects);
      // Reset color if current selection no longer valid or if it was empty
      if (uniqueColorObjects.length > 0 && (!selectedProductColor || !uniqueColorObjects.find(c => c.value === selectedProductColor))) {
         // setSelectedProductColor(uniqueColorObjects[0].value); // Optionally auto-select first color
      } else if (uniqueColorObjects.length === 0) {
        setSelectedProductColor('');
      }
    } else {
      setAvailableColors([]);
      setSelectedProductColor('');
    }
  }, [selectedProductId, productsOfType, selectedProductColor]); // Added selectedProductColor to dependencies to re-evaluate if it becomes invalid

  // --- NEW: DERIVE AVAILABLE SIZES WHEN PRODUCT AND COLOR ARE SELECTED ---
  useEffect(() => {
    if (!selectedProductId || !selectedProductColor || productsOfType.length === 0) {
      setAvailableSizes([]);
      setSelectedProductSize('');
      return;
    }
    const currentProduct = productsOfType.find(p => p._id === selectedProductId);
    if (currentProduct && currentProduct.variants) {
      const sizesForColor = currentProduct.variants
        .filter(variant => variant.colorName === selectedProductColor)
        .map(variant => variant.size)
        .filter((value, index, self) => self.indexOf(value) === index); // Unique sizes
      
      setAvailableSizes(sizesForColor.map(s => ({ value: s, label: s })));
      // Reset size if current selection no longer valid or if it was empty
      if (sizesForColor.length > 0 && (!selectedProductSize || !sizesForColor.includes(selectedProductSize))) {
        // setSelectedProductSize(sizesForColor[0]); // Optionally auto-select first size
      } else if (sizesForColor.length === 0) {
        setSelectedProductSize('');
      }
    } else {
      setAvailableSizes([]);
      setSelectedProductSize('');
    }
  }, [selectedProductId, selectedProductColor, productsOfType, selectedProductSize]); // Added selectedProductSize for re-evaluation

  // --- NEW: DETERMINE THE FULL SELECTED VARIANT OBJECT ---
  useEffect(() => {
    if (selectedProductId && selectedProductColor && selectedProductSize && productsOfType.length > 0) {
      const product = productsOfType.find(p => p._id === selectedProductId);
      const variant = product?.variants.find(
        v => v.colorName === selectedProductColor && v.size === selectedProductSize
      );
      setSelectedVariant(variant || null);
    } else {
      setSelectedVariant(null);
    }
  }, [selectedProductId, selectedProductColor, selectedProductSize, productsOfType]);

  // --- FABRIC.JS CANVAS SETUP ---
  useEffect(() => {
    const fabricScriptPollInterval = 100;
    const maxPolls = 50;
    let pollCount = 0;

    const setupCanvas = (fabricInstance) => {
      if (!fabricCanvas.current && canvasEl.current) {
        fabricCanvas.current = new fabricInstance.Canvas(canvasEl.current, {
          width: CANVAS_WIDTH, height: CANVAS_HEIGHT,
        });
      }
      const FCanvas = fabricCanvas.current;
      if (!FCanvas) return;

      FCanvas.clear();
      const mockupSrc = selectedVariant?.imageMockupFront; // Use the selected variant's mockup

      if (mockupSrc) {
        fabricInstance.Image.fromURL(mockupSrc, (mockupImg) => {
          if (!mockupImg || mockupImg.width === 0) {
            console.error("[ProductStudio] Mockup image loaded with zero dimensions or null:", mockupSrc);
            FCanvas.setBackgroundColor('lightgrey', FCanvas.renderAll.bind(FCanvas)); return;
          }
          FCanvas.setBackgroundImage(mockupImg, FCanvas.renderAll.bind(FCanvas), {
            scaleX: CANVAS_WIDTH / mockupImg.width, scaleY: CANVAS_HEIGHT / mockupImg.height,
            selectable: false, evented: false,
          });
        }, { crossOrigin: 'anonymous' });
      } else {
        FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
        FCanvas.setBackgroundColor('white', FCanvas.renderAll.bind(FCanvas));
      }

      if (selectedDesign?.imageDataUrl) {
        fabricInstance.Image.fromURL(selectedDesign.imageDataUrl, (designImg) => {
          if (!designImg || designImg.width === 0) { console.error("[ProductStudio] Design image error"); return; }
          const designWidth = CANVAS_WIDTH * 0.33; designImg.scaleToWidth(designWidth);
          const designLeft = (CANVAS_WIDTH - designImg.getScaledWidth()) * 0.5;
          const designTop = CANVAS_HEIGHT * 0.24; // Adjust based on mockup type/variant later
          designImg.set({ top: designTop, left: designLeft });
          FCanvas.add(designImg); FCanvas.renderAll();
        }, { crossOrigin: 'anonymous' });
      } else {
        if (FCanvas.backgroundImage || FCanvas.backgroundColor) FCanvas.renderAll();
      }
    };

    const pollForFabric = () => {
      const fabricInstance = window.fabric;
      if (fabricInstance && fabricInstance.Canvas) setupCanvas(fabricInstance);
      else {
        pollCount++;
        if (pollCount < maxPolls) setTimeout(pollForFabric, fabricScriptPollInterval);
        else {
          console.error("[ProductStudio] Fabric.js timeout.");
          toast({ title: "Preview Error", description: "Cannot initialize product preview.", status: "error" });
        }
      }
    };
    if (canvasEl.current) pollForFabric();
  }, [selectedDesign, selectedVariant, toast]); // Key dependencies for re-rendering canvas

  const handleProceedToCheckout = () => {
    if (!selectedDesign || !selectedDesign._id) {
      toast({ title: "Design Not Selected", description: "Please select one of your saved designs.", status: "warning" }); return;
    }
    if (!selectedVariant || !selectedVariant.sku || !selectedProductId || !selectedProductTypeId) {
      toast({ title: "Product Incomplete", description: "Please ensure product type, specific product, color, and size are selected.", status: "warning" }); return;
    }

    const productTypeObject = availableProductTypes.find(pt => pt._id === selectedProductTypeId);
    const productObject = productsOfType.find(p => p._id === selectedProductId);

    if (!productTypeObject || !productObject) {
      toast({ title: "Error", description: "Invalid product selection details.", status: "error" }); return;
    }

    const productDetailsForCheckout = {
      designId: selectedDesign._id,
      productId: productObject._id,          // ID of the base Product (e.g., "Men's Premium Tee")
      productName: productObject.name,
      variantSku: selectedVariant.sku,         // SKU of the specific chosen variant
      productType: productTypeObject.name,   // e.g., "T-Shirt"
      size: selectedVariant.size,
      color: selectedVariant.colorName,
      // Price will be calculated on backend using productObject.basePrice + selectedVariant.priceModifier
      prompt: selectedDesign.prompt,
      imageDataUrl: selectedDesign.imageDataUrl, // AI-generated design image
      productImage: selectedVariant.imageMockupFront, // Mockup of the selected variant for summary display
    };

    console.log("[ProductStudio] Data being sent to checkout:", JSON.stringify(productDetailsForCheckout, null, 2));
    navigate('/checkout', { state: { itemToCheckout: productDetailsForCheckout } }); // Changed key to itemToCheckout for clarity
  };

  const handleDismissInfoAlert = () => {
    setShowInfoAlert(false);
    localStorage.setItem(INFO_ALERT_DISMISSED_KEY, 'true');
  };
  
  // Handler functions for select changes
  const handleProductTypeChange = (e) => {
    setSelectedProductTypeId(e.target.value);
    setSelectedProductId(''); setSelectedProductColor(''); setSelectedProductSize(''); setSelectedVariant(null); setSelectedDesign(null);
  };
  const handleProductChange = (e) => {
    setSelectedProductId(e.target.value);
    setSelectedProductColor(''); setSelectedProductSize(''); setSelectedVariant(null); setSelectedDesign(null);
  };
  const handleColorChange = (e) => {
    setSelectedProductColor(e.target.value);
    setSelectedProductSize(''); setSelectedVariant(null); setSelectedDesign(null); // Also reset design if appearance changes
  };
   const handleSizeChange = (e) => {
    setSelectedProductSize(e.target.value);
    // selectedVariant will be updated by useEffect
  };


  return (
    <Box maxW="container.xl" mx="auto" px={{base: 4, md: 0}} pb={10}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="pageTitle" color="brand.textLight" textAlign="left" w="100%" mb={{ base: 4, md: 6 }}>
          👕 Customize Your Apparel!
        </Heading>
        
        {showInfoAlert && (
          <Alert status="info" borderRadius="md" bg="brand.paper" color="brand.textDark" variant="subtle" alignItems="flex-start">
            <AlertIcon color="blue.500" mt={1} />
            <Box flex="1" mr={6}>
              Want a brand new design?
              <ChakraLink as={RouterLink} to="/generate" color="brand.primaryDark" fontWeight="bold" ml={1} _hover={{textDecoration: "underline"}}>
                Create it in the AI Image Generator first
              </ChakraLink>
              , save it, then come back here!
            </Box>
            <ChakraCloseButton size="md" onClick={handleDismissInfoAlert} position="relative" right="-8px" top="-8px" />
          </Alert>
        )}

        <Box p={{base: 4, md: 6}} borderWidth="1px" borderRadius="xl" shadow="lg" bg="brand.paper">
          <Heading as="h2" fontSize={{ base: "lg", md: "xl" }} mb={6} color="brand.textDark">1. Choose Your Apparel</Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg:4 }} spacing={6}> {/* Changed to 4 columns for new Product dropdown */}
            <VStack align="stretch">
              <Text fontWeight="medium" color="brand.textDark">Product Type:</Text>
              <Select value={selectedProductTypeId} onChange={handleProductTypeChange} placeholder={loadingProductTypes ? "Loading..." : "Select Type"} isDisabled={loadingProductTypes || availableProductTypes.length === 0} size="lg" bg="white">
                {availableProductTypes.map(pt => <option key={pt._id} value={pt._id}>{pt.name}</option>)}
              </Select>
            </VStack>

            <VStack align="stretch">
              <Text fontWeight="medium" color="brand.textDark">Specific Product:</Text>
              <Select value={selectedProductId} onChange={handleProductChange} placeholder={loadingProductsOfType ? "Loading..." : "Select Product"} isDisabled={!selectedProductTypeId || loadingProductsOfType || productsOfType.length === 0} size="lg" bg="white">
                {productsOfType.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </Select>
            </VStack>

            <VStack align="stretch">
              <Text fontWeight="medium" color="brand.textDark">Color:</Text>
              <Select value={selectedProductColor} onChange={handleColorChange} placeholder="Select Color" isDisabled={!selectedProductId || availableColors.length === 0} size="lg" bg="white">
                {availableColors.map(pc => <option key={pc.value} value={pc.value}>{pc.label}</option>)}
              </Select>
            </VStack>

            <VStack align="stretch">
              <Text fontWeight="medium" color="brand.textDark">Size:</Text>
              <Select value={selectedProductSize} onChange={handleSizeChange} placeholder="Select Size" isDisabled={!selectedProductColor || availableSizes.length === 0} size="lg" bg="white">
                {availableSizes.map(ps => <option key={ps.value} value={ps.value}>{ps.label}</option>)}
              </Select>
            </VStack>
          </SimpleGrid>
        </Box>

        <Divider my={4} borderColor="brand.secondary"/>

        <Box p={{base: 4, md: 6}} borderWidth="1px" borderRadius="xl" shadow="lg" bg="brand.paper">
          <Heading as="h2" fontSize={{ base: "lg", md: "xl" }} mb={6} color="brand.textDark">2. Choose Your Saved Design</Heading>
          {loadingDesigns && <Box textAlign="center" py={10}><Spinner size="xl" color="brand.primary" thickness="4px"/><Text mt={3}>Loading designs...</Text></Box>}
          {!loadingDesigns && designsError && <Alert status="error" /* ... */ >{designsError}</Alert>}
          {!loadingDesigns && !designsError && designs.length === 0 && <Text textAlign="center" py={10}>You have no saved designs. Go <ChakraLink as={RouterLink} to="/generate" color="brand.primaryDark" fontWeight="bold">generate</ChakraLink> some!</Text>}
          {!loadingDesigns && !designsError && designs.length > 0 && (
            <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={4}>
              {designs.map(design => (
                <Box key={design._id} borderWidth="2px" borderRadius="md" overflow="hidden" onClick={() => setSelectedDesign(design)} cursor="pointer"
                     borderColor={selectedDesign?._id === design._id ? "brand.accentYellow" : "brand.secondary"}
                     transform={selectedDesign?._id === design._id ? "scale(1.05)" : "none"}
                     _hover={{ shadow: "lg", borderColor: "brand.accentYellow" }} transition="all 0.2s">
                  <Image src={design.imageDataUrl} alt={design.prompt || 'User design'} h="150px" w="100%" objectFit="cover" fallbackSrc="https://via.placeholder.com/150?text=No+Image" />
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>
        
        <Divider my={4} borderColor="brand.secondary"/>

        <Box p={{base: 4, md: 6}} borderWidth="1px" borderRadius="xl" shadow="lg" bg="brand.paper">
            <Heading as="h2" fontSize={{ base: "lg", md: "xl" }} mb={6} color="brand.textDark">3. Preview Your Masterpiece!</Heading>
            <Box w={`${CANVAS_WIDTH}px`} h={`${CANVAS_HEIGHT}px`} bg={selectedVariant?.colorHex ? (selectedVariant.colorName.toLowerCase().includes("white") || selectedVariant.colorName.toLowerCase().includes("light") ? "gray.200" : "gray.700") : "gray.300" } mx="auto" borderWidth="1px" borderColor="brand.secondary" borderRadius="md" overflow="hidden" position="relative">
                <canvas ref={canvasEl} id="mockupCanvas"></canvas>
            </Box>
            {selectedDesign && selectedVariant && (
                <VStack spacing={6} mt={6}>
                    <Text color="brand.textDark" fontWeight="medium" textAlign="center" fontSize="lg">
                        Your design "{selectedDesign.prompt}" on a {selectedVariant.size} {selectedVariant.colorName} {productsOfType.find(p=>p._id === selectedProductId)?.name || 'Apparel'}
                    </Text>
                    <Button bg="brand.accentYellow" color="brand.textDark" _hover={{ bg: "brand.accentYellowHover" }} size="lg" px={8} borderRadius="full" boxShadow="md" onClick={handleProceedToCheckout} leftIcon={<Icon as={FaShoppingCart} />}>
                        Proceed to Checkout
                    </Button>
                </VStack>
            )}
            {(!selectedDesign || !selectedVariant) && (
                <Text color="brand.textLight" fontStyle="italic" textAlign="center" mt={6}>
                    Please select product options and a design to see a preview and checkout.
                </Text>
            )}
        </Box>
      </VStack>
    </Box>
  );
}
