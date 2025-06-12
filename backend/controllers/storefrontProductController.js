import express from 'express';
import {
    // MODIFIED: Replaced old function names with the new correct ones
    getActiveProductsByCategory,
    getShopData,
    getProductBySlug,
} from '../controllers/storefrontProductController.js';

const router = express.Router();

// This route gets all the data needed for the main shop page
router.get('/shop', getShopData);

// MODIFIED: This route now gets products by a category ID, not a type ID
router.get('/products/category/:categoryId', getActiveProductsByCategory);

// This route gets a single product by its unique slug for the detail page
router.get('/products/:slug', getProductBySlug);

export default router;
