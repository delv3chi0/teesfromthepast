// backend/routes/storefrontProductRoutes.js
import express from 'express';
import {
    getActiveProductTypes,
    getActiveProductsByType,
    getShopData,
    getProductBySlug
} from '../controllers/storefrontProductController.js';

const router = express.Router();

// GET all active product types that have active products
router.route('/product-types').get(getActiveProductTypes);

// GET active products for a given product type ID (used by Product Studio)
router.route('/products/type/:productTypeId').get(getActiveProductsByType);

// === NEW: GET all products grouped by category for the main Shop page ===
router.route('/products/shop').get(getShopData);

// === NEW: GET a single product by its SEO-friendly slug for the Detail page ===
router.route('/products/slug/:slug').get(getProductBySlug);

export default router;
