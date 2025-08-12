import {
  Box, VStack, HStack, Image, Text, Button, Tooltip
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { PRINTFUL_COLOR_HEX } from "../../data/colors";

export default function ProductCard({ product }) {
  if (!product) return null;

  const priceText =
    product.priceMin === product.priceMax
      ? `$${product.priceMin.toFixed(2)}`
      : `$${product.priceMin.toFixed(2)} – $${product.priceMax.toFixed(2)}`;

  return (
    <Box layerStyle="cardBlue" p={4} borderRadius="lg">
      <Box bg="brand.secondary" borderRadius="md" overflow="hidden" mb={3}>
        <Image
          src={product.primaryImage || product.images?.[0] || "https://placehold.co/800x1000"}
          alt={product.name}
          w="100%"
          h="320px"
          objectFit="cover"
        />
      </Box>

      <VStack align="stretch" spacing={2}>
        <HStack spacing={1} wrap="wrap">
          {(product.colors || []).map((name) => {
            const hex = PRINTFUL_COLOR_HEX[name] || "#999";
            return (
              <Tooltip key={name} label={name} hasArrow>
                <Box
                  w="14px"
                  h="14px"
                  borderRadius="50%"
                  border="1px solid rgba(255,255,255,0.35)"
                  bg={hex}
                />
              </Tooltip>
            );
          })}
        </HStack>

        <Text fontWeight="bold" color="brand.textLight" mt={1} textTransform="uppercase">
          {product.name}
        </Text>

        <Text fontSize="sm" color="whiteAlpha.800">{priceText}</Text>

        <HStack pt={2}>
          <Button as={RouterLink} to={`/product/${product.slug}`} size="sm" variant="outline">
            View details
          </Button>
          <Button
            as={RouterLink}
            to={`/product-studio?slug=${product.slug}`}
            size="sm"
            colorScheme="yellow"
          >
            Customize
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
