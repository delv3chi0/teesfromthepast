// backend/routes/adminOrderRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';

import { 
    getAllOrdersAdmin,
    deleteOrderAdmin,
    getOrderByIdAdmin,
    updateOrderStatusAdmin // --- IMPORT new controller function ---
} from '../controllers/adminController.js';

const router = express.Router();

router.route('/')
    .get(protect, admin, getAllOrdersAdmin);

router.route('/:id')
    .get(protect, admin, getOrderByIdAdmin)
    .delete(protect, admin, deleteOrderAdmin);

// === NEW ROUTE START ===
// Route to update just the order status
router.route('/:id/status')
    .put(protect, admin, updateOrderStatusAdmin);
// === NEW ROUTE END ===

export default router;
