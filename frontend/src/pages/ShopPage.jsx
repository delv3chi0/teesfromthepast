import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Heading, SimpleGrid, Spinner, Center, Text, useToast,
} from "@chakra-ui/react";
import { client } from "../api/client";
import ProductCard from "../components/shop/ProductCard";

export default function ShopPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await client.get("/storefront/products");
        if (!cancelled) setItems(res.data || []);
      } catch (e) {
        console.error(e);
        toast({ title: "Could not load products", status: "error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  const products = useMemo(() => (items || []).map((p) => ({
    id: p._id || p.id,
    slug: p.slug || (p.name || "").toLowerCase().replace(/\s+/g, "-"),
    name: p.name || "Product",
    description: p.description || "",
    basePrice: p.basePrice ?? p.priceMin ?? 0,
    priceMax: p.priceMax ?? null,
    images: p.images || [],              // [{url}]
    variants: p.variants || [],          // each: {color, colorName, size, image, imageSet, files}
  })), [items]);

  if (loading) {
    return (
      <Center minH="60vh">
        <Spinner size="xl" thickness="4px" />
      </Center>
    );
  }

  return (
    <Box maxW="container.xl" mx="auto" px={{ base: 3, md: 6 }} py={{ base: 6, md: 10 }}>
      <Heading as="h1" size="2xl" mb={8} color="brand.textLight">
        Our Awesome Collection
      </Heading>

      {products.length === 0 ? (
        <Center py={20}>
          <Text color="brand.textLight">No products yet.</Text>
        </Center>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={{ base: 6, md: 8 }}>
          {products.map((p) => (
            <ProductCard key={p.id || p.slug} product={p} />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
