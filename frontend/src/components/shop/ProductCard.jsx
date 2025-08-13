import React, { useEffect, useMemo, useState } from "react";
import {
  Box, VStack, HStack, Heading, Text, Button,
  AspectRatio, Image, Tooltip, Wrap, WrapItem,
} from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { getPrimaryImage, listColors } from "../../data/mockupsRegistry";

// Compact color map for swatches (extend anytime)
const COLOR_SWATCHES = {
  black: "#000000",
  white: "#FFFFFF",
  maroon: "#800000",
  red: "#D32F2F",
  royal: "#1E40AF",
  "royal blue": "#1E40AF",
  purple: "#6B21A8",
  charcoal: "#36454F",
  "military green": "#4B5320",
  "forest green": "#228B22",
  lime: "#9CCC65",
  "tropical blue": "#1CA3EC",
  navy: "#0B1F44",
  gold: "#D4AF37",
  orange: "#F57C00",
  azalea: "#FF77A9",
  "brown savana": "#7B5E57",
  "brown savanna": "#7B5E57",
  brown: "#6D4C41",
  sand: "#E0CDA9",
  ash: "#B2BEB5",
  sport_grey: "#B5B8B1",
  grey: "#8E8E8E",
};

const toKey = (c) =>
  String(c || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[_-]+/g, " ");

function SwatchRow({ colors = [], max = 12 }) {
  const list = useMemo(() => Array.from(new Set(colors)).slice(0, max), [colors, max]);
  if (!list.length) return null;

  return (
    <Wrap spacing="6px" mb={2}>
      {list.map((c) => {
        const key = toKey(c);
        const hex = COLOR_SWATCHES[key] || "#CCCCCC";
        return (
          <WrapItem key={c}>
            <Tooltip label={c}>
              <Box
                borderRadius="full"
                boxSize="12px"
                borderWidth="1px"
                borderColor="blackAlpha.600"
                background={hex}
              />
            </Tooltip>
          </WrapItem>
        );
      })}
    </Wrap>
  );
}

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const [cover, setCover] = useState(null);

  if (!product) return null;

  const slug =
    product.slug ||
    (product.name || "product").toLowerCase().replace(/\s+/g, "-");

  // Colors from the registry (keeps swatches aligned with available mockups)
  const registryColors = useMemo(() => listColors(slug), [slug]);

  // Price text
  const priceMin = product.priceMin ?? product.basePrice ?? product.price ?? 0;
  const priceMax = product.priceMax ?? priceMin;
  const priceText =
    priceMin === priceMax
      ? `$${priceMin.toFixed(2)}`
      : `$${priceMin.toFixed(2)} - $${priceMax.toFixed(2)}`;

  // Load primary image via the same registry the studio uses
  useEffect(() => {
    let mounted = true;
    (async () => {
      const url =
        (await getPrimaryImage({ slug })) ||
        // ultimate fallback to product fields just in case
        product.images?.find?.((i) => i.isPrimary)?.url ||
        (Array.isArray(product.images) && typeof product.images[0] === "string"
          ? product.images[0]
          : product.images?.[0]?.url) ||
        product.variants?.[0]?.image ||
        product.variants?.[0]?.imageSet?.[0]?.url ||
        product.image ||
        "https://placehold.co/800x1000/142F2E/ffffff?text=Mockup";
      if (mounted) setCover(url);
    })();
    return () => { mounted = false; };
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const goCustomize = () => navigate(`/product-studio/${encodeURIComponent(slug)}`);

  return (
    <VStack
      layerStyle="cardBlue"
      p={4}
      spacing={3}
      align="stretch"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="transparent"
      _hover={{ borderColor: "brand.accentYellow" }}
      transition="all .2s"
    >
      <AspectRatio ratio={3 / 4} bg="blackAlpha.100" borderRadius="md" overflow="hidden">
        <Image src={cover || "https://placehold.co/800x1000/142F2E/ffffff?text=Mockup"} alt={product.name} objectFit="cover" />
      </AspectRatio>

      <VStack align="stretch" spacing={1}>
        <Heading as="h4" size="sm" color="brand.textLight" mt={1} noOfLines={1}>
          {product.name}
        </Heading>

        {/* Color swatches */}
        <SwatchRow colors={registryColors.length ? registryColors : (product.colors || [])} />

        <Text fontSize="sm" color="whiteAlpha.800">{priceText}</Text>
      </VStack>

      <HStack justify="space-between" pt={1}>
        <Button
          as={RouterLink}
          to={`/product/${encodeURIComponent(slug)}`}
          variant="outline"
          size="sm"
        >
          View details
        </Button>
        <Button size="sm" colorScheme="yellow" onClick={goCustomize}>
          Customize
        </Button>
      </HStack>
    </VStack>
  );
}
