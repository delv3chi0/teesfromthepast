// frontend/src/pages/ProductStudio.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Heading, Text, VStack, Select,
  SimpleGrid, Image, Spinner, Alert, AlertIcon, CloseButton as ChakraCloseButton,
  Link as ChakraLink, Divider, useToast, Icon, Button
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart } from 'react-icons/fa';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const INFO_ALERT_DISMISSED_KEY = 'productStudioInfoAlertDismissed_v1';

export default function ProductStudio() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [designsError, setDesignsError] = useState('');
  const [selectedDesign, setSelectedDesign] = useState(null);

  const [availableProductTypes, setAvailableProductTypes] = useState([]);
  const [loadingProductTypes, setLoadingProductTypes] = useState(true);
  const [productsOfType, setProductsOfType] = useState([]);
  const [loadingProductsOfType, setLoadingProductsOfType] = useState(false);

  const [selectedProductTypeId, setSelectedProductTypeId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [availableColors, setAvailableColors] = useState([]);
  const [selectedProductColor, setSelectedProductColor] = useState('');
  const [availableSizes, setAvailableSizes] = useState([]);
  const [selectedProductSize, setSelectedProductSize] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(null);

  const [showInfoAlert, setShowInfoAlert] = useState(false);
  const canvasEl = useRef(null);
  const fabricCanvas = useRef(null);

  useEffect(() => {
    const dismissed = localStorage.getItem(INFO_ALERT_DISMISSED_KEY);
    if (dismissed !== 'true') {
      setShowInfoAlert(true);
    }
  }, []);

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

  useEffect(() => {
    setLoadingProductTypes(true);
    client.get('/storefront/product-types')
      .then(response => {
        setAvailableProductTypes(response.data || []);
      })
      .catch(err => {
        console.error("[ProductStudio] Error fetching product types:", err);
        toast({ title: "Load Error", description: "Could not load available product types.", status: "error" });
      })
      .finally(() => setLoadingProductTypes(false));
  }, [toast]);

  useEffect(() => {
    if (!selectedProductTypeId) {
      setProductsOfType([]);
      setSelectedProductId('');
      return;
    }
    setLoadingProductsOfType(true);
    setProductsOfType([]);
    setSelectedProductId('');
    client.get(`/storefront/products/type/${selectedProductTypeId}`)
      .then(response => {
        setProductsOfType(response.data || []);
      })
      .catch(err => {
        console.error(`[ProductStudio] Error fetching products for type ${selectedProductTypeId}:`, err);
        toast({ title: "Load Error", description: `Could not load products for selected type.`, status: "error" });
      })
      .finally(() => setLoadingProductsOfType(false));
  }, [selectedProductTypeId, toast]);

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
      if (uniqueColorObjects.length === 0) {
        setSelectedProductColor('');
      }
    } else {
      setAvailableColors([]);
      setSelectedProductColor('');
    }
  }, [selectedProductId, productsOfType]);

  useEffect(() => {
    if (!selectedProductId || !selectedProductColor || productsOfType.length === 0) {
      setAvailableSizes([]);
      setSelectedProductSize('');
      return;
    }
    const currentProduct = productsOfType.find(p => p._id === selectedProductId);
    let sizesForColor = [];
    if (currentProduct && currentProduct.variants && currentProduct.variants.length > 0) {
        const isNewFormat = currentProduct.variants[0].sizes !== undefined;
        if (isNewFormat) {
            const selectedColorVariant = currentProduct.variants.find(v => v.colorName === selectedProductColor);
            if (selectedColorVariant && Array.isArray(selectedColorVariant.sizes)) {
                sizesForColor = selectedColorVariant.sizes.map(sizeInfo => sizeInfo.size);
            }
        } else {
            sizesForColor = currentProduct.variants
                .filter(variant => variant.colorName === selectedProductColor && variant.size)
                .map(variant => variant.size)
                .filter((value, index, self) => self.indexOf(value) === index);
        }
    }
    setAvailableSizes(sizesForColor.map(s => ({ value: s, label: s })));
    if (!sizesForColor.includes(selectedProductSize)) {
      setSelectedProductSize('');
    }
  }, [selectedProductId, selectedProductColor, productsOfType]);

  useEffect(() => {
    if (selectedProductId && selectedProductColor && selectedProductSize && productsOfType.length > 0) {
      const product = productsOfType.find(p => p._id === selectedProductId);
      if (!product || !product.variants || product.variants.length === 0) {
          setSelectedVariant(null);
          return;
      }
      const isNewFormat = product.variants[0].sizes !== undefined;
      let finalVariant = null;
      if (isNewFormat) {
          const colorVariant = product.variants.find(v => v.colorName === selectedProductColor);
          if (colorVariant) {
              const sizeVariant = colorVariant.sizes.find(s => s.size === selectedProductSize);
              if (sizeVariant) {
                  finalVariant = { ...sizeVariant, colorName: colorVariant.colorName, colorHex: colorVariant.colorHex, imageMockupFront: colorVariant.imageMockupFront, imageMockupBack: colorVariant.imageMockupBack };
              }
          }
      } else {
          finalVariant = product.variants.find(v => v.colorName === selectedProductColor && v.size === selectedProductSize);
      }
      setSelectedVariant(finalVariant || null);
    } else {
      setSelectedVariant(null);
    }
  }, [selectedProductId, selectedProductColor, selectedProductSize, productsOfType]);

  useEffect(() => {
    const fabricScriptPollInterval = 100;
    const maxPolls = 50;
    let pollCount = 0;
    const setupCanvas = (fabricInstance) => {
      if (!fabricCanvas.current && canvasEl.current) {
        fabricCanvas.current = new fabricInstance.Canvas(canvasEl.current, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      }
      const FCanvas = fabricCanvas.current;
      if (!FCanvas) return;
      FCanvas.clear();
      const mockupSrc = selectedVariant?.imageMockupFront;
      if (mockupSrc) {
        fabricInstance.Image.fromURL(mockupSrc, (mockupImg) => {
          if (!mockupImg || mockupImg.width === 0) { FCanvas.setBackgroundColor('lightgrey', FCanvas.renderAll.bind(FCanvas)); return; }
          FCanvas.setBackgroundImage(mockupImg, FCanvas.renderAll.bind(FCanvas), { scaleX: CANVAS_WIDTH / mockupImg.width, scaleY: CANVAS_HEIGHT / mockupImg.height, selectable: false, evented: false });
        }, { crossOrigin: 'anonymous' });
      } else {
        FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
        FCanvas.setBackgroundColor('white', FCanvas.renderAll.bind(FCanvas));
      }
      if (selectedDesign?.imageDataUrl) {
        fabricInstance.Image.fromURL(selectedDesign.imageDataUrl, (designImg) => {
          if (!designImg || designImg.width === 0) { return; }
          const designWidth = CANVAS_WIDTH * 0.33; designImg.scaleToWidth(designWidth);
          const designLeft = (CANVAS_WIDTH - designImg.getScaledWidth()) * 0.5;
          const designTop = CANVAS_HEIGHT * 0.24;
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
        else { toast({ title: "Preview Error", description: "Cannot initialize product preview.", status: "error" }); }
      }
    };
    if (canvasEl.current) pollForFabric();
  }, [selectedDesign, selectedVariant, toast]);

  const handleProceedToCheckout = () => {
    if (!selectedDesign || !selectedDesign._id) { toast({ title: "Design Not Selected", description: "Please select one of your saved designs.", status: "warning" }); return; }
    if (!selectedVariant || !selectedVariant.sku || !selectedProductId || !selectedProductTypeId) { toast({ title: "Product Incomplete", description: "Please ensure product type, specific product, color, and size are selected.", status: "warning" }); return; }
    const productTypeObject = availableProductTypes.find(pt => pt._id === selectedProductTypeId);
    const productObject = productsOfType.find(p => p._id === selectedProductId);
    if (!productTypeObject || !productObject) { toast({ title: "Error", description: "Invalid product selection details.", status: "error" }); return; }
    const productDetailsForCheckout = { designId: selectedDesign._id, productId: productObject._id, productName: productObject.name, variantSku: selectedVariant.sku, productType: productTypeObject.name, size: selectedVariant.size, color: selectedVariant.colorName, prompt: selectedDesign.prompt, imageDataUrl: selectedDesign.imageDataUrl, productImage: selectedVariant.imageMockupFront };
    try {
      localStorage.setItem('itemToCheckout', JSON.stringify(productDetailsForCheckout));
      navigate('/checkout');
    } catch (error) {
      toast({ title: "Error", description: "Could not prepare item for checkout.", status: "error" });
    }
  };

  const handleDismissInfoAlert = () => {
    setShowInfoAlert(false);
    localStorage.setItem(INFO_ALERT_DISMISSED_KEY, 'true');
  };
  const handleProductTypeChange = (e) => {
    setSelectedProductTypeId(e.target.value);
    setSelectedProductId(''); setSelectedProductColor(''); setSelectedProductSize(''); setSelectedVariant(null);
  };
  const handleProductChange = (e) => {
    setSelectedProductId(e.target.value);
    setSelectedProductColor(''); setSelectedProductSize(''); setSelectedVariant(null);
  };
  const handleColorChange = (e) => {
    setSelectedProductColor(e.target.value);
    setSelectedProductSize(''); setSelectedVariant(null);
  };
  const handleSizeChange = (e) => {
    setSelectedProductSize(e.target.value);
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
          <SimpleGrid columns={{ base: 1, md: 2, lg:4 }} spacing={6}>
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
          {!loadingDesigns && designsError && <Alert status="error"><AlertIcon />{designsError}</Alert>}
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
            <Box w={`${CANVAS_WIDTH}px`} h={`${CANVAS_HEIGHT}px`} bg="gray.200" mx="auto" borderWidth="1px" borderColor="brand.secondary" borderRadius="md" overflow="hidden" position="relative">
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
