// backend/routes/adminOrderRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';

import { 
    getAllOrdersAdmin,
    deleteOrderAdmin,
    getOrderByIdAdmin // --- IMPORT new controller function ---
} from '../controllers/adminController.js';

const router = express.Router();

router.route('/')
    .get(protect, admin, getAllOrdersAdmin);

// --- UPDATED to handle both GET and DELETE for a specific order ID ---
router.route('/:id')
    .get(protect, admin, getOrderByIdAdmin) // Added this line
    .delete(protect, admin, deleteOrderAdmin);

export default router;
