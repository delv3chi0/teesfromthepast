// frontend/src/pages/ProductStudio.jsx
import { useState, useEffect, useRef } from 'react'; // Added useRef
import { fabric } from 'fabric'; // Import Fabric.js
import { 
    Box, Heading, Text, VStack, Select, 
    SimpleGrid, Image, Spinner, Alert, AlertIcon, 
    Link as ChakraLink, Divider, useToast, Icon, Button // Ensured Button is imported
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

// Define canvas dimensions - these can be made responsive later
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

  // Refs for Fabric.js canvas
  const canvasEl = useRef(null); // For the <canvas> DOM element
  const fabricCanvas = useRef(null); // For the Fabric.js Canvas instance

  useEffect(() => {
    if (user) {
      setLoadingDesigns(true);
      client.get('/mydesigns')
        .then(response => {
          setDesigns(response.data);
          setLoadingDesigns(false);
        })
        .catch(err => {
          console.error("Error fetching designs for studio:", err);
          setDesignsError('Could not load your saved designs.');
          if (err.response?.status === 401) {
            toast({ title: "Session Expired", description: "Please log in again.", status: "warning", duration: 3000, isClosable: true });
            logout();
            navigate('/login');
          }
          setLoadingDesigns(false);
        });
    }
  }, [user, logout, navigate, toast]);

  const getCurrentMockupSrc = () => {
    const product = productTypes.find(p => p.value === selectedProductType);
    return product?.mockups[selectedProductColor] || '';
  };

  // useEffect for initializing and updating Fabric.js canvas
  useEffect(() => {
    // Initialize Fabric canvas instance if it doesn't exist
    if (canvasEl.current && !fabricCanvas.current) {
      fabricCanvas.current = new fabric.Canvas(canvasEl.current, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        // backgroundColor: 'lightgray', // Optional: for debugging canvas area
      });
    }

    const fCanvas = fabricCanvas.current;
    if (fCanvas) {
      fCanvas.clear(); // Clear previous content

      const mockupSrc = getCurrentMockupSrc();

      // 1. Load Mockup Image as Canvas Background
      if (mockupSrc) {
        fabric.Image.fromURL(mockupSrc, (mockupImg) => {
          fCanvas.setBackgroundImage(mockupImg, fCanvas.renderAll.bind(fCanvas), {
            scaleX: CANVAS_WIDTH / mockupImg.width,
            scaleY: CANVAS_HEIGHT / mockupImg.height,
            // Ensure it's not selectable if it's just a background
            selectable: false, 
            evented: false,
          });
        }, { crossOrigin: 'anonymous' }); // Important if images are from different domains or dataURLs
      } else {
        // If no mockupSrc, clear background and render
        fCanvas.setBackgroundImage(null, fCanvas.renderAll.bind(fCanvas));
      }

      // 2. Load Selected AI Design Image and Add it on Top
      if (selectedDesign?.imageDataUrl) {
        fabric.Image.fromURL(selectedDesign.imageDataUrl, (designImg) => {
          // Initial placement and scaling for the design
          // These values are similar to your previous CSS overlay
          const designWidth = CANVAS_WIDTH * 0.33; // 33% of canvas width
          designImg.scaleToWidth(designWidth);
          
          // Calculate top and left based on canvas dimensions
          // These percentages might need adjustment for best visual fit on canvas
          const designTop = CANVAS_HEIGHT * 0.24; // 24% from the top of the canvas
          const designLeft = (CANVAS_WIDTH - designImg.getScaledWidth()) * 0.5; // Centered horizontally for this example
                                        // Or your previous: CANVAS_WIDTH * 0.335; 

          designImg.set({
            top: designTop,
            left: designLeft,
            // objectCaching: false, // May help with performance of transformations later
          });
          
          fCanvas.add(designImg);
          // fCanvas.setActiveObject(designImg); // Optional: make it active for manipulation
          fCanvas.renderAll();
        }, { crossOrigin: 'anonymous' });
      }
    }
    
    // Cleanup function for when component unmounts or dependencies change
    // This is important to prevent memory leaks with Fabric.js
    // return () => {
    //   if (fabricCanvas.current) {
    //     fabricCanvas.current.dispose();
    //     fabricCanvas.current = null;
    //   }
    // };
  // Rerun this effect if the selected design or product details change
  }, [selectedDesign, selectedProductType, selectedProductColor, getCurrentMockupSrc]);


  const handleProceedToCheckout = () => {
    if (selectedDesign && selectedProductType && selectedProductColor && selectedProductSize) {
        const productDetailsForCheckout = {
            designId: selectedDesign._id,
            prompt: selectedDesign.prompt,
            imageDataUrl: selectedDesign.imageDataUrl, 
            productType: productTypes.find(p => p.value === selectedProductType)?.label,
            // For checkout, you might want to get the current canvas content as an image
            // For now, we still pass the original AI design URL and mockup image URL
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

        {/* MODIFIED: Preview Section now uses a Canvas */}
        <Box p={6} borderWidth="1px" borderRadius="xl" shadow="lg" bg="brand.paper">
            <Heading as="h2" size="lg" mb={6} color="brand.textDark">3. Preview Your Masterpiece!</Heading>
            {selectedDesign ? (
                <VStack spacing={6}>
                    <Box 
                        // This Box is now a container for the canvas
                        w={`${CANVAS_WIDTH}px`} 
                        h={`${CANVAS_HEIGHT}px`} 
                        bg={selectedProductColor === 'white' ? 'gray.50' : 'gray.700'} // Background for canvas area
                        mx="auto" 
                        borderWidth="1px"
                        borderColor="brand.secondary"
                        borderRadius="md"
                        overflow="hidden" // In case canvas tries to be bigger
                    >
                        <canvas ref={canvasEl} id="mockupCanvas"></canvas>
                    </Box>
                    <Text color="brand.textDark" fontWeight="medium" textAlign="center">
                        Your design "{selectedDesign.prompt}" on a {selectedProductSize} {selectedProductColor} {productTypes.find(p=>p.value === selectedProductType)?.label}
                    </Text>
                     <Button 
                        bg="brand.accentYellow"
                        color="brand.textDark"
                        _hover={{ bg: "brand.accentYellowHover" }} 
                        size="lg"
                        mt={4}
                        px={8}
                        borderRadius="full"
                        boxShadow="md"
                        onClick={handleProceedToCheckout}
                        leftIcon={<Icon as={FaShoppingCart} />} 
                    >
                        Proceed to Checkout
                    </Button>
                </VStack>
            ) : (
                <Text color="brand.textDark" fontStyle="italic" textAlign="center"> 
                    Select your apparel options and a design above to see a preview.
                </Text>
            )}
        </Box>
      </VStack>
    </Box>
  );
}
