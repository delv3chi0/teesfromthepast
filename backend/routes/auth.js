// backend/routes/auth.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';

import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  logoutUser,
  requestPasswordReset,
  resetPassword,
  changePassword
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);

// Password Reset Routes
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword); 
router.put('/change-password', protect, changePassword); 

export default router;
