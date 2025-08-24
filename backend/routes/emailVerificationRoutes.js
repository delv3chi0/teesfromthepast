// backend/routes/emailVerificationRoutes.js
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sendVerification, verifyEmail, resendVerification } from '../controllers/emailVerificationController.js';

const router = Router();

// gentle: 5 attempts / 5 min per IP
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/send-verification', limiter, sendVerification);
router.post('/verify-email', limiter, verifyEmail);
router.post('/resend-verification', limiter, resendVerification);

export default router;
