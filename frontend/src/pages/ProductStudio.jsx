// frontend/src/pages/ProductStudio.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
// Fabric.js is loaded via window.fabric from index.html

import {
    Box, Heading, Text, VStack, Select,
    SimpleGrid, Image, Spinner, Alert, AlertIcon, CloseButton,
    Link as ChakraLink, Divider, useToast, Icon, Button
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart, FaImage } from 'react-icons/fa'; // Added FaImage for placeholder

const productTypes = [
  { value: 'tee', label: 'T-Shirt', mockups: { white: '/images/mockups/white_tee.png', black: '/images/mockups/black_tee.png' }, designArea: { top: 0.22, left: 0.33, width: 0.34, height: 0.45 } },
  { value: 'hoodie', label: 'Hoodie', mockups: { white: '/images/mockups/white_hoodie.png', black: '/images/mockups/black_hoodie.png' }, designArea: { top: 0.20, left: 0.34, width: 0.32, height: 0.35 } },
];

const productColors = [
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
];

const productSizes = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']; // Added XXXL

const CANVAS_WIDTH = 450; // Slightly increased for better detail
const CANVAS_HEIGHT = 450;

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
  const [selectedProductSize, setSelectedProductSize] = useState(productSizes[2]);
  const [selectedDesign, setSelectedDesign] = useState(null);

  const [showInfoAlert, setShowInfoAlert] = useState(false);

  const canvasEl = useRef(null);
  const fabricCanvas = useRef(null); // Stores the fabric.Canvas instance

  useEffect(() => {
    const dismissed = localStorage.getItem(INFO_ALERT_DISMISSED_KEY);
    if (dismissed !== 'true') {
      setShowInfoAlert(true);
    }
  }, []);
  
  const fetchUserDesigns = useCallback(() => { // Wrapped in useCallback
    if (!user) {
      setLoadingDesigns(false);
      setDesigns([]);
      setDesignsError(''); // Clear error if user logs out
      return;
    }
    setLoadingDesigns(true);
    setDesignsError('');
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
          logout(); // Ensure logout is called
          navigate('/login');
        }
        setLoadingDesigns(false);
      });
  }, [user, toast, logout, navigate]); // Added dependencies

  useEffect(() => {
    fetchUserDesigns();
  }, [fetchUserDesigns]);


  const getCurrentMockupSrc = useCallback(() => {
    const product = productTypes.find(p => p.value === selectedProductType);
    return product?.mockups[selectedProductColor] || '';
  }, [selectedProductType, selectedProductColor]);

  const getCurrentDesignArea = useCallback(() => {
    const product = productTypes.find(p => p.value === selectedProductType);
    return product?.designArea || { top: 0.25, left: 0.33, width: 0.33, height: 0.4 }; // Default design area
  }, [selectedProductType]);


  useEffect(() => {
    const fabricScriptPollInterval = 100;
    const maxPolls = 50; // 5 seconds total
    let pollCount = 0;
    let fabricInstance = window.fabric;

    const setupCanvas = () => {
      if (!fabricCanvas.current && canvasEl.current && fabricInstance && fabricInstance.Canvas) {
        fabricCanvas.current = new fabricInstance.Canvas(canvasEl.current, {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          selection: false, // Disable group selection on canvas by default
        });
      }

      const FCanvas = fabricCanvas.current;
      if (FCanvas) {
        FCanvas.clear(); // Clear previous objects and background
        const mockupSrc = getCurrentMockupSrc();

        if (mockupSrc) {
          fabricInstance.Image.fromURL(mockupSrc, (mockupImg) => {
            if (!mockupImg || !mockupImg.width || !mockupImg.height) {
              console.error("Mockup image failed to load or has no dimensions:", mockupSrc);
              FCanvas.setBackgroundColor('lightgrey', FCanvas.renderAll.bind(FCanvas));
              return;
            }
            FCanvas.setBackgroundImage(mockupImg, FCanvas.renderAll.bind(FCanvas), {
              scaleX: CANVAS_WIDTH / mockupImg.width,
              scaleY: CANVAS_HEIGHT / mockupImg.height,
              selectable: false, evented: false,
            });
          }, { crossOrigin: 'anonymous' });
        } else {
          FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
          FCanvas.setBackgroundColor('lightgray', FCanvas.renderAll.bind(FCanvas)); // Fallback background
        }

        if (selectedDesign?.imageDataUrl) {
          fabricInstance.Image.fromURL(selectedDesign.imageDataUrl, (designImg) => {
            if (!designImg || !designImg.width || !designImg.height) {
               console.error("Design image failed to load or has no dimensions for canvas.");
               return;
            }
            const designArea = getCurrentDesignArea();
            const targetWidth = CANVAS_WIDTH * designArea.width;
            const targetHeight = CANVAS_HEIGHT * designArea.height;

            const scaleToFit = Math.min(targetWidth / designImg.width, targetHeight / designImg.height);
            designImg.scale(scaleToFit);
            
            designImg.set({
              left: CANVAS_WIDTH * designArea.left + (targetWidth - designImg.getScaledWidth()) / 2,
              top: CANVAS_HEIGHT * designArea.top + (targetHeight - designImg.getScaledHeight()) / 2,
              selectable: true, // Make the design selectable and movable
              hasControls: true,
              hasBorders: true,
              cornerColor: 'rgba(102,153,255,0.5)', // Example control color
              borderColor: 'rgba(102,153,255,0.7)',
              cornerSize: 10,
              transparentCorners: false,
            });
            FCanvas.add(designImg);
            FCanvas.setActiveObject(designImg); // Make it active for controls
            FCanvas.renderAll();
          }, { crossOrigin: 'anonymous' });
        }
      }
    };

    const pollForFabric = () => {
      fabricInstance = window.fabric; // Re-check window.fabric
      if (fabricInstance && fabricInstance.Canvas) {
        console.log("[ProductStudio] Fabric.js loaded, setting up canvas.");
        setupCanvas();
      } else {
        pollCount++;
        if (pollCount < maxPolls) {
          setTimeout(pollForFabric, fabricScriptPollInterval);
        } else {
          console.error("[ProductStudio] Fabric.js did NOT load after polling.");
          toast({ title: "Preview Error", description: "Cannot initialize product preview. Please refresh.", status: "error", duration: 7000, isClosable: true });
        }
      }
    };

    if (canvasEl.current) {
      pollForFabric();
    }
    
    // Cleanup function for when component unmounts or dependencies change
    return () => {
      if (fabricCanvas.current) {
        console.log("[ProductStudio] Disposing Fabric.js canvas.");
        fabricCanvas.current.dispose();
        fabricCanvas.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDesign, selectedProductType, selectedProductColor, toast, getCurrentMockupSrc, getCurrentDesignArea]); // Added getCurrentMockupSrc and getCurrentDesignArea as they are now useCallback deps


  const handleProceedToCheckout = () => {
    // ... (Your existing handleProceedToCheckout logic - ensure it's robust) ...
    if (!selectedDesign || !selectedDesign._id || !selectedDesign.imageDataUrl || !selectedDesign.prompt) {
        toast({ title: "Design Not Selected", description: "Please select one of your saved designs.", status: "warning", duration: 3000, isClosable: true }); return;
    }
    if (!selectedProductType || !selectedProductColor || !selectedProductSize) {
        toast({ title: "Product Details Missing", description: "Please select product type, color, and size.", status: "warning", duration: 3000, isClosable: true }); return;
    }
    const productTypeObject = productTypes.find(p => p.value === selectedProductType);

    const productDetailsForCheckout = {
        designId: selectedDesign._id,
        productType: productTypeObject?.label || selectedProductType,
        size: selectedProductSize,
        color: selectedProductColor,
        prompt: selectedDesign.prompt,
        imageDataUrl: selectedDesign.imageDataUrl,
        productImage: getCurrentMockupSrc(),
    };
    navigate('/checkout', { state: { designToCheckout: productDetailsForCheckout } });
  };

  const handleDismissInfoAlert = () => {
    setShowInfoAlert(false);
    localStorage.setItem(INFO_ALERT_DISMISSED_KEY, 'true');
  };

  return (
    <Box maxW="container.xl" mx="auto" /* px and pb removed from here, MainLayout handles it */>
      <VStack spacing={6} align="stretch">
        <Heading
          as="h1"
          size="pageTitle" // Uniform page title style
          color="brand.textLight"
          textAlign="left"
          w="100%"
          mb={{ base: 4, md: 6 }} // Consistent bottom margin
        >
          👕 Customize Your Apparel!
        </Heading>
        
        {showInfoAlert && (
          <Alert status="info" borderRadius="md" bg="brand.paper" color="brand.textDark" variant="subtle" alignItems="flex-start" py={3} px={4}>
            <AlertIcon color="blue.500" mt={1} />
            <Box flex="1" mr={6}>
              Want a brand new design for your product?
              <ChakraLink as={RouterLink} to="/generate" color="brand.primaryDark" fontWeight="bold" ml={1} _hover={{textDecoration: "underline"}}>
                Create it in the AI Image Generator first
              </ChakraLink>
              , save it, then come back here to choose it!
            </Box>
            <CloseButton size="md" onClick={handleDismissInfoAlert} position="relative" right="-8px" top="-8px" />
          </Alert>
        )}

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            {/* Left Column: Controls and Design Selection */}
            <VStack spacing={6} align="stretch">
                <Box p={{base: 4, md: 6}} borderWidth="1px" borderRadius="xl" shadow="lg" bg="brand.paper">
                    <Heading as="h2" fontSize={{ base: "lg", md: "xl" }} mb={6} color="brand.textDark">1. Choose Your Apparel</Heading>
                    <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={5}>
                        <FormControl> <FormLabel fontWeight="medium" color="brand.textDark">Product Type:</FormLabel> <Select value={selectedProductType} onChange={(e) => { setSelectedProductType(e.target.value); /* setSelectedDesign(null); */}} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" size="lg"> {productTypes.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)} </Select> </FormControl>
                        <FormControl> <FormLabel fontWeight="medium" color="brand.textDark">Color:</FormLabel> <Select value={selectedProductColor} onChange={(e) => { setSelectedProductColor(e.target.value); /* setSelectedDesign(null); */}} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" size="lg"> {productColors.map(pc => <option key={pc.value} value={pc.value}>{pc.label}</option>)} </Select> </FormControl>
                        <FormControl> <FormLabel fontWeight="medium" color="brand.textDark">Size:</FormLabel> <Select value={selectedProductSize} onChange={(e) => setSelectedProductSize(e.target.value)} bg="white" borderColor="brand.secondary" focusBorderColor="brand.primaryDark" size="lg"> {productSizes.map(ps => <option key={ps} value={ps}>{ps}</option>)} </Select> </FormControl>
                    </SimpleGrid>
                </Box>

                <Box p={{base: 4, md: 6}} borderWidth="1px" borderRadius="xl" shadow="lg" bg="brand.paper">
                    <Heading as="h2" fontSize={{ base: "lg", md: "xl" }} mb={6} color="brand.textDark">2. Choose Your Saved Design</Heading>
                    {loadingDesigns && ( <Box textAlign="center" py={10}><Spinner size="lg" color="brand.primary" /><Text mt={3} color="brand.textDark">Loading designs...</Text></Box> )}
                    {!loadingDesigns && designsError && ( <Alert status="error" borderRadius="md" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" py={6}><AlertIcon boxSize="30px" /><Text fontWeight="bold" mt={3}>{designsError}</Text><Button mt={4} size="sm" colorScheme="brandAccentYellow" onClick={() => user ? fetchUserDesigns() : navigate('/login')}>{user ? "Try Again" : "Login to View Designs"}</Button></Alert> )}
                    {!loadingDesigns && !designsError && designs.length === 0 && ( <Text color="brand.textDark" textAlign="center" py={10}>You have no saved designs. Go to the <ChakraLink as={RouterLink} to="/generate" color="brand.primaryDark" fontWeight="bold">AI Generator</ChakraLink>!</Text> )}
                    {!loadingDesigns && !designsError && designs.length > 0 && (
                        <SimpleGrid columns={{ base: 3, sm: 4, md: 4, lg: 5 }} spacing={3}>
                        {designs.map(design => (
                            <Box key={design._id} borderWidth="3px" borderRadius="lg" overflow="hidden" onClick={() => setSelectedDesign(design)} cursor="pointer"
                                borderColor={selectedDesign?._id === design._id ? "brand.accentYellow" : "transparent"}
                                transform={selectedDesign?._id === design._id ? "scale(1.08)" : "none"}
                                _hover={{ shadow: "md", borderColor: "brand.accentYellow" }}
                                transition="all 0.15s ease-out" position="relative"
                            >
                                <Image src={design.imageDataUrl} alt={design.prompt || 'User design'} h={{base:"80px",sm:"100px", md:"120px"}} w="100%" objectFit="cover" fallbackSrc="https://via.placeholder.com/100?text=Design" />
                                {selectedDesign?._id === design._id && (
                                    <Box position="absolute" top="0" left="0" right="0" bottom="0" bg="brand.accentYellowAlpha" display="flex" alignItems="center" justifyContent="center">
                                        <Icon as={FaImage} color="white" boxSize={8}/>
                                    </Box>
                                )}
                            </Box>
                        ))}
                        </SimpleGrid>
                    )}
                </Box>
            </VStack>

            {/* Right Column: Canvas Preview and Checkout */}
            <VStack spacing={6} align="stretch">
                <Box p={{base: 4, md: 6}} borderWidth="1px" borderRadius="xl" shadow="lg" bg="brand.paper">
                    <Heading as="h2" fontSize={{ base: "lg", md: "xl" }} mb={6} color="brand.textDark">3. Preview Your Masterpiece!</Heading>
                    <Box w={`${CANVAS_WIDTH}px`} h={`${CANVAS_HEIGHT}px`} bg={selectedProductColor === 'white' ? 'gray.100' : 'gray.700'} mx="auto" borderWidth="1px" borderColor="brand.secondary" borderRadius="md" overflow="hidden" position="relative">
                        <canvas ref={canvasEl} id="mockupCanvas"></canvas>
                    </Box>
                    {selectedDesign && (
                        <VStack spacing={4} mt={6}>
                            <Text color="brand.textDark" fontWeight="medium" textAlign="center" fontSize="md" noOfLines={2}>
                                Preview: "{selectedDesign.prompt}" on a {selectedProductSize} {selectedProductColor} {productTypes.find(p=>p.value === selectedProductType)?.label || selectedProductType}
                            </Text>
                            <Button bg="brand.accentYellow" color="brand.textDark" _hover={{ bg: "brand.accentYellowHover" }} size="lg" px={8} borderRadius="full" boxShadow="md" onClick={handleProceedToCheckout} leftIcon={<Icon as={FaShoppingCart} />}>
                                Proceed to Checkout
                            </Button>
                        </VStack>
                    )}
                    {!selectedDesign && (
                        <Text color="brand.textDark" fontStyle="italic" textAlign="center" mt={6} py={4}>
                            Select your apparel options and a design to see a preview.
                        </Text>
                    )}
                </Box>
            </VStack>
        </SimpleGrid>
      </VStack>
    </Box>
  );
}
