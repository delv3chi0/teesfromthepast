import React, { useMemo, useState } from "react";
import {
  Box, VStack, HStack, Image, Text, Button, Badge, Tooltip, useColorModeValue,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

/** Safely pick a displayable mockup URL for a variant or product */
function getMockupUrl(product, variant) {
  const fromFiles = (files = []) => {
    const byType = (t) => files.find((f) => f?.type === t && (f.preview_url || f.url || f.thumbnail_url));
    const f = byType("preview") || byType("mockup") || files[0];
    return f?.preview_url || f?.url || f?.thumbnail_url || null;
  };

  const tryVariant = (v) => {
    if (!v) return null;
    if (v.image) return v.image;
    if (v.imageSet?.[0]?.url) return v.imageSet[0].url;
    const f = fromFiles(v.files);
    if (f) return f;
    return null;
  };

  return (
    tryVariant(variant)
    || product.images?.[0]?.url
    || product.images?.[0]
    || "https://placehold.co/800x1000/1a202c/a0aec0?text=Preview"
  );
}

/** Normalize colors from variants */
function getColorOptions(variants = []) {
  const out = [];
  const seen = new Set();
  variants.forEach((v) => {
    const color = v.colorName || v.color || "";
    if (!color || seen.has(color)) return;
    seen.add(color);
    out.push({
      label: color,
      key: color,
      variantExample: v,
    });
  });
  return out;
}

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const shadow = useColorModeValue("md", "lg");

  const colorOptions = useMemo(() => getColorOptions(product.variants), [product.variants]);
  const [activeColorKey, setActiveColorKey] = useState(colorOptions[0]?.key || null);

  const activeVariant = useMemo(() => {
    if (!activeColorKey) return product.variants?.[0] || null;
    return product.variants.find((v) => (v.colorName || v.color) === activeColorKey) || product.variants[0] || null;
  }, [product.variants, activeColorKey]);

  const img = getMockupUrl(product, activeVariant);

  const priceDisplay = useMemo(() => {
    if (product.priceMax && product.priceMax !== product.basePrice) {
      return `$${Number(product.basePrice).toFixed(2)}–$${Number(product.priceMax).toFixed(2)}`;
    }
    return `$${Number(product.basePrice).toFixed(2)}`;
  }, [product.basePrice, product.priceMax]);

  const onCustomize = () => {
    const color = activeColorKey || "";
    // send the user straight to the studio with preselected product + color
    navigate(`/product-studio?slug=${encodeURIComponent(product.slug)}&color=${encodeURIComponent(color)}`);
  };

  const onDetails = () => navigate(`/product/${encodeURIComponent(product.slug)}`);

  return (
    <Box
      bg="brand.secondary"
      borderWidth="1px"
      borderColor="whiteAlpha.300"
      rounded="xl"
      overflow="hidden"
      boxShadow={shadow}
      _hover={{ borderColor: "brand.accentYellow", transform: "translateY(-3px)" }}
      transition="all .15s ease"
    >
      <Box p={4}>
        <Image
          src={img}
          alt={product.name}
          borderRadius="md"
          w="100%"
          h="320px"
          objectFit="cover"
          bg="brand.primaryDark"
        />
      </Box>

      <VStack align="stretch" spacing={3} px={4} pb={4}>
        <Text fontWeight="bold" color="brand.textLight" noOfLines={1}>{product.name}</Text>
        <HStack justify="space-between">
          <Text color="brand.textLight">{priceDisplay}</Text>
          <Badge colorScheme="yellow">{colorOptions.length || 1} colors</Badge>
        </HStack>

        {/* Color swatches */}
        {colorOptions.length > 0 && (
          <HStack spacing={2} wrap="wrap">
            {colorOptions.map((c) => (
              <Tooltip key={c.key} label={c.label} hasArrow>
                <Button
                  size="xs"
                  variant={activeColorKey === c.key ? "solid" : "outline"}
                  onClick={() => setActiveColorKey(c.key)}
                >
                  {c.label}
                </Button>
              </Tooltip>
            ))}
          </HStack>
        )}

        <HStack pt={1} spacing={3}>
          <Button onClick={onDetails} variant="outline" w="50%">View details</Button>
          <Button onClick={onCustomize} colorScheme="brandAccentOrange" w="50%">
            Customize
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
