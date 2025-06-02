// backend/routes/adminDesignRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js'; // Ensure you have this

import { getAllDesignsAdmin } from '../controllers/adminController.js';

const router = express.Router();

// @desc    Get all designs (admin)
// @route   GET /api/admin/designs
// @access  Private/Admin
router.route('/')
  .get(protect, admin, getAllDesignsAdmin);

// Add more routes for specific design actions later (e.g., DELETE /:id)

export default router;
