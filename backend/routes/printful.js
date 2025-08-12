// backend/routes/printful.js
import { Router } from 'express';
import { createPrintfulOrder } from '../controllers/printfulController.js';
import { protect } from '../middleware/authMiddleware.js'; // if you want auth

const router = Router();

// Create order with custom artwork URL(s)
router.post('/orders', /*protect,*/ createPrintfulOrder);

export default router;
