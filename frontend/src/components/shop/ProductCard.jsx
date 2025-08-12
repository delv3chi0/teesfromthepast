// frontend/src/components/ProductCard.jsx
import React from "react";
import { Box, VStack, Heading, Text, Button, Image, HStack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import ColorDots from "./ColorDots";

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  const colors = Array.from(new Set([
    ...(product.colors || []),
    ...(product.variants || []).map(v => v.color).filter(Boolean),
  ]));

  const priceMin = Number(product.priceMin || product.basePrice || product.price || 0);
  const priceMax = Number(product.priceMax || priceMin);
  const priceText = priceMin !== priceMax
    ? `$${priceMin.toFixed(2)} - $${priceMax.toFixed(2)}`
    : `$${priceMin.toFixed(2)}`;

  const primaryImg =
    product.cardImage ||
    product.image ||
    (product.images?.find(i => i.isPrimary)?.url) ||
    product.images?.[0] ||
    "https://placehold.co/800x1000?text=Mockup";

  return (
    <Box bg="brand.primaryLight" borderRadius="lg" p={4}>
      <Image
        src={primaryImg}
        alt={product.name}
        borderRadius="md"
        mb={3}
        w="100%"
        objectFit="cover"
      />

      <VStack align="start" spacing={2}>
        <Heading size="sm" color="brand.textLight">{product.name}</Heading>

        {/* Color dots */}
        <ColorDots colors={colors} max={12} />

        <Text fontSize="sm" color="whiteAlpha.800">{priceText}</Text>

        <HStack>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/product/${product.slug}`)}
          >
            View details
          </Button>
          <Button
            size="sm"
            colorScheme="yellow"
            onClick={() => navigate(`/product-studio?slug=${encodeURIComponent(product.slug)}`)}
          >
            Customize
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
