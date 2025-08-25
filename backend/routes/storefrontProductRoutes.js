import { Router } from "express";
import {
  getShopData,
  getProductBySlug,
} from "../controllers/storefrontProductController.js";
import { cachePublicThumbnails, cachePublicShort } from "../middleware/cacheHeaders.js";

const router = Router();

/**
 * Health/ping for quick checks
 * GET /api/storefront/ping  -> { ok: true }
 */
router.get("/ping", (_req, res) => res.json({ ok: true }));

/**
 * Main shop feed with caching
 * GET /api/storefront/shop-data -> { products:[...] }
 */
router.get("/shop-data", cachePublicThumbnails, getShopData);

/**
 * ✅ Alias so the frontend can call /api/storefront/products too
 *     (both return the same payload)
 */
router.get("/products", cachePublicThumbnails, getShopData);

/**
 * Single product by slug with caching
 * GET /api/storefront/product/:slug -> product
 */
router.get("/product/:slug", cachePublicShort, getProductBySlug);

export default router;
