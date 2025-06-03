// backend/routes/auth.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; // Your authentication middleware

// Import all controller functions from authController.js
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  logoutUser,
  requestPasswordReset  // <-- New controller function for password reset request
} from '../controllers/authController.js';

const router = express.Router();

// --- Authentication Routes ---
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser); // Good to have a dedicated logout route

// --- Profile Routes (Protected) ---
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// --- Password Reset Routes ---
router.post('/request-password-reset', requestPasswordReset); // For users to request a reset link

// Later, we will add:
// router.post('/reset-password', resetPasswordControllerFunction); // For submitting the new password with token

export default router;
