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

/**
 * Product Detail Page
 * REFRACTORED:
 * - Removed the outer "page card" to align with the main layout's background.
 * - Restyled image viewer, color swatches, and all text for a cohesive dark theme.
 * - Implemented the themed <Select> component for size selection.
 * - Updated the loading skeleton to better match the final dark layout.
 */

// Reusable ThemedSelect for consistency
const ThemedSelect = (props) => (
    <Select
        size="lg"
        bg="brand.primaryDark"
        borderColor="whiteAlpha.300"
        _hover={{ borderColor: "whiteAlpha.400" }}
        focusBorderColor="brand.accentYellow"
        {...props}
    />
);

const ProductDetailPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const { user } = useAuth();

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
        if (!selectedColor || !selectedSize) { toast({ title: "Please select a color and size.", status: "warning", isClosable: true }); return; }
        if (user) {
            const sizeDetails = selectedColor.sizes.find(s => s.size === selectedSize);
            if (!sizeDetails || !sizeDetails.sku) { toast({ title: "Error", description: "Selected option is currently unavailable.", status: "error", isClosable: true }); return; }
            const searchParams = new URLSearchParams({
                productId: product._id,
                productTypeId: product.productType,
                color: selectedColor.colorName,
                size: selectedSize,
            });
            navigate(`/product-studio?${searchParams.toString()}`);
        } else {
            toast({ title: "Please log in to continue", description: "You need to be logged in to customize products.", status: "info", duration: 3000, isClosable: true });
            navigate('/login', { state: { from: location } });
        }
    };

    if (loading) {
        return (
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={{base: 6, md: 10}} p={{base: 2, md: 4}}>
                <GridItem>
                    <Skeleton height={{ base: "300px", md: "500px" }} borderRadius="lg" startColor="brand.primaryLight" endColor="brand.primaryDark" />
                    <HStack mt={4} spacing={4}>
                        <Skeleton height="60px" width="60px" borderRadius="md" startColor="brand.primaryLight" endColor="brand.primaryDark" />
                        <Skeleton height="60px" width="60px" borderRadius="md" startColor="brand.primaryLight" endColor="brand.primaryDark" />
                        <Skeleton height="60px" width="60px" borderRadius="md" startColor="brand.primaryLight" endColor="brand.primaryDark" />
                    </HStack>
                </GridItem>
                <GridItem>
                    <VStack align="start" spacing={6}>
                        <SkeletonText noOfLines={1} skeletonHeight="40px" width="80%" startColor="brand.primaryLight" endColor="brand.primaryDark" />
                        <SkeletonText noOfLines={1} skeletonHeight="30px" width="40%" startColor="brand.primaryLight" endColor="brand.primaryDark" />
                        <SkeletonText noOfLines={6} spacing="4" startColor="brand.primaryLight" endColor="brand.primaryDark" />
                        <Skeleton height="60px" width="100%" borderRadius="md" startColor="brand.primaryLight" endColor="brand.primaryDark" />
                    </VStack>
                </GridItem>
            </Grid>
        );
    }

    if (error) return <Alert status="error" bg="red.900" borderRadius="md" p={6} borderWidth="1px" borderColor="red.500"><AlertIcon color="red.300" /><Text color="white">{error}</Text></Alert>;
    if (!product) return <Text p={8} color="brand.textLight">Product not found.</Text>;

    const currentPrice = (selectedColor?.sizes.find(s => s.size === selectedSize)?.priceModifier || 0) + product.basePrice;

    return (
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={{ base: 6, md: 10 }}>
            <GridItem>
                <VStack spacing={4} align="stretch" position="sticky" top="8rem">
                    <Box bg="brand.primaryLight" borderRadius="xl" p={4} display="flex" justifyContent="center" alignItems="center" h={{ base: "300px", md: "500px" }} borderWidth="1px" borderColor="whiteAlpha.200">
                        <Image src={currentDisplayImage} alt="Main product view" maxH="100%" objectFit="contain" fallback={<Icon as={FaImage} boxSize="100px" color="whiteAlpha.400"/>} />
                    </Box>
                    <HStack spacing={3} overflowX="auto" py={2}>
                        {selectedColor?.imageSet?.map((image, index) => (
                            <Box key={index} boxSize="70px" flexShrink={0} borderWidth="3px" borderColor={image.url === currentDisplayImage ? "brand.accentYellow" : "transparent"} borderRadius="lg" cursor="pointer" onClick={() => setCurrentDisplayImage(image.url)} p="2px" transition="border-color 0.2s ease">
                                <Image src={image.url} alt={`Thumbnail ${index + 1}`} boxSize="100%" objectFit="cover" borderRadius="md" fallback={<Icon as={FaImage} boxSize="100%" color="whiteAlpha.300"/>} />
                            </Box>
                        ))}
                    </HStack>
                </VStack>
            </GridItem>
            <GridItem>
                <VStack spacing={6} align="stretch">
                    <Heading as="h1" size="2xl" color="brand.textLight">{product.name}</Heading>
                    <Text fontSize="4xl" fontWeight="bold" color="brand.accentYellow">${currentPrice.toFixed(2)}</Text>
                    <Text fontSize="md" color="whiteAlpha.800" whiteSpace="pre-wrap" lineHeight="tall">{product.description}</Text>
                    <Divider borderColor="whiteAlpha.300" />
                    <FormControl>
                        <FormLabel fontWeight="bold" fontSize="lg" color="brand.textLight"><Icon as={FaPalette} mr={2} verticalAlign="middle" />Color: <Text as="span" fontWeight="normal" color="whiteAlpha.800">{selectedColor?.colorName}</Text></FormLabel>
                        <HStack spacing={4} wrap="wrap">
                            {product.variants.map((variant) => (
                                <Tooltip key={variant.colorName} label={variant.colorName} placement="top" bg="gray.700" color="white" hasArrow>
                                    <Button onClick={() => handleColorSelect(variant)} height="48px" width="48px" borderRadius="full" p={0} border="3px solid" borderColor={selectedColor?.colorName === variant.colorName ? "brand.accentYellow" : "whiteAlpha.300"} _hover={{ borderColor: selectedColor?.colorName === variant.colorName ? "brand.accentYellow" : "whiteAlpha.600" }} transition="border-color 0.2s ease">
                                        <Box bg={variant.colorHex} height="36px" width="36px" borderRadius="full" />
                                    </Button>
                                </Tooltip>
                            ))}
                        </HStack>
                    </FormControl>
                    <FormControl>
                        <FormLabel fontWeight="bold" fontSize="lg" color="brand.textLight"><Icon as={FaRulerVertical} mr={2} verticalAlign="middle" />Size:</FormLabel>
                        <ThemedSelect placeholder="Select a size" value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} isDisabled={!selectedColor || selectedColor.sizes.length === 0}>
                            {selectedColor?.sizes.map(s => <option key={s.size} value={s.size}>{s.size}</option>)}
                        </ThemedSelect>
                    </FormControl>
                    <Button
                        bg="brand.accentOrange"
                        color="white"
                        _hover={{ bg: 'brand.accentOrangeHover' }}
                        size="lg"
                        w="100%"
                        mt={4}
                        py={7}
                        leftIcon={<FaPlus />}
                        onClick={handleCustomizeClick}
                        isDisabled={!selectedSize}
                    >
                        Customize This Item
                    </Button>
                </VStack>
            </GridItem>
        </Grid>
    );
};

export default ProductDetailPage;
