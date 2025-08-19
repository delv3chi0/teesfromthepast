// backend/routes/auth.js
import express from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware.js";
import { body } from "express-validator";

import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  logoutUser,
  requestPasswordReset,
  resetPassword,
  changePassword,
  refreshSession,
} from "../controllers/authController.js";

const router = express.Router();

// --- Validation Rule Sets ---
const registerValidationRules = [
  body("username", "Username is required").not().isEmpty().trim().escape(),
  body("email", "Please include a valid email").isEmail().normalizeEmail(),
  body("password", "Password must be 6 or more characters").isLength({ min: 6 }),
  body("firstName").optional().trim().escape(),
  body("lastName").optional().trim().escape(),
];

const loginValidationRules = [
  body("email", "Please include a valid email").isEmail().normalizeEmail(),
  body("password", "Password is required").not().isEmpty(),
];

const requestPasswordResetRules = [
  body("email", "Please provide a valid email").isEmail().normalizeEmail(),
];

const resetPasswordRules = [
  body("token", "Reset token is required").not().isEmpty(),
  body("password", "New password must be at least 6 characters").isLength({ min: 6 }),
];

const changePasswordRules = [
  body("currentPassword", "Current password is required").not().isEmpty(),
  body("newPassword", "New password must be at least 6 characters").isLength({ min: 6 }),
];

const updateUserProfileRules = [
  body("username").optional({ checkFalsy: true }).trim().escape(),
  body("email").optional().isEmail().withMessage("Please provide a valid email").normalizeEmail(),
  body("firstName").optional().trim().escape(),
  body("lastName").optional().trim().escape(),
];

// --- Rate limiting ---
const byIPLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many login attempts from this IP. Try again later.",
});

const loginPerEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  keyGenerator: (req) => req.body?.email || req.ip,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many login attempts for this email. Try again later.",
});

// --- Auth endpoints (NO CSRF middleware here) ---
router.post("/register", registerValidationRules, registerUser);
router.post("/login", byIPLoginLimiter, loginPerEmailLimiter, loginValidationRules, loginUser);
router.post("/logout", logoutUser);

// Refresh current JWT (requires valid token)
router.post("/refresh", protect, refreshSession);

// Profile
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfileRules, updateUserProfile);

// Password flows
router.post("/request-password-reset", requestPasswordResetRules, requestPasswordReset);
router.post("/reset-password", resetPasswordRules, resetPassword);
router.put("/change-password", protect, changePasswordRules, changePassword);

export default router;
