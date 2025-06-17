import express from 'express';
import {
    getShopData,
    getProductBySlug,
    getAllActiveProducts,
} from '../controllers/storefrontProductController.js';

const router = express.Router();

// This route gets all the data needed for the main shop page (flat list for cards)
// E.g., GET /api/storefront/shop-data
router.get('/shop-data', getShopData);

// This route gets a single product by its unique slug for the detail page
// E.g., GET /api/storefront/products/slug/mens-shirt
router.get('/products/slug/:slug', getProductBySlug);

// This route gets a flat list of all active products with full variant details.
// This is what ProductStudio.jsx is calling for its dropdowns.
// E.g., GET /api/storefront/products
router.get('/products', getAllActiveProducts);

// --- CRUCIAL LINE: ENSURE THIS IS PRESENT AT THE VERY END OF THE FILE ---
export default router;
