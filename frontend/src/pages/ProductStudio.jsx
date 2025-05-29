// frontend/src/pages/ProductStudio.jsx
import { useState, useEffect } from 'react';
import { 
    Box, Heading, Text, VStack, HStack, Button, Select, 
    SimpleGrid, Image, Spinner, Alert, AlertIcon, 
    Link as ChakraLink, Divider, useToast // Added useToast
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';

const productTypes = [
  { value: 'tee', label: 'T-Shirt', mockups: { white: '/images/mockups/white_tee.png', black: '/images/mockups/black_tee.png' } },
  { value: 'hoodie', label: 'Hoodie', mockups: { white: '/images/mockups/white_hoodie.png', black: '/images/mockups/black_hoodie.png' } },
];

const productColors = [
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
];

const productSizes = ['S', 'M', 'L', 'XL', 'XXL'];

export default function ProductStudio() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast(); // Initialize toast

  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [designsError, setDesignsError] = useState('');

  const [selectedProductType, setSelectedProductType] = useState(productTypes[0].value);
  const [selectedProductColor, setSelectedProductColor] = useState(productColors[0].value);
  const [selectedProductSize, setSelectedProductSize] = useState(productSizes[2]);
  const [selectedDesign, setSelectedDesign] = useState(null);

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
            logout();
            navigate('/login');
          }
          setLoadingDesigns(false);
        });
    }
  }, [user, logout, navigate]);

  const getCurrentMockupSrc = () => {
    const product = productTypes.find(p => p.value === selectedProductType);
    return product?.mockups[selectedProductColor] || '';
  };

  const handleProceedToCheckout = () => {
    if (selectedDesign && selectedProductType && selectedProductColor && selectedProductSize) {
        const productDetailsForCheckout = {
            designId: selectedDesign._id,
            prompt: selectedDesign.prompt,
            imageDataUrl: selectedDesign.imageDataUrl, // The AI Design
            productType: productTypes.find(p => p.value === selectedProductType)?.label,
            productImage: getCurrentMockupSrc(), // The mockup image
            color: selectedProductColor,
            size: selectedProductSize,
            // You'll determine price on the backend, but can display an estimated one here if needed
            // price: 2500 // Example price in cents
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
    <Box maxW="container.xl" mx="auto" mt={8} px={4} pb={10}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center" color="brand.textLight">👕 Customize Your Apparel!</Heading>
        
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
            {selectedDesign ? (
                <VStack spacing={6}>
                    <Box 
                        position="relative" 
                        w={{base: "280px", sm: "300px", md: "400px"}} 
                        h={{base: "280px", sm: "300px", md: "400px"}} 
                        bg={selectedProductColor === 'white' ? 'gray.50' : 'gray.700'} // Background for mockup area based on shirt color
                        overflow="hidden" 
                        borderRadius="md"
                        mx="auto" 
                        borderWidth="1px"
                        borderColor="brand.secondary"
                    >
                        <Image 
                            src={getCurrentMockupSrc()} 
                            alt={`${selectedProductColor} ${selectedProductType}`} 
                            objectFit="contain" 
                            w="100%" 
                            h="100%"
                        />
                        {selectedDesign.imageDataUrl && (
                            <Image
                                src={selectedDesign.imageDataUrl}
                                alt="AI Design"
                                position="absolute"
                                top="24%"      
                                left="33.5%"   
                                width="33%"    
                                height="33%"   
                                objectFit="contain"
                            />
                        )}
                    </Box>
                    <Text color="brand.textDark" fontWeight="medium" textAlign="center">
                        Your design "{selectedDesign.prompt}" on a {selectedProductSize} {selectedProductColor} {productTypes.find(p=>p.value === selectedProductType)?.label}
                    </Text>
                     <Button 
                        bg="brand.accentOrange" 
                        color="brand.textLight"
                        _hover={{ bg: "brand.accentOrangeHover" }}
                        size="lg" 
                        mt={4}
                        px={8}
                        py={6}
                        borderRadius="full"
                        boxShadow="md"
                        onClick={handleProceedToCheckout}
                    >
                        Proceed to Checkout
                    </Button>
                </VStack>
            ) : (
                <Text color="brand.textMuted" fontStyle="italic" textAlign="center"> {/* textMuted may need to be themed for paper bg */}
                    Select your apparel options and a design above to see a preview.
                </Text>
            )}
        </Box>
      </VStack>
    </Box>
  );
}
