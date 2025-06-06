// backend/routes/adminOrderRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';

import { 
    getAllOrdersAdmin,
    deleteOrderAdmin // --- IMPORT new controller function ---
} from '../controllers/adminController.js';

const router = express.Router();

router.route('/')
    .get(protect, admin, getAllOrdersAdmin);

// --- ADD THIS NEW ROUTE ---
router.route('/:id')
    .delete(protect, admin, deleteOrderAdmin);
// --- END OF NEW ROUTE ---

export default router;
