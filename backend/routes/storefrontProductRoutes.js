import { Router } from "express";
import {
  getShopData,
  getProductBySlug,
} from "../controllers/storefrontProductController.js";

const router = Router();

/**
 * Health/ping for quick checks
 * GET /api/storefront/ping  -> { ok: true }
 */
router.get("/ping", (_req, res) => res.json({ ok: true }));

/**
 * Main shop feed
 * GET /api/storefront/shop-data -> { products:[...] }
 */
router.get("/shop-data", getShopData);

/**
 * ✅ Alias so the frontend can call /api/storefront/products too
 *     (both return the same payload)
 */
router.get("/products", getShopData);

/**
 * Single product by slug
 * GET /api/storefront/product/:slug -> product
 */
router.get("/product/:slug", getProductBySlug);

export default router;
