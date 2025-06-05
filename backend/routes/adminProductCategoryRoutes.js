// backend/routes/adminProductCategoryRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; // Your authentication middleware
import { admin } from '../middleware/adminMiddleware.js';   // Your admin authorization middleware
import {
    createProductCategoryAdmin,
    getProductCategoriesAdmin,
    getProductCategoryByIdAdmin,
    updateProductCategoryAdmin,
    deleteProductCategoryAdmin
} from '../controllers/adminController.js'; // Import the controller functions

const router = express.Router();

// Routes for /api/admin/product-categories
router.route('/')
    .post(protect, admin, createProductCategoryAdmin)   // Create a new product category
    .get(protect, admin, getProductCategoriesAdmin);    // Get all product categories

router.route('/:id')
    .get(protect, admin, getProductCategoryByIdAdmin)     // Get a single product category by ID
    .put(protect, admin, updateProductCategoryAdmin)    // Update a product category by ID
    .delete(protect, admin, deleteProductCategoryAdmin); // Delete a product category by ID

export default router;
