// frontend/src/pages/ProductDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, VStack, Spinner, Alert, AlertIcon,
  Grid, GridItem, Image, HStack, Button, Select, Divider, useToast, Icon,
  Skeleton, SkeletonText, FormControl, FormLabel, Tooltip
} from '@chakra-ui/react';
import { client } from '../api/client';
import { FaPalette, FaRulerVertical, FaPlus, FaImage } from 'react-icons/fa';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [currentDisplayImage, setCurrentDisplayImage] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) { setError("Product slug not found in URL."); setLoading(false); return; }
      setLoading(true);
      setError('');
      try {
        const { data } = await client.get(`/storefront/products/slug/${slug}`);
        setProduct(data);
        if (data?.variants?.length > 0) {
          const defaultColor = data.variants.find(v => v.isDefaultDisplay) || data.variants[0];
          setSelectedColor(defaultColor);
          const primaryImage = defaultColor.imageSet?.find(img => img.isPrimary) || defaultColor.imageSet?.[0];
          setCurrentDisplayImage(primaryImage?.url);
          if (defaultColor.sizes?.length > 0) {
            setSelectedSize(defaultColor.sizes[0].size);
          }
        } else {
          setError("This product has no available options.");
        }
      } catch (err) {
        setError('Could not find the requested product.');
      } finally {
        setLoading(false);
      }
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
    const sizeDetails = selectedColor.sizes.find(s => s.size === selectedSize);
    if (!sizeDetails || !sizeDetails.sku) { toast({ title: "Error", description: "Selected option is currently unavailable.", status: "error" }); return; }
    
    // === THE FIX: Pass all necessary info in the URL to avoid extra API calls ===
    const searchParams = new URLSearchParams({
        productTypeId: product.productType,
        productId: product._id,
        sku: sizeDetails.sku,
        color: selectedColor.colorName,
        size: selectedSize,
    });
    navigate(`/product-studio?${searchParams.toString()}`);
  };

  if (loading) {
    return (
      <Box maxW="container.lg" mx="auto" p={8}>
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8}><GridItem><Skeleton height={{ base: "300px", md: "500px" }} borderRadius="lg" /><HStack mt={4} spacing={4}><Skeleton height="60px" width="60px" borderRadius="md" /><Skeleton height="60px" width="60px" borderRadius="md" /><Skeleton height="60px" width="60px" borderRadius="md" /></HStack></GridItem><GridItem><SkeletonText noOfLines={1} height="40px" /><SkeletonText noOfLines={1} height="30px" mt={4} width="150px" /><SkeletonText noOfLines={6} mt={6} /></GridItem></Grid>
      </Box>
    );
  }

  if (error) return <Alert status="error" m={8}><AlertIcon />{error}</Alert>;
  if (!product) return <Text p={8}>Product not found.</Text>;

  const currentPrice = (selectedColor?.sizes.find(s => s.size === selectedSize)?.priceModifier || 0) + product.basePrice;

  return (
    <Box maxW="container.lg" mx="auto" p={{ base: 4, md: 8 }}>
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={{ base: 4, md: 10 }}>
        <GridItem>
          <VStack spacing={4} align="stretch">
            <Box bg="gray.100" borderRadius="lg" p={4} display="flex" justifyContent="center" alignItems="center" h={{ base: "300px", md: "500px" }}>
              <Image src={currentDisplayImage} alt="Main product view" maxH="100%" objectFit="contain" fallback={<Icon as={FaImage} boxSize="100px" color="gray.300"/>} />
            </Box>
            <HStack spacing={3} overflowX="auto" py={2}>
              {selectedColor?.imageSet.map((image, index) => (
                <Box key={index} boxSize="60px" flexShrink={0} border="2px solid" borderColor={image.url === currentDisplayImage ? "brand.primary" : "transparent"} borderRadius="md" cursor="pointer" onClick={() => setCurrentDisplayImage(image.url)} p="2px">
                  <Image src={image.url} alt={`Thumbnail ${index + 1}`} boxSize="100%" objectFit="cover" borderRadius="sm" fallback={<Icon as={FaImage} boxSize="100%" color="gray.200"/>} />
                </Box>
              ))}
            </HStack>
          </VStack>
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
