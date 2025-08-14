// backend/routes/adminOrderRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';

import { 
    getDashboardSummary,
    getAllOrdersAdmin,
    deleteOrderAdmin,
    getOrderByIdAdmin,
    updateOrderStatusAdmin
} from '../controllers/adminController.js';

const router = express.Router();

router.route('/summary')
    .get(protect, admin, getDashboardSummary);
router.get('/summary', protect, admin, getDashboardSummary);

router.route('/')
    .get(protect, admin, getAllOrdersAdmin);

router.route('/:id')
    .get(protect, admin, getOrderByIdAdmin)
    .delete(protect, admin, deleteOrderAdmin);

router.route('/:id/status')
    .put(protect, admin, updateOrderStatusAdmin);

export default router;
