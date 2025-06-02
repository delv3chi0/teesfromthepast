// backend/routes/adminOrderRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js'; // Ensure you have this

import { getAllOrdersAdmin } from '../controllers/adminController.js';

const router = express.Router();

// @desc    Get all orders (admin)
// @route   GET /api/admin/orders
// @access  Private/Admin
router.route('/')
  .get(protect, admin, getAllOrdersAdmin);

// Add more routes for specific order actions later (e.g., GET /:id, PUT /:id/status)

export default router;
