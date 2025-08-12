// backend/controllers/storefrontProductController.js
import { getAllSyncProducts, getProductWithVariants } from "../services/printful.js";
import { transformPrintfulProduct } from "../transform/transformPrintfulProduct.js";
import { slugify } from "../utils/slugify.js";

// ---- tiny in-memory cache to reduce Printful calls (TTL: 2 minutes) ----
const CACHE_TTL_MS = 2 * 60 * 1000;
const cache = new Map(); // key -> { value, expires }

// helper
const setCache = (key, value, ttl = CACHE_TTL_MS) => {
  cache.set(key, { value, expires: Date.now() + ttl });
};
const getCache = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.value;
};

// simple concurrency limiter
async function pMapLimited(items, limit, mapper) {
  const ret = [];
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        ret[idx] = await mapper(items[idx], idx);
      } catch (e) {
        ret[idx] = null;
      }
    }
  });
  await Promise.all(workers);
  return ret.filter(Boolean);
}

/**
 * GET /storefront/shop-data
 * Returns { products: [...] } for Shop page.
 * Uses cache + limited parallelism to be fast and kind to Printful.
 */
export async function getShopData(_req, res, next) {
  try {
    const cacheKey = "shop-data";
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const list = await getAllSyncProducts(); // lightweight list
    // fetch details with concurrency 5
    const products = await pMapLimited(list, 5, async (item) => {
      try {
        const full = await getProductWithVariants(item.id);
        return transformPrintfulProduct(full.sync_product, full.sync_variants);
      } catch (err) {
        console.error("[shop-data] Failed product", item?.id, err?.message);
        return null;
      }
    });

    const payload = { products: products.filter(Boolean) };
    setCache(cacheKey, payload);
    res.json(payload);
  } catch (e) {
    next(e);
  }
}

/**
 * GET /storefront/product/:slug
 * Returns one transformed product for Product Detail/Studio.
 */
export async function getProductBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const cacheKey = `product-${slug}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const list = await getAllSyncProducts();
    const match = list.find((p) => slugify(p?.name) === slug);

    if (!match) return res.status(404).json({ error: "Not found" });

    const full = await getProductWithVariants(match.id);
    const transformed = transformPrintfulProduct(full.sync_product, full.sync_variants);

    setCache(cacheKey, transformed);
    res.json(transformed);
  } catch (e) {
    next(e);
  }
}
