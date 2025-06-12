import express from 'express';
import {
    getActiveProductsByCategory,
    getShopData,
    getProductBySlug,
} from '../controllers/storefrontProductController.js';

const router = express.Router();

router.get('/shop', getShopData);

router.get('/products/category/:categoryId', getActiveProductsByCategory);

router.get('/products/:slug', getProductBySlug);

export default router;
