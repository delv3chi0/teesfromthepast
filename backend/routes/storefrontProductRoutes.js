import express from 'express';
import {
    getAllActiveProducts, // Added new import
    getActiveProductsByCategory,
    getShopData,
    getProductBySlug,
} from '../controllers/storefrontProductController.js';

const router = express.Router();

// NEW: This route gets a flat list of all active products
router.get('/products', getAllActiveProducts);

// This route gets all the data needed for the main shop page
router.get('/shop-data', getShopData);

// This route gets products by a category ID
router.get('/products/category/:categoryId', getActiveProductsByCategory);

// This route gets a single product by its unique slug for the detail page
router.get('/products/slug/:slug', getProductBySlug);

export default router;
