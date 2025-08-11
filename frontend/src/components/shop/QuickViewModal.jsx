import React, { useEffect, useMemo, useState } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Box, Image, IconButton, HStack, VStack, Text, Button, Badge, SimpleGrid
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

function collectMockups(product) {
  const urls = new Set();
  if (product?.image) urls.add(product.image);
  (product?.images || []).forEach((img) =>
    typeof img === "string" ? urls.add(img) : img?.url && urls.add(img.url)
  );
  (product?.variants || []).forEach((v) => {
    if (v?.image) urls.add(v.image);
    (v?.imageSet || []).forEach((s) => s?.url && urls.add(s.url));
    (v?.files || []).forEach((f) => {
      if (f?.preview_url) urls.add(f.preview_url);
      if (f?.url) urls.add(f.url);
      if (f?.thumbnail_url) urls.add(f.thumbnail_url);
    });
  });
  return Array.from(urls).filter(Boolean);
}
function uniqueColors(product) {
  if (Array.isArray(product?.colors) && product.colors.length) return product.colors;
  const set = new Set();
  (product?.variants || []).forEach((v) => v?.color && set.add(v.color));
  return Array.from(set);
}
function sizesForColor(product, color) {
  const set = new Set();
  (product?.variants || []).forEach((v) => {
    if (!color || v?.color === color) v?.size && set.add(v.size);
  });
  if (Array.isArray(product?.sizes)) product.sizes.forEach((s) => set.add(s));
  return Array.from(set);
}
function priceText(p) {
  const money = (n) => `$${Number(n).toFixed(2)}`;
  const { priceMin, priceMax, basePrice } = p || {};
  if (typeof basePrice === "number") return money(basePrice);
  if (typeof priceMin === "number" && typeof priceMax === "number") {
    return priceMin === priceMax ? money(priceMin) : `${money(priceMin)} – ${money(priceMax)}`;
  }
  if (typeof priceMin === "number") return money(priceMin);
  if (typeof priceMax === "number") return money(priceMax);
  return "";
}

export default function QuickViewModal({ product, isOpen, onClose }) {
  const navigate = useNavigate();
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const mockups = useMemo(() => collectMockups(product), [product]);
  const [i, setI] = useState(0);

  const colors = useMemo(() => uniqueColors(product), [product]);
  const sizes  = useMemo(() => sizesForColor(product, color), [product, color]);

  // pick the slug once, safely
  const slug = useMemo(() => {
    if (product?.slug) return product.slug;
    if (product?.handle) return product.handle;
    if (product?.name) {
      return product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
    return "";
  }, [product]);

  useEffect(() => {
    if (!isOpen) return;
    setColor((c) => c || colors[0] || "");
    setSize((s) => s || sizesForColor(product, colors[0])?.[0] || product?.sizes?.[0] || "");
    setI(0);
  }, [isOpen, product, colors]);

  const canCustomize = useMemo(() => {
    const needColor = colors.length > 0;
    const needSize  = sizes.length  > 0;
    return slug && (!needColor || color) && (!needSize || size);
  }, [slug, colors, sizes, color, size]);

  const go = (dir) => {
    if (!mockups.length) return;
    setI((prev) => (prev + (dir === "next" ? 1 : mockups.length - 1)) % mockups.length);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl">
      <ModalOverlay />
      <ModalContent bg="brand.secondary">
        <ModalHeader color="brand.textLight">{product?.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <Box position="relative" rounded="lg" overflow="hidden" bg="blackAlpha.300">
              {mockups.length > 0 ? (
                <>
                  <Image src={mockups[i]} alt={product?.name} w="100%" h="auto" objectFit="cover" />
                  {mockups.length > 1 && (
                    <>
                      <IconButton aria-label="Prev" icon={<ChevronLeftIcon />} onClick={() => go("prev")} position="absolute" top="50%" left="2" transform="translateY(-50%)" />
                      <IconButton aria-label="Next" icon={<ChevronRightIcon />} onClick={() => go("next")} position="absolute" top="50%" right="2" transform="translateY(-50%)" />
                    </>
                  )}
                </>
              ) : (
                <Box p={10} textAlign="center">No images</Box>
              )}
            </Box>

            <VStack align="stretch" spacing={4}>
              <Text color="brand.textLight" fontSize="2xl" fontWeight="bold">{priceText(product)}</Text>

              {colors.length > 0 && (
                <Box>
                  <Text mb={2} color="brand.textLight" fontWeight="medium">Color</Text>
                  <HStack wrap="wrap" spacing={2}>
                    {colors.map((c) => (
                      <Button key={c} size="sm" variant={color === c ? "solid" : "outline"} onClick={() => setColor(c)}>{c}</Button>
                    ))}
                  </HStack>
                </Box>
              )}

              {sizes.length > 0 && (
                <Box>
                  <Text mb={2} color="brand.textLight" fontWeight="medium">Size</Text>
                  <HStack wrap="wrap" spacing={2}>
                    {sizes.map((s) => (
                      <Button key={s} size="sm" variant={size === s ? "solid" : "outline"} onClick={() => setSize(s)}>{s}</Button>
                    ))}
                  </HStack>
                </Box>
              )}

              <HStack><Badge colorScheme="purple">{product?.variants?.length || 0} variants</Badge></HStack>
            </VStack>
          </SimpleGrid>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={3}>
            <Button onClick={onClose} variant="ghost">Close</Button>
            <Button
              colorScheme={canCustomize ? "purple" : "gray"}
              isDisabled={!canCustomize}
              onClick={() => {
                // ALWAYS go to /product-studio with slug
                const params = new URLSearchParams({
                  slug,
                  ...(color ? { color } : {}),
                  ...(size  ? { size  } : {}),
                });
                navigate(`/product-studio?${params.toString()}`);
              }}
            >
              Customize this
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
QuickViewModal.propTypes = { product: PropTypes.object, isOpen: PropTypes.bool.isRequired, onClose: PropTypes.func.isRequired };
