// frontend/src/pages/ProductStudio.jsx
import { useState, useEffect } from 'react';
import { Box, Heading, Text, VStack, HStack, Button, Select, SimpleGrid, Image, Spinner, Alert, AlertIcon, Link as ChakraLink, Divider } from '@chakra-ui/react';
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

  return (
    <Box maxW="container.xl" mx="auto" mt={8} px={4} pb={10}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center">👕 Customize Your Apparel!</Heading>
        
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            Want a brand new design for your product? 
            <ChakraLink as={RouterLink} to="/generate" color="teal.500" fontWeight="bold" ml={1}>
              Create it in the AI Image Generator first
            </ChakraLink>
            , save it, then come back here to choose it!
          </Box>
        </Alert>

        <Box p={6} borderWidth="1px" borderRadius="md" shadow="md" bg="brand.paper">
          <Heading as="h2" size="lg" mb={4} color="brand.textDark">1. Choose Your Apparel</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <VStack align="stretch">
              <Text fontWeight="medium" color="brand.textDark">Product Type:</Text>
              <Select 
                value={selectedProductType} 
                onChange={(e) => { setSelectedProductType(e.target.value); setSelectedDesign(null);}}
                bg="white"
              >
                {productTypes.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
              </Select>
            </VStack>
            <VStack align="stretch">
              <Text fontWeight="medium" color="brand.textDark">Color:</Text>
              <Select 
                value={selectedProductColor} 
                onChange={(e) => { setSelectedProductColor(e.target.value); setSelectedDesign(null);}}
                bg="white"
              >
                {productColors.map(pc => <option key={pc.value} value={pc.value}>{pc.label}</option>)}
              </Select>
            </VStack>
            <VStack align="stretch">
              <Text fontWeight="medium" color="brand.textDark">Size:</Text>
              <Select 
                value={selectedProductSize} 
                onChange={(e) => setSelectedProductSize(e.target.value)}
                bg="white"
              >
                {productSizes.map(ps => <option key={ps} value={ps}>{ps}</option>)}
              </Select>
            </VStack>
          </SimpleGrid>
        </Box>

        <Divider my={4} />

        <Box p={6} borderWidth="1px" borderRadius="md" shadow="md" bg="brand.paper">
          <Heading as="h2" size="lg" mb={4} color="brand.textDark">2. Choose Your Saved Design</Heading>
          {loadingDesigns && <Spinner color="brand.primary" />}
          {!loadingDesigns && designsError && <Alert status="error"><AlertIcon />{designsError}</Alert>}
          {!loadingDesigns && !designsError && designs.length === 0 && (
            <Text color="brand.textDark">You have no saved designs. Go to the <ChakraLink as={RouterLink} to="/generate" color="teal.500" fontWeight="bold">AI Image Generator</ChakraLink> to create some!</Text>
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
                  borderColor={selectedDesign?._id === design._id ? "brand.accentYellow" : "transparent"}
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
        
        <Divider my={4} />

        <Box p={6} borderWidth="1px" borderRadius="md" shadow="md" bg="brand.paper">
            <Heading as="h2" size="lg" mb={4} color="brand.textDark">3. Preview Your Masterpiece!</Heading>
            {selectedDesign ? (
                <VStack spacing={4}>
                    <Box 
                        position="relative" 
                        w={{base: "280px", sm: "300px", md: "350px"}} 
                        h={{base: "280px", sm: "300px", md: "350px"}} 
                        bg="gray.100" 
                        overflow="hidden" 
                        borderRadius="md"
                        mx="auto" 
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
                                top="24%"      // <-- MOVED UP for better chest placement
                                left="33.5%"   // <-- Re-centered for 33% width: (100-33)/2
                                width="33%"    // <-- SCALED DOWN (approx 5% smaller than 35%)
                                height="33%"   // <-- SCALED DOWN
                                objectFit="contain"
                                // mixBlendMode prop removed
                            />
                        )}
                    </Box>
                    <Text color="brand.textDark" fontWeight="medium" textAlign="center">
                        Your design "{selectedDesign.prompt}" on a {selectedProductSize} {selectedProductColor} {productTypes.find(p=>p.value === selectedProductType)?.label}
                    </Text>
                     <Button colorScheme="brandAccentOrange" size="lg" mt={4}>
                        Looks Good! (Add to Cart - Coming Soon)
                    </Button>
                </VStack>
            ) : (
                <Text color="brand.textMutedOnOrange" fontStyle="italic" textAlign="center">Select your apparel options and a design above to see a preview.</Text>
            )}
        </Box>
      </VStack>
    </Box>
  );
}
