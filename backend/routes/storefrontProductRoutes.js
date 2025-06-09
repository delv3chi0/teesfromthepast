// backend/routes/storefrontProductRoutes.js
import express from 'express';
import {
    getActiveProductTypes,
    getActiveProductsByType
} from '../controllers/storefrontProductController.js';

const router = express.Router();

// @desc    Get all active product types that have active products
// @route   GET /api/storefront/product-types
// @access  Public
router.route('/product-types').get(getActiveProductTypes);

// @desc    Get active products for a given product type ID
// @route   GET /api/storefront/products/type/:productTypeId
// @access  Public
router.route('/products/type/:productTypeId').get(getActiveProductsByType);

// Future: you might add GET /api/storefront/products/:productIdOrSku for a direct product view page

export default router;
