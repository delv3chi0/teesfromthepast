// frontend/src/pages/ShopPage.jsx
import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Image,
  Badge,
  Button,
  VStack,
  HStack,
  Spinner,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { client } from "../api/client";

function normalizeProducts(payload) {
  // Accept: [ ... ]  OR  { products: [ ... ] }  OR anything weird -> []
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.products)) return payload.products;
  if (payload && payload.data && Array.isArray(payload.data.products))
    return payload.data.products;
  return [];
}

export default function ShopPage() {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        // Either /products or /shop-data now work; using /products
        const res = await client.get("/storefront/products");
        if (!alive) return;
        setRaw(res.data);
      } catch (e) {
        console.error("[ShopPage] fetch failed:", e);
        setErr("Could not load products. Please try again.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const products = useMemo(() => normalizeProducts(raw), [raw]);

  if (loading) {
    return (
      <VStack minH="60vh" justify="center">
        <Spinner size="xl" thickness="4px" />
        <Text mt={4} color="brand.textLight">Loading products…</Text>
      </VStack>
    );
  }

  if (err) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        {err}
      </Alert>
    );
  }

  return (
    <Box>
      <Heading as="h1" size="2xl" color="brand.textLight" mb={8}>
        Our Awesome Collection
      </Heading>

      {products.length === 0 ? (
        <Text color="brand.textLight">No products yet.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={8}>
          {products.map((p) => (
            <ProductCard key={p.id || p._id || p.slug} product={p} onCustomize={() => {
              const slug = p.slug || (p.name ? p.name.toLowerCase().replace(/\s+/g, "-") : "product");
              navigate(`/product-studio?slug=${encodeURIComponent(slug)}`);
            }}/>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}

function ProductCard({ product, onCustomize }) {
  // Try to find a decent image
  const cover =
    product?.image ||
    product?.images?.[0]?.url ||
    product?.variants?.[0]?.image ||
    product?.variants?.[0]?.imageSet?.[0]?.url ||
    "https://placehold.co/600x750/1a202c/a0aec0?text=Product";

  const colors = Array.from(
    new Set(
      (product?.colors ||
        (product?.variants || []).map((v) => v.color).filter(Boolean) ||
        [])
    )
  ).slice(0, 8); // show up to 8 dots

  const slug = product?.slug || (product?.name ? product.name.toLowerCase().replace(/\s+/g, "-") : "product");
  const priceMin = product?.priceMin ?? product?.basePrice ?? 0;
  const priceMax = product?.priceMax ?? priceMin;

  return (
    <VStack
      align="stretch"
      bg="brand.secondary"
      borderWidth="1px"
      borderColor="whiteAlpha.300"
      borderRadius="lg"
      overflow="hidden"
      _hover={{ borderColor: "brand.accentYellow" }}
      transition="all .2s"
    >
      <Image src={cover} alt={product?.name} objectFit="cover" aspectRatio="3/4" />

      <Box p={4}>
        <Heading as="h3" size="md" color="brand.textLight" noOfLines={1}>
          {product?.name || "Untitled"}
        </Heading>

        <HStack mt={2} spacing={1}>
          {colors.map((c) => (
            <Badge key={c} variant="subtle" bg="whiteAlpha.300" color="whiteAlpha.900">
              {c}
            </Badge>
          ))}
          {colors.length === 0 && (
            <Badge variant="subtle" bg="whiteAlpha.200" color="whiteAlpha.800">
              One color
            </Badge>
          )}
        </HStack>

        <Text mt={2} color="whiteAlpha.900" fontWeight="bold">
          {priceMin === priceMax ? `$${priceMin.toFixed(2)}` : `$${priceMin.toFixed(2)} – $${priceMax.toFixed(2)}`}
        </Text>

        <HStack mt={4}>
          <Button as={RouterLink} to={`/product/${encodeURIComponent(slug)}`} variant="outline" size="sm">
            View details
          </Button>
          <Button onClick={onCustomize} colorScheme="orange" size="sm">
            Customize
          </Button>
        </HStack>
      </Box>
    </VStack>
  );
}
