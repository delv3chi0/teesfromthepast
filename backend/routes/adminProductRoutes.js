// Assuming this is your main adminRoutes.js file that gathers other admin sub-routers.
// If this file does not exist, or its structure is different, please let me know.

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';

// Import controllers (adjust based on where they are imported in your actual file)
import {
    getDashboardSummary,
    getAllUsersAdmin,
    getUserByIdAdmin,
    updateUserAdmin,
    deleteUserAdmin,
    getAllOrdersAdmin,
    deleteOrderAdmin,
    getOrderByIdAdmin,
    updateOrderStatusAdmin,
    getAllDesignsAdmin,
    deleteDesignAdmin,
    // REMOVED category-related imports from adminController
    createProductAdmin,
    getProductsAdmin,
    getProductByIdAdmin,
    updateProductAdmin,
    deleteProductAdmin
} from '../controllers/adminController.js'; // Assuming all admin logic is in adminController.js

const router = express.Router();

// Middleware for all admin routes
router.use(protect, admin);

// --- Dashboard Routes ---
router.route('/orders/summary').get(getDashboardSummary);

// --- User Routes ---
router.route('/users')
    .get(getAllUsersAdmin); // Get all users
router.route('/users/:id')
    .get(getUserByIdAdmin)    // Get user by ID
    .put(updateUserAdmin)     // Update user by ID
    .delete(deleteUserAdmin); // Delete user by ID

// --- Order Routes ---
router.route('/orders')
    .get(getAllOrdersAdmin); // Get all orders
router.route('/orders/:id')
    .get(getOrderByIdAdmin)    // Get order by ID
    .delete(deleteOrderAdmin); // Delete order by ID
router.route('/orders/:id/status')
    .put(updateOrderStatusAdmin); // Update order status

// --- Design Routes ---
router.route('/designs')
    .get(getAllDesignsAdmin); // Get all designs
router.route('/designs/:id')
    .delete(deleteDesignAdmin); // Delete design by ID

// --- REMOVED Category Routes ---
// If you had routes like:
// router.route('/categories')
//     .post(createProductCategoryAdmin)
//     .get(getProductCategoriesAdmin);
// router.route('/categories/:id')
//     .get(getProductCategoryByIdAdmin)
//     .put(updateProductCategoryAdmin)
//     .delete(deleteProductCategoryAdmin);
// THESE ARE NOW GONE.

// --- Product Routes (These would typically be in adminProductRoutes.js, but included here if combined) ---
// If you have a separate adminProductRoutes.js, you would import and use it like:
// import adminProductRoutes from './adminProductRoutes.js';
// router.use('/products', adminProductRoutes);
// However, since your provided snippet shows the product routes directly, I will assume they are here for this file.

router.route('/products')
    .post(createProductAdmin)   // Create a new product
    .get(getProductsAdmin);     // Get all products
router.route('/products/:id')
    .get(getProductByIdAdmin)    // Get a single product by ID
    .put(updateProductAdmin)     // Update a product by ID
    .delete(deleteProductAdmin); // Delete a product by ID

export default router;
