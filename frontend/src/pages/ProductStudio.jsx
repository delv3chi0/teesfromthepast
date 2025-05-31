// frontend/src/pages/ProductStudio.jsx
import { useState, useEffect, useRef } from 'react';
// Fabric.js will be imported dynamically below
import { 
    Box, Heading, Text, VStack, Select, 
    SimpleGrid, Image, Spinner, Alert, AlertIcon, 
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

  const canvasEl = useRef(null); 
  const fabricCanvas = useRef(null);
  const [fabricModule, setFabricModule] = useState(null); // State for dynamically loaded fabric module

  // Effect to load Fabric.js dynamically
  useEffect(() => {
    console.log("[ProductStudio] Attempting to dynamically import Fabric.js...");
    import('fabric')
      .then(module => {
        console.log("[ProductStudio] Fabric.js module loaded:", module);
        if (module.fabric && module.fabric.Canvas) {
          console.log("[ProductStudio] Using module.fabric");
          setFabricModule(module.fabric);
        } else if (module.default && module.default.Canvas) {
          console.log("[ProductStudio] Using module.default");
          setFabricModule(module.default);
        } else if (module.Canvas) { 
           console.log("[ProductStudio] Using module directly (has Canvas property)");
           setFabricModule(module);
        } else {
          console.error("[ProductStudio] Failed to find usable fabric object in dynamically imported module", module);
          toast({ title: "Preview Error", description: "Fabric.js module loaded but structure unexpected.", status: "error", duration: 7000, isClosable: true });
        }
      })
      .catch(err => {
        console.error("[ProductStudio] Error dynamically importing Fabric.js:", err);
        toast({ title: "Preview Error", description: "Could not load Fabric.js for preview.", status: "error", duration: 7000, isClosable: true });
      });
  }, [toast]); // Runs once to load fabric

  const getCurrentMockupSrc = () => {
    const product = productTypes.find(p => p.value === selectedProductType);
    return product?.mockups[selectedProductColor] || '';
  };

  // useEffect for initializing and updating Fabric.js canvas
  useEffect(() => {
    if (!fabricModule) { 
        console.log("[ProductStudio] Canvas Effect: Fabric module not yet loaded.");
        return;
    }
    if (!fabricModule.Canvas) {
        console.error("[ProductStudio] Canvas Effect: Fabric module loaded, but Canvas constructor not found.", fabricModule);
        return;
    }
    if (!canvasEl.current) {
        console.log("[ProductStudio] Canvas Effect: Canvas DOM element not yet available.");
        return;
    }

    if (!fabricCanvas.current) {
        console.log("[ProductStudio] Initializing Fabric canvas with dynamically loaded module.");
        fabricCanvas.current = new fabricModule.Canvas(canvasEl.current, {
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
        });
    }

    const FCanvas = fabricCanvas.current;
    if (FCanvas) {
        console.log("[ProductStudio] Updating canvas. Clearing canvas.");
        FCanvas.clear();
        const mockupSrc = getCurrentMockupSrc();

        if (mockupSrc) {
            console.log("[ProductStudio] Attempting to load mockup:", mockupSrc);
            fabricModule.Image.fromURL(mockupSrc, (mockupImg) => {
                console.log("[ProductStudio] Mockup loaded callback. Image object:", mockupImg);
                if (!mockupImg || mockupImg.width === 0 || mockupImg.height === 0) {
                    console.error("[ProductStudio] Mockup image loaded with zero dimensions or is null:", mockupSrc, mockupImg);
                    FCanvas.setBackgroundColor('lightgrey', FCanvas.renderAll.bind(FCanvas)); 
                    return;
                }
                console.log("[ProductStudio] Setting background image with mockup:", mockupImg.width, "x", mockupImg.height);
                FCanvas.setBackgroundImage(mockupImg, FCanvas.renderAll.bind(FCanvas), {
                    scaleX: CANVAS_WIDTH / mockupImg.width,
                    scaleY: CANVAS_HEIGHT / mockupImg.height,
                    selectable: false,
                    evented: false,
                });
            }, { crossOrigin: 'anonymous' });
        } else {
            console.log("[ProductStudio] No mockupSrc, clearing background and setting to white.");
            FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
            FCanvas.setBackgroundColor('white', FCanvas.renderAll.bind(FCanvas)); 
        }

        if (selectedDesign?.imageDataUrl) {
            console.log("[ProductStudio] Attempting to load design:", selectedDesign.imageDataUrl.substring(0,50) + "...");
            fabricModule.Image.fromURL(selectedDesign.imageDataUrl, (designImg) => {
                console.log("[ProductStudio] Design image loaded callback. Image object:", designImg);
                if (!designImg || designImg.width === 0 || designImg.height === 0) {
                    console.error("[ProductStudio] Design image loaded with zero dimensions or is null:", selectedDesign.imageDataUrl.substring(0,50) + "...");
                    return; 
                }
                const designWidth = CANVAS_WIDTH * 0.33;
                designImg.scaleToWidth(designWidth);
                const designLeft = (CANVAS_WIDTH - designImg.getScaledWidth()) * 0.5;
                const designTop = CANVAS_HEIGHT * 0.24;

                designImg.set({
                    top: designTop,
                    left: designLeft,
                });
                FCanvas.add(designImg);
                console.log("[ProductStudio] Design image added to canvas.");
                FCanvas.renderAll();
            }, { crossOrigin: 'anonymous' });
        } else {
            console.log("[ProductStudio] No selected design to load.");
             // Ensure canvas is rendered even if no design (e.g., to show background or cleared state)
            if (FCanvas.backgroundImage || FCanvas.backgroundColor) {
                FCanvas.renderAll();
            }
        }
    } else {
        console.log("[ProductStudio] FCanvas (Fabric Canvas instance) is not available for update.");
    }
    
}, [selectedDesign, selectedProductType, selectedProductColor, getCurrentMockupSrc, fabricModule]); // Added fabricModule to dependencies


  const handleProceedToCheckout = () => {
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
        console.log("Proceeding to checkout with:", productDetailsForCheckout);
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
        
        <Alert status="info" borderRadius="md" bg="brand.paper" color="brand.textDark">
          <AlertIcon color="blue.500"/>
          <Box flex="1">
            Want a brand new design for your product? 
            <ChakraLink as={RouterLink} to="/generate" color="brand.primaryDark" fontWeight="bold" ml={1} _hover={{textDecoration: "underline"}}>
              Create it in the AI Image Generator first
            </ChakraLink>
            , save it, then come back here to choose it!
          </Box>
        </Alert>

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
          {loadingDesigns && <Box textAlign="center" py={10}><Spinner size="xl" color="brand.primary" thickness="4px"/><Text mt={3} color="brand.textDark">Loading designs...</Text></Box>}
          {!loadingDesigns && designsError && <Alert status="error" borderRadius="md"><AlertIcon />{designsError}</Alert>}
          {!loadingDesigns && !designsError && designs.length === 0 && (
            <Text color="brand.textDark">You have no saved designs. Go to the <ChakraLink as={RouterLink} to="/generate" color="brand.primaryDark" fontWeight="bold">AI Image Generator</ChakraLink> to create some!</Text>
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
