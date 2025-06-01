// frontend/src/pages/ProductStudio.jsx
import { useState, useEffect, useRef } from 'react';
import { fabric } from 'fabric'; // Standard ES module import for Fabric.js v5+

import { 
    Box, Heading, Text, VStack, Select, 
    SimpleGrid, Image, Spinner, Alert, AlertIcon, AlertCloseButton,
    Link as ChakraLink, Divider, useToast, Icon, Button
} from '@chakra-ui/react';
// Removed: import { Alert, AlertIcon, AlertCloseButton } from '@chakra-ui/alert'; // Reverted to main import
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
  const [selectedProductSize, setSelectedProductSize] = useState(productSizes[2]);
  const [selectedDesign, setSelectedDesign] = useState(null);

  const [showInfoAlert, setShowInfoAlert] = useState(false);

  const canvasEl = useRef(null); 
  const fabricCanvas = useRef(null); 

  useEffect(() => {
    const dismissed = localStorage.getItem(INFO_ALERT_DISMISSED_KEY);
    if (dismissed !== 'true') {
      setShowInfoAlert(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
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
    } else {
      setLoadingDesigns(false);
      setDesigns([]); 
      setDesignsError(''); 
    }
  }, [user, logout, navigate, toast]);

  const getCurrentMockupSrc = () => {
    const product = productTypes.find(p => p.value === selectedProductType);
    return product?.mockups[selectedProductColor] || '';
  };

  // useEffect for initializing and updating Fabric.js canvas
  useEffect(() => {
    // Ensure fabric object from import is available and canvas ref exists
    if (!fabric || !fabric.Canvas) {
        console.error("[ProductStudio] Imported Fabric.js object or Fabric.Canvas is not available.");
        toast({ title: "Preview Error", description: "Cannot initialize product preview system.", status: "error", duration: 7000, isClosable: true });
        return; 
    }
    if (!canvasEl.current) {
        console.log("[ProductStudio] Canvas DOM element not yet available for Fabric.");
        return;
    }

    // Initialize Fabric canvas instance if it doesn't exist
    if (!fabricCanvas.current) {
        console.log("[ProductStudio] Initializing Fabric canvas.");
        try {
            fabricCanvas.current = new fabric.Canvas(canvasEl.current, {
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
            });
        } catch (e) {
            console.error("[ProductStudio] Error initializing Fabric canvas:", e);
            toast({ title: "Canvas Init Error", description: "Failed to initialize product preview canvas.", status: "error", duration: 7000, isClosable: true });
            return;
        }
    }

    const FCanvas = fabricCanvas.current;
    if (FCanvas) {
        // console.log("[ProductStudio] Updating canvas. Clearing canvas.");
        FCanvas.clear();
        const mockupSrc = getCurrentMockupSrc();

        if (mockupSrc) {
            // console.log("[ProductStudio] Attempting to load mockup:", mockupSrc);
            fabric.Image.fromURL(mockupSrc, (mockupImg) => {
                if (!mockupImg || mockupImg.width === 0 || mockupImg.height === 0) {
                    console.error("[ProductStudio] Mockup image loaded with zero/invalid dimensions:", mockupSrc);
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
            // console.log("[ProductStudio] No mockupSrc. Setting white background.");
            FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
            FCanvas.setBackgroundColor('white', FCanvas.renderAll.bind(FCanvas));
        }

        if (selectedDesign?.imageDataUrl) {
            // console.log("[ProductStudio] Attempting to load design image.");
            fabric.Image.fromURL(selectedDesign.imageDataUrl, (designImg) => {
                if (!designImg || designImg.width === 0 || designImg.height === 0) {
                    console.error("[ProductStudio] Design image loaded with zero/invalid dimensions.");
                    return;
                }
                const designWidth = CANVAS_WIDTH * 0.33;
                designImg.scaleToWidth(designWidth);
                designImg.set({ 
                    top: CANVAS_HEIGHT * 0.24, 
                    left: (CANVAS_WIDTH - designImg.getScaledWidth()) * 0.5 
                });
                FCanvas.add(designImg);
                FCanvas.renderAll();
                // console.log("[ProductStudio] Design image added and canvas rendered.");
            }, { crossOrigin: 'anonymous' });
        } else {
            // console.log("[ProductStudio] No selected design. Rendering canvas if needed.");
            FCanvas.renderAll(); 
        }
    } else if (canvasEl.current) {
        console.error("[ProductStudio] FCanvas instance is null, though canvasEl exists. Canvas init might have failed.");
    }
    
  // Dependencies for re-drawing: selectedDesign, product type, color. getCurrentMockupSrc changes when these do.
  // 'fabric' is module-level, not a reactive dependency for the effect itself once loaded.
  }, [selectedDesign, selectedProductType, selectedProductColor, toast]); // Removed getCurrentMockupSrc, it's called inside


  const handleProceedToCheckout = () => {
    // ... (this function remains the same)
    if (selectedDesign && selectedProductType && selectedProductColor && selectedProductSize) {
        const productDetailsForCheckout = {
            designId: selectedDesign._id,
            prompt: selectedDesign.prompt,
            imageDataUrl: selectedDesign.imageDataUrl, 
            productType: productTypes.find(p => p.value === selectedProductType)?.label,
            productImage: getCurrentMockupSrc(), 
            color: selectedProductColor,
            size: selectedProductSize,
        };
        navigate('/checkout', { state: { designToCheckout: productDetailsForCheckout } });
    } else {
        toast({ 
            title: "Selection Incomplete", 
            description: "Please select all product options and a design before proceeding to checkout.", 
            status: "warning", 
            duration: 4000,
            isClosable: true,
        });
    }
  };

  const handleDismissInfoAlert = () => {
    setShowInfoAlert(false);
    localStorage.setItem(INFO_ALERT_DISMISSED_KEY, 'true');
  };

  return (
    <Box maxW="container.xl" mx="auto" px={0} pb={10}>
      <VStack spacing={6} align="stretch">
        <Heading 
          as="h1" 
          size="xl" 
          color="brand.textLight" 
          textAlign="left"
          w="100%" 
          mb={6} 
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
          >
            <AlertIcon color="blue.500"/>
            <Box flex="1">
              Want a brand new design for your product? 
              <ChakraLink as={RouterLink} to="/generate" color="brand.primaryDark" fontWeight="bold" ml={1} _hover={{textDecoration: "underline"}}>
                Create it in the AI Image Generator first
              </ChakraLink>
              , save it, then come back here to choose it!
            </Box>
            <AlertCloseButton onClick={handleDismissInfoAlert} /> 
          </Alert>
        )}

        {/* Rest of JSX remains the same */}
        <Box p={6} borderWidth="1px" borderRadius="xl" shadow="lg" bg="brand.paper">
          <Heading as="h2" size="lg" mb={6} color="brand.textDark">1. Choose Your Apparel</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <VStack align="stretch">
              <Text fontWeight="medium" color="brand.textDark">Product Type:</Text>
              <Select 
                value={selectedProductType} 
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

        <Box p={6} borderWidth="1px" borderRadius="xl" shadow="lg" bg="brand.paper">
          <Heading as="h2" size="lg" mb={6} color="brand.textDark">2. Choose Your Saved Design</Heading>
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
                <Button mt={4} size="sm" bg="brand.accentYellow" color="brand.textDark" _hover={{ bg: "brand.accentYellowHover" }} borderRadius="full" onClick={() => { if(user) fetchDesigns(); else navigate('/login');}}>
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
                  <Image src={design.imageDataUrl} alt={design.prompt} h="150px" w="100%" objectFit="cover" />
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>
        
        <Divider my={4} borderColor="brand.secondary"/>

        <Box p={6} borderWidth="1px" borderRadius="xl" shadow="lg" bg="brand.paper">
            <Heading as="h2" size="lg" mb={6} color="brand.textDark">3. Preview Your Masterpiece!</Heading>
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
                <VStack spacing={6} mt={4}> 
                    <Text color="brand.textDark" fontWeight="medium" textAlign="center">
                        Your design "{selectedDesign.prompt}" on a {selectedProductSize} {selectedProductColor} {productTypes.find(p=>p.value === selectedProductType)?.label}
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
                 <Text color="brand.textDark" fontStyle="italic" textAlign="center" mt={4}> 
                    Select your apparel options and a design above to see a preview.
                </Text>
            )}
        </Box>
      </VStack>
    </Box>
  );
}
