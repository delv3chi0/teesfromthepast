import express from 'express';
import {
    getAllActiveProducts,
    getProductBySlug,
} from '../controllers/storefrontProductController.js';

const router = express.Router();

// This route gets a flat list of all active products
router.get('/products', getAllActiveProducts);

// This route gets a single product by its unique slug for the detail page
router.get('/products/slug/:slug', getProductBySlug);

export default router;
