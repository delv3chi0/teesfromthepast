// frontend/src/pages/ShopPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  VStack,
  Spinner,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { client } from "../api/client";
import ProductCard from "../components/shop/ProductCard";

function normalizeProducts(payload) {
  // Accept: [ ... ] OR { products: [ ... ] } OR { data: { products: [...] } }
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.products)) return payload.products;
  if (payload && payload.data && Array.isArray(payload.data.products)) {
    return payload.data.products;
  }
  return [];
}

export default function ShopPage() {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        // Your backend exposes both /products and /shop-data; use /products here
        const res = await client.get("/storefront/products");
        if (!alive) return;
        setRaw(res.data);
      } catch (e) {
        console.error("[ShopPage] fetch failed:", e);
        if (!alive) return;
        // Try the alternate endpoint as a seamless fallback
        try {
          const res2 = await client.get("/storefront/shop-data");
          if (!alive) return;
          setRaw(res2.data);
        } catch (e2) {
          console.error("[ShopPage] fallback /shop-data failed:", e2);
          setErr("Could not load products. Please try again.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const products = useMemo(() => normalizeProducts(raw), [raw]);

  if (loading) {
    return (
      <VStack minH="60vh" justify="center">
        <Spinner size="xl" thickness="4px" />
        <Text mt={4} color="brand.textLight">
          Loading products…
        </Text>
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
            <ProductCard key={p.id || p._id || p.slug || p.name} product={p} />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
