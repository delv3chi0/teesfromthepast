// backend/routes/auth.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { body } from 'express-validator';

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

// --- Validation Rule Sets ---

const registerValidationRules = [
  body('username', 'Username is required').not().isEmpty().trim().escape(),
  body('email', 'Please include a valid email').isEmail().normalizeEmail(),
  body('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
  body('firstName').optional().trim().escape(),
  body('lastName').optional().trim().escape(),
];

const loginValidationRules = [
  body('email', 'Please include a valid email').isEmail().normalizeEmail(),
  body('password', 'Password is required').not().isEmpty(),
];

const requestPasswordResetRules = [
  body('email', 'Please provide a valid email').isEmail().normalizeEmail(),
];

const resetPasswordRules = [
  body('token', 'Reset token is required').not().isEmpty(),
  body('password', 'New password must be at least 6 characters').isLength({ min: 6 }),
];

const changePasswordRules = [
  body('currentPassword', 'Current password is required').not().isEmpty(),
  body('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 }),
];

const updateUserProfileRules = [
  body('username').optional({ checkFalsy: true }).trim().escape(),
  body('email').optional().isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('firstName').optional().trim().escape(),
  body('lastName').optional().trim().escape(),
  // Address objects are complex and are handled safely in the controller, so we don't validate them here.
];

// --- Apply rules to routes ---

router.post('/register', registerValidationRules, registerUser);
router.post('/login', loginValidationRules, loginUser);
router.post('/logout', logoutUser);

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfileRules, updateUserProfile);

router.post('/request-password-reset', requestPasswordResetRules, requestPasswordReset);
router.post('/reset-password', resetPasswordRules, resetPassword); 
router.put('/change-password', protect, changePasswordRules, changePassword); 

export default router;
