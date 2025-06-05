// backend/routes/adminProductRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';
import {
    createProductAdmin,
    getProductsAdmin,
    getProductByIdAdmin,
    updateProductAdmin,
    deleteProductAdmin
} from '../controllers/adminController.js';

const router = express.Router();

// Routes for /api/admin/products
router.route('/')
    .post(protect, admin, createProductAdmin)   // Create a new product (with variants)
    .get(protect, admin, getProductsAdmin);    // Get all products

router.route('/:id')
    .get(protect, admin, getProductByIdAdmin)     // Get a single product by ID (with variants)
    .put(protect, admin, updateProductAdmin)    // Update a product by ID (including its variants)
    .delete(protect, admin, deleteProductAdmin); // Delete a product by ID

// Future Enhancement: You might add more specific routes for managing variants later if needed,
// e.g., POST /:productId/variants to add a new variant to an existing product
// or PUT /:productId/variants/:variantSku to update a specific variant.
// For now, variant management is handled within the createProductAdmin and updateProductAdmin.

export default router;
