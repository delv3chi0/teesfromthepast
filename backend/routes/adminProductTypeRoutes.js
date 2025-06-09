// backend/routes/adminProductTypeRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';
import {
    createProductTypeAdmin,
    getProductTypesAdmin,
    getProductTypeByIdAdmin,
    updateProductTypeAdmin,
    deleteProductTypeAdmin
} from '../controllers/adminController.js';

const router = express.Router();

// Routes for /api/admin/product-types
router.route('/')
    .post(protect, admin, createProductTypeAdmin)  // Create a new product type
    .get(protect, admin, getProductTypesAdmin);   // Get all product types

router.route('/:id')
    .get(protect, admin, getProductTypeByIdAdmin)    // Get a single product type by ID
    .put(protect, admin, updateProductTypeAdmin)   // Update a product type by ID
    .delete(protect, admin, deleteProductTypeAdmin); // Delete a product type by ID

export default router;
