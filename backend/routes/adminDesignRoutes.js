// backend/routes/adminDesignRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';

import {
    getAllDesignsAdmin,
    deleteDesignAdmin // --- IMPORT new function ---
} from '../controllers/adminController.js';

const router = express.Router();

router.route('/')
    .get(protect, admin, getAllDesignsAdmin);

// === NEW ROUTE to delete a design ===
router.route('/:id')
    .delete(protect, admin, deleteDesignAdmin);

export default router;
