import React, { useMemo, useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Image,
  Heading,
  Text,
  Button,
  Tooltip,
  Badge,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

// If you have a central color map already, you can move this there.
const COLOR_SWATCHES = {
  black: "#1a1a1a",
  white: "#ffffff",
  maroon: "#6d1d28",
  red: "#d73a3a",
  purple: "#6f42c1",
  royal: "#2b4cce",
  navy: "#1b2a4a",
  charcoal: "#4b4f54",
  "military green": "#445c43",
  "forest green": "#2e5a3f",
  lime: "#b7e36a",
  orange: "#f68026",
  gold: "#e2b43c",
  azalea: "#ff8fb1",
  "tropical blue": "#3bbbd6",
  "brown savana": "#554236",
  // add others as needed
};

const normalize = (s = "") =>
  s.toString().trim().toLowerCase().replace(/\s+/g, " ");

function firstTruthy(...vals) {
  return vals.find(Boolean);
}

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  // Flatten a unique color list from variants and product.colors
  const colors = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach((v) => v.color && set.add(normalize(v.color)));
    (product?.colors || []).forEach((c) => c && set.add(normalize(c)));
    return Array.from(set);
  }, [product]);

  const [hoverColor, setHoverColor] = useState(colors[0] || null);

  // Pick any decent image for the card
  const cardImage = useMemo(() => {
    // Prefer a variant that matches hoverColor
    const vMatch =
      (product?.variants || []).find(
        (v) => normalize(v.color) === hoverColor
      ) || (product?.variants || [])[0];

    // Try variant files
    const fromFiles = (files = []) => {
      const f =
        files.find((f) => f.preview_url) ||
        files.find((f) => f.url) ||
        files.find((f) => f.thumbnail_url);
      return f?.preview_url || f?.url || f?.thumbnail_url || null;
    };

    const vFile = fromFiles(vMatch?.files);
    if (vFile) return vFile;

    // Try product.images or variant.image
    return (
      vMatch?.image ||
      (product?.images?.find((i) => i.isPrimary)?.url || product?.images?.[0]) ||
      product?.image ||
      "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup"
    );
  }, [product, hoverColor]);

  const priceText = useMemo(() => {
    const min = firstTruthy(product?.priceMin, product?.minPrice);
    const max = firstTruthy(product?.priceMax, product?.maxPrice);
    if (min && max && +min !== +max) return `$${(+min).toFixed(2)} - $${(+max).toFixed(2)}`;
    if (min) return `$${(+min).toFixed(2)}`;
    return product?.price || "";
  }, [product]);

  if (!product) return null;

  const handleCustomize = () => {
    const url = hoverColor
      ? `/product-studio?slug=${encodeURIComponent(product.slug)}&color=${encodeURIComponent(
          hoverColor
        )}`
      : `/product-studio?slug=${encodeURIComponent(product.slug)}`;
    navigate(url);
  };

  const handleDetails = () => navigate(`/product/${product.slug}`);

  return (
    <Box
      bg="brand.paper"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      overflow="hidden"
      _hover={{ boxShadow: "lg", transform: "translateY(-2px)" }}
      transition="all 0.2s ease"
    >
      <Box bg="brand.primary" p={4}>
        <Image
          src={cardImage}
          alt={product?.name}
          w="100%"
          h="360px"
          objectFit="contain"
          draggable={false}
        />
      </Box>

      <VStack align="stretch" spacing={2} p={4}>
        <Heading
          as="h3"
          size="sm"
          color="brand.textLight"
          textTransform="uppercase"
          letterSpacing="1px"
        >
          {product?.name}
        </Heading>

        {/* Color dots */}
        {colors?.length ? (
          <HStack spacing={2} wrap="wrap">
            {colors.slice(0, 10).map((c) => {
              const hex = COLOR_SWATCHES[c] || "#777";
              const active = c === hoverColor;
              return (
                <Tooltip key={c} label={c}>
                  <Box
                    as="button"
                    onMouseEnter={() => setHoverColor(c)}
                    onFocus={() => setHoverColor(c)}
                    onClick={() => setHoverColor(c)}
                    aria-label={c}
                    w="16px"
                    h="16px"
                    borderRadius="full"
                    bg={hex}
                    border={active ? "2px solid #f6e05e" : "1px solid #2d3748"}
                    boxShadow={active ? "0 0 0 2px rgba(246,224,94,.35)" : "none"}
                  />
                </Tooltip>
              );
            })}
            {colors.length > 10 && (
              <Badge colorScheme="yellow">+{colors.length - 10} more</Badge>
            )}
          </HStack>
        ) : (
          <Text fontSize="xs" color="whiteAlpha.600">
            One color
          </Text>
        )}

        {priceText && (
          <Text fontSize="sm" color="whiteAlpha.900" fontWeight="semibold">
            {priceText}
          </Text>
        )}

        <HStack pt={2}>
          <Button size="sm" variant="outline" onClick={handleDetails}>
            View details
          </Button>
          <Button size="sm" colorScheme="yellow" onClick={handleCustomize}>
            Customize
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
