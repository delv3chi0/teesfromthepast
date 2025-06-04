// frontend/src/pages/ProductStudio.jsx
import { useState, useEffect, useRef } from 'react';
// NO 'fabric' import here. We rely on window.fabric from the script tag in index.html.

import {
    Box, Heading, Text, VStack, Select,
    SimpleGrid, Image, Spinner, Alert, AlertIcon, CloseButton,
    Link as ChakraLink, Divider, useToast, Icon, Button
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart } from 'react-icons/fa';

const productTypes = [
  { value: 'tee', label: 'T-Shirt', mockups: { white: '/images/mockups/white_tee.png', black: '/images/mockups/black_tee.png' } },
  { value: 'hoodie', label: 'Hoodie', mockups: { white: '/images/mockups/white_hoodie.png', black: '/images/mockups/black_hoodie.png' } },
];

const productColors = [
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
];

const productSizes = ['S', 'M', 'L', 'XL', 'XXL'];

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

  const [selectedProductType, setSelectedProductType] = useState(productTypes[0].value);
  const [selectedProductColor, setSelectedProductColor] = useState(productColors[0].value);
  const [selectedProductSize, setSelectedProductSize] = useState(productSizes[2]); // Default to 'L'
  const [selectedDesign, setSelectedDesign] = useState(null); // Stores the full design object

  const [showInfoAlert, setShowInfoAlert] = useState(false);

  const canvasEl = useRef(null);
  const fabricCanvas = useRef(null);

  useEffect(() => {
    const dismissed = localStorage.getItem(INFO_ALERT_DISMISSED_KEY);
    if (dismissed !== 'true') {
      setShowInfoAlert(true);
    }
  }, []);
  
  const fetchUserDesigns = () => {
    setLoadingDesigns(true);
    setDesignsError('');
    setDesigns([]);
    client.get('/mydesigns')
      .then(response => {
        setDesigns(response.data);
        setLoadingDesigns(false);
      })
      .catch(err => {
        console.error("[ProductStudio] Error fetching designs for studio:", err);
        setDesignsError('Could not load your saved designs.');
        if (err.response?.status === 401) {
          toast({ title: "Session Expired", description: "Please log in again.", status: "warning", duration: 3000, isClosable: true });
          logout();
          navigate('/login');
        }
        setLoadingDesigns(false);
      });
  };

  useEffect(() => {
    if (user) {
      fetchUserDesigns();
    } else {
      setLoadingDesigns(false);
      setDesigns([]);
      setDesignsError('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Removed logout, navigate, toast as they are stable

  const getCurrentMockupSrc = () => {
    const product = productTypes.find(p => p.value === selectedProductType);
    return product?.mockups[selectedProductColor] || '';
  };

  useEffect(() => {
    const fabricScriptPollInterval = 100;
    const maxPolls = 50;
    let pollCount = 0;

    const setupCanvas = (fabricInstance) => {
      if (!fabricCanvas.current && canvasEl.current) {
        fabricCanvas.current = new fabricInstance.Canvas(canvasEl.current, {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        });
      }

      const FCanvas = fabricCanvas.current;
      if (FCanvas) {
        FCanvas.clear();
        const mockupSrc = getCurrentMockupSrc();

        if (mockupSrc) {
          fabricInstance.Image.fromURL(mockupSrc, (mockupImg) => {
            if (!mockupImg || mockupImg.width === 0 || mockupImg.height === 0) {
              console.error("[ProductStudio] Mockup image loaded with zero dimensions or is null:", mockupSrc, mockupImg);
              FCanvas.setBackgroundColor('lightgrey', FCanvas.renderAll.bind(FCanvas));
              return;
            }
            FCanvas.setBackgroundImage(mockupImg, FCanvas.renderAll.bind(FCanvas), {
              scaleX: CANVAS_WIDTH / mockupImg.width,
              scaleY: CANVAS_HEIGHT / mockupImg.height,
              selectable: false,
              evented: false,
            });
          }, { crossOrigin: 'anonymous' });
        } else {
          FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
          FCanvas.setBackgroundColor('white', FCanvas.renderAll.bind(FCanvas));
        }

        if (selectedDesign?.imageDataUrl) {
          fabricInstance.Image.fromURL(selectedDesign.imageDataUrl, (designImg) => {
            if (!designImg || designImg.width === 0 || designImg.height === 0) {
              console.error("[ProductStudio] Design image loaded with zero dimensions or is null:", selectedDesign.imageDataUrl.substring(0,50) + "...");
              return;
            }
            const designWidth = CANVAS_WIDTH * 0.33; // Example: design covers 1/3 of canvas width
            designImg.scaleToWidth(designWidth);
            // Example positioning (center chest area)
            const designLeft = (CANVAS_WIDTH - designImg.getScaledWidth()) * 0.5;
            const designTop = CANVAS_HEIGHT * 0.24; // Adjust this based on mockup type

            designImg.set({ top: designTop, left: designLeft });
            FCanvas.add(designImg);
            FCanvas.renderAll();
          }, { crossOrigin: 'anonymous' });
        } else {
          if (FCanvas.backgroundImage || FCanvas.backgroundColor) {
            FCanvas.renderAll();
          }
        }
      }
    };

    const pollForFabric = () => {
      const fabricInstance = window.fabric;
      if (fabricInstance && fabricInstance.Canvas) {
        setupCanvas(fabricInstance);
      } else {
        pollCount++;
        if (pollCount < maxPolls) {
          setTimeout(pollForFabric, fabricScriptPollInterval);
        } else {
          console.error("[ProductStudio] Fabric.js did NOT become available on window object after polling.");
          toast({ title: "Preview Error", description: "Cannot initialize product preview (Fabric.js timeout).", status: "error", duration: 7000, isClosable: true });
        }
      }
    };

    if (canvasEl.current) {
      pollForFabric();
    }
  // Recalculate getCurrentMockupSrc only when relevant state changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDesign, selectedProductType, selectedProductColor, toast]);


  const handleProceedToCheckout = () => {
    if (!selectedDesign || !selectedDesign._id || !selectedDesign.imageDataUrl || !selectedDesign.prompt) {
        toast({
            title: "Design Not Fully Selected",
            description: "Please select one of your saved designs. Ensure it has all necessary details.",
            status: "warning",
            duration: 5000,
            isClosable: true,
        });
        console.warn("[ProductStudio] Attempted to checkout with incomplete selectedDesign:", selectedDesign);
        return;
    }

    if (!selectedProductType || !selectedProductColor || !selectedProductSize) {
        toast({
            title: "Product Details Missing",
            description: "Please ensure product type, color, and size are selected.",
            status: "warning",
            duration: 5000,
            isClosable: true,
        });
        return;
    }

    const productTypeObject = productTypes.find(p => p.value === selectedProductType);
    if (!productTypeObject || !productTypeObject.label) {
        console.error("[ProductStudio] Could not find label for product type value:", selectedProductType);
        toast({ title: "Error", description: "Invalid product type selected.", status: "error", duration: 5000, isClosable: true });
        return;
    }

    const productDetailsForCheckout = {
        designId: selectedDesign._id,
        productType: productTypeObject.label, // e.g., "T-Shirt", "Hoodie"
        size: selectedProductSize,
        color: selectedProductColor, // e.g., "white", "black"
        prompt: selectedDesign.prompt,
        imageDataUrl: selectedDesign.imageDataUrl, // This is the AI-generated design image
        productImage: getCurrentMockupSrc(), // Base mockup image for summary display
    };

    console.log("[ProductStudio] Data being sent to checkout:", JSON.stringify(productDetailsForCheckout, null, 2));

    const requiredFields = ['designId', 'productType', 'size', 'color', 'prompt', 'imageDataUrl'];
    const missing = requiredFields.filter(field => !productDetailsForCheckout[field]);

    if (missing.length > 0) {
        console.error("[ProductStudio] CRITICAL: Fields missing before navigating:", missing.join(', '), productDetailsForCheckout);
        toast({
            title: "Internal Error",
            description: `Could not prepare all product details for checkout (missing: ${missing.join(', ')}). Please try again.`,
            status: "error",
            duration: 7000,
            isClosable: true,
        });
        return;
    }

    navigate('/checkout', { state: { designToCheckout: productDetailsForCheckout } });
  };

  const handleDismissInfoAlert = () => {
    setShowInfoAlert(false);
    localStorage.setItem(INFO_ALERT_DISMISSED_KEY, 'true');
  };

  return (
    <Box maxW="container.xl" mx="auto" px={{base: 4, md: 0}} pb={10}>
      <VStack spacing={6} align="stretch">
        {/* Page Title - UPDATED FOR UNIFORMITY */}
        <Heading
          as="h1"
          size="pageTitle" // Using the new custom size from theme.js
          color="brand.textLight"
          textAlign="left"
          w="100%"
          mb={{ base: 4, md: 6 }} // Consistent bottom margin
        >
          👕 Customize Your Apparel!
        </Heading>
        
        {showInfoAlert && (
          <Alert
            status="info"
            borderRadius="md"
            bg="brand.paper"
            color="brand.textDark"
            variant="subtle"
            alignItems="flex-start"
          >
            <AlertIcon color="blue.500" mt={1} />
            <Box flex="1" mr={6}>
              Want a brand new design for your product?
              <ChakraLink as={RouterLink} to="/generate" color="brand.primaryDark" fontWeight="bold" ml={1} _hover={{textDecoration: "underline"}}>
                Create it in the AI Image Generator first
              </ChakraLink>
              , save it, then come back here to choose it!
            </Box>
            <CloseButton
              size="md"
              onClick={handleDismissInfoAlert}
              position="relative"
              right="-8px"
              top="-8px"
            />
          </Alert>
        )}

        <Box p={{base: 4, md: 6}} borderWidth="1px" borderRadius="xl" shadow="lg" bg="brand.paper">
          <Heading as="h2" fontSize={{ base: "lg", md: "xl" }} mb={6} color="brand.textDark">1. Choose Your Apparel</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <VStack align="stretch">
              <Text fontWeight="medium" color="brand.textDark">Product Type:</Text>
              <Select
                value={selectedProductType}
                // When product type changes, reset design as mockups/design placement might differ
                onChange={(e) => { setSelectedProductType(e.target.value); setSelectedDesign(null);}} 
                bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark"
                size="lg"
              >
                {productTypes.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
              </Select>
            </VStack>
            <VStack align="stretch">
              <Text fontWeight="medium" color="brand.textDark">Color:</Text>
              <Select
                value={selectedProductColor}
                // When color changes, reset design as mockups/design placement might differ
                onChange={(e) => { setSelectedProductColor(e.target.value); setSelectedDesign(null);}}
                bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark"
                size="lg"
              >
                {productColors.map(pc => <option key={pc.value} value={pc.value}>{pc.label}</option>)}
              </Select>
            </VStack>
            <VStack align="stretch">
              <Text fontWeight="medium" color="brand.textDark">Size:</Text>
              <Select
                value={selectedProductSize}
                onChange={(e) => setSelectedProductSize(e.target.value)}
                bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark"
                size="lg"
              >
                {productSizes.map(ps => <option key={ps} value={ps}>{ps}</option>)}
              </Select>
            </VStack>
          </SimpleGrid>
        </Box>

        <Divider my={4} borderColor="brand.secondary"/>

        <Box p={{base: 4, md: 6}} borderWidth="1px" borderRadius="xl" shadow="lg" bg="brand.paper">
          <Heading as="h2" fontSize={{ base: "lg", md: "xl" }} mb={6} color="brand.textDark">2. Choose Your Saved Design</Heading>
          {loadingDesigns && (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" color="brand.primary" thickness="4px"/>
              <Text mt={3} color="brand.textDark">Loading designs...</Text>
            </Box>
          )}
          {!loadingDesigns && designsError && (
            <Alert status="error" borderRadius="md" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" py={6}>
              <AlertIcon boxSize="30px" />
              <Text fontWeight="bold" mt={3}>{designsError}</Text>
              <Button mt={4} size="sm" bg="brand.accentYellow" color="brand.textDark" _hover={{ bg: "brand.accentYellowHover" }} borderRadius="full" onClick={() => { if(user) fetchUserDesigns(); else navigate('/login');}}>
                  {user ? "Try Again" : "Login to View Designs"}
              </Button>
            </Alert>
          )}
          {!loadingDesigns && !designsError && designs.length === 0 && (
            <Text color="brand.textDark" textAlign="center" py={10}>
              You have no saved designs yet. Go to the <ChakraLink as={RouterLink} to="/generate" color="brand.primaryDark" fontWeight="bold">AI Image Generator</ChakraLink> to create some!
            </Text>
          )}
          {!loadingDesigns && !designsError && designs.length > 0 && (
            <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={4}>
              {designs.map(design => (
                <Box
                  key={design._id}
                  borderWidth="2px"
                  borderRadius="md"
                  overflow="hidden"
                  onClick={() => setSelectedDesign(design)}
                  cursor="pointer"
                  borderColor={selectedDesign?._id === design._id ? "brand.accentYellow" : "brand.secondary"}
                  transform={selectedDesign?._id === design._id ? "scale(1.05)" : "none"}
                  _hover={{ shadow: "lg", borderColor: "brand.accentYellow" }}
                  transition="all 0.2s"
                >
                  <Image src={design.imageDataUrl} alt={design.prompt || 'User design'} h="150px" w="100%" objectFit="cover" fallbackSrc="https://via.placeholder.com/150?text=No+Image" />
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>
        
        <Divider my={4} borderColor="brand.secondary"/>

        <Box p={{base: 4, md: 6}} borderWidth="1px" borderRadius="xl" shadow="lg" bg="brand.paper">
            <Heading as="h2" fontSize={{ base: "lg", md: "xl" }} mb={6} color="brand.textDark">3. Preview Your Masterpiece!</Heading>
             <Box
                w={`${CANVAS_WIDTH}px`}
                h={`${CANVAS_HEIGHT}px`}
                bg={selectedProductColor === 'white' ? 'gray.100' : 'gray.700'}
                mx="auto"
                borderWidth="1px"
                borderColor="brand.secondary"
                borderRadius="md"
                overflow="hidden"
                position="relative"
            >
                <canvas ref={canvasEl} id="mockupCanvas"></canvas>
            </Box>
            {selectedDesign && (
                <VStack spacing={6} mt={6}>
                    <Text color="brand.textDark" fontWeight="medium" textAlign="center" fontSize="lg">
                        Your design "{selectedDesign.prompt}" on a {selectedProductSize} {selectedProductColor} {productTypes.find(p=>p.value === selectedProductType)?.label || selectedProductType}
                    </Text>
                    <Button
                        bg="brand.accentYellow"
                        color="brand.textDark"
                        _hover={{ bg: "brand.accentYellowHover" }}
                        size="lg"
                        px={8}
                        borderRadius="full"
                        boxShadow="md"
                        onClick={handleProceedToCheckout}
                        leftIcon={<Icon as={FaShoppingCart} />}
                    >
                        Proceed to Checkout
                    </Button>
                </VStack>
            )}
            {!selectedDesign && (
                 <Text color="brand.textLight" fontStyle="italic" textAlign="center" mt={6}>
                    Select your apparel options and a design above to see a preview and checkout.
                </Text>
            )}
        </Box>
      </VStack>
    </Box>
  );
}
