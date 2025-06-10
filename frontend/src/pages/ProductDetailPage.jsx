// frontend/src/pages/ProductDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Heading, Text, VStack, Spinner, Alert, AlertIcon,
  Grid, GridItem, Image, HStack, Button, Select, Divider, useToast, Icon,
  Skeleton, SkeletonText, FormControl, FormLabel, Tooltip
} from '@chakra-ui/react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaPalette, FaRulerVertical, FaPlus, FaImage } from 'react-icons/fa';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // Get current location
  const toast = useToast();
  const { user } = useAuth(); // Get user from auth context

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [currentDisplayImage, setCurrentDisplayImage] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) { setError("Product not found."); setLoading(false); return; }
      setLoading(true); setError('');
      try {
        const { data } = await client.get(`/storefront/products/slug/${slug}`);
        setProduct(data);
        if (data?.variants?.length > 0) {
          const defaultColor = data.variants.find(v => v.isDefaultDisplay) || data.variants[0];
          setSelectedColor(defaultColor);
          const primaryImage = defaultColor.imageSet?.find(img => img.isPrimary) || defaultColor.imageSet?.[0];
          setCurrentDisplayImage(primaryImage?.url);
          if (defaultColor.sizes?.length > 0) { setSelectedSize(defaultColor.sizes[0].size); }
        } else {
          setError("This product has no available options.");
        }
      } catch (err) { setError('Could not find the requested product.'); } 
      finally { setLoading(false); }
    };
    fetchProduct();
  }, [slug]);

  const handleColorSelect = (colorVariant) => {
    setSelectedColor(colorVariant);
    const primaryImage = colorVariant.imageSet.find(img => img.isPrimary) || colorVariant.imageSet[0];
    setCurrentDisplayImage(primaryImage?.url);
    setSelectedSize(colorVariant.sizes[0]?.size || '');
  };

  const handleCustomizeClick = () => {
    if (!selectedColor || !selectedSize) { toast({ title: "Please select a color and size.", status: "warning" }); return; }
    
    // === THE FIX: Check for user before navigating ===
    if (user) {
      const sizeDetails = selectedColor.sizes.find(s => s.size === selectedSize);
      if (!sizeDetails || !sizeDetails.sku) { toast({ title: "Error", description: "Selected option is currently unavailable.", status: "error" }); return; }
      const searchParams = new URLSearchParams({
          productId: product._id,
          productTypeId: product.productType,
          sku: sizeDetails.sku,
          color: selectedColor.colorName,
          size: selectedSize,
      });
      navigate(`/product-studio?${searchParams.toString()}`);
    } else {
      // If no user, redirect to login and tell it where to come back to.
      toast({ title: "Please log in to continue", status: "info", duration: 3000, isClosable: true });
      navigate('/login', { state: { from: location } });
    }
  };

  if (loading) { /* Skeleton UI is unchanged */ }
  if (error) return <Alert status="error" m={8}><AlertIcon />{error}</Alert>;
  if (!product) return <Text p={8}>Product not found.</Text>;
  
  const currentPrice = (selectedColor?.sizes.find(s => s.size === selectedSize)?.priceModifier || 0) + product.basePrice;

  return (
    <Box bg="brand.cardBg" p={{base: 4, md: 8}} borderRadius="xl" shadow="md">
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={{ base: 4, md: 10 }}>
        <GridItem>
            {/* Image Gallery JSX is unchanged */}
        </GridItem>
        <GridItem>
          <VStack spacing={4} align="stretch">
            <Heading as="h1" size="xl">{product.name}</Heading>
            <Text fontSize="3xl" fontWeight="bold" color="brand.primary">${currentPrice.toFixed(2)}</Text>
            <Text fontSize="md" color="gray.600" whiteSpace="pre-wrap">{product.description}</Text>
            <Divider />
            <FormControl>
              <FormLabel fontWeight="bold"><Icon as={FaPalette} mr={2} />Color: <Text as="span" fontWeight="normal">{selectedColor?.colorName}</Text></FormLabel>
              <HStack spacing={3} wrap="wrap">
                {product.variants.map((variant) => (
                  <Tooltip key={variant.colorName} label={variant.colorName} placement="top">
                    <Button onClick={() => handleColorSelect(variant)} height="40px" width="40px" borderRadius="full" p={0} border="3px solid" borderColor={selectedColor?.colorName === variant.colorName ? "brand.primary" : "gray.200"}>
                      <Box bg={variant.colorHex} height="32px" width="32px" borderRadius="full" />
                    </Button>
                  </Tooltip>
                ))}
              </HStack>
            </FormControl>
            <FormControl>
              <FormLabel fontWeight="bold"><Icon as={FaRulerVertical} mr={2} />Size:</FormLabel>
              <Select placeholder="Select a size" value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} isDisabled={!selectedColor || selectedColor.sizes.length === 0} size="lg">
                {selectedColor?.sizes.map(s => <option key={s.size} value={s.size}>{s.size}</option>)}
              </Select>
            </FormControl>
            <Button colorScheme="brandPrimary" size="lg" w="100%" mt={4} leftIcon={<FaPlus />} onClick={handleCustomizeClick} isDisabled={!selectedSize}>
              Customize This Item
            </Button>
          </VStack>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default ProductDetailPage;
