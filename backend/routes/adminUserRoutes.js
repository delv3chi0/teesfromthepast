// backend/routes/adminUserRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; // Authentication middleware
import { admin } from '../middleware/adminMiddleware.js';   // Admin authorization middleware (ensure this is correctly implemented and imported)

// Import controller functions for user management by admin
// These functions now contain the logic previously in this file.
import {
  getAllUsersAdmin,
  getUserByIdAdmin,
  updateUserAdmin,
  deleteUserAdmin
} from '../controllers/adminController.js'; // Assuming adminController.js is in ../controllers/

const router = express.Router();

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
router.route('/')
  .get(protect, admin, getAllUsersAdmin);

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
//
// @desc    Update user by ID
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
//
// @desc    Delete user by ID
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
router.route('/:id')
  .get(protect, admin, getUserByIdAdmin)    // Handles GET request for a specific user
  .put(protect, admin, updateUserAdmin)     // Handles PUT request to update a specific user
  .delete(protect, admin, deleteUserAdmin); // Handles DELETE request for a specific user

export default router;
