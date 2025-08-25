// frontend/src/pages/ShopPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
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
import { useNavigate } from "react-router-dom";
import { client } from "../api/client";
import ProductCard from "../components/shop/ProductCard"; // ← use the swatch card

function normalizeProducts(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.products && Array.isArray(payload.products)) return payload.products;
  if (payload?.data?.products && Array.isArray(payload.data.products))
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

        // Try primary endpoint
        const res = await client.get("/storefront/products");
        if (!alive) return;
        setRaw(res.data);
      } catch (e1) {
        console.warn("[ShopPage] /products failed, trying /shop-data…", e1?.message);
        try {
          const res2 = await client.get("/storefront/shop-data");
          if (!alive) return;
          setRaw(res2.data);
        } catch (e2) {
          console.error("[ShopPage] both endpoints failed:", e2?.message);
          setErr("Could not load products. Please try again.");
        }
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
    <>
      <Helmet>
        <title>Shop Custom Apparel - Tees From The Past</title>
        <meta name="description" content="Browse our collection of custom t-shirts, hoodies, and apparel. Design your own unique clothing with high-quality printing." />
        <meta property="og:title" content="Shop Custom Apparel - Tees From The Past" />
        <meta property="og:description" content="Browse our collection of custom t-shirts, hoodies, and apparel. Design your own unique clothing with high-quality printing." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Shop Custom Apparel - Tees From The Past" />
        <meta name="twitter:description" content="Browse our collection of custom t-shirts, hoodies, and apparel." />
      </Helmet>
      
      <Box>
      <Heading as="h1" size="2xl" color="brand.textLight" mb={8}>
        Our Awesome Collection
      </Heading>

      {products.length === 0 ? (
        <Text color="brand.textLight">No products yet.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={8}>
          {products.map((p) => (
            <ProductCard
              key={p.id || p._id || p.slug || p.name}
              product={p}
            />
          ))}
        </SimpleGrid>
      )}
    </Box>
    </>
  );
}
