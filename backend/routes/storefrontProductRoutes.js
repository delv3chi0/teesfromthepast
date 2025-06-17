import express from 'express';
import {
    getShopData,
    getProductBySlug,
} from '../controllers/storefrontProductController.js'; // Corrected controller filename

const router = express.Router();

router.get('/shop-data', getShopData);
router.get('/products/slug/:slug', getProductBySlug);

export default router;
