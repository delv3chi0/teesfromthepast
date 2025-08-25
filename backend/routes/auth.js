// backend/routes/auth.js
import express from "express";
import rateLimit from "express-rate-limit";
import { body, query } from "express-validator";
import { protect } from "../middleware/authMiddleware.js";
import { registerLimiter, loginLimiter, passwordResetLimiter, createAbuseLimiter } from "../middleware/abuseLimiter.js";
import * as auth from "../controllers/authController.js";
import { requireHCaptcha } from "../middleware/hcaptcha.js";

const router = express.Router();

// validators (unchanged)
const vRegister = [ body("username").trim().notEmpty(), body("email").isEmail(), body("password").isString().isLength({ min: 8 }) ];
const vLogin = [ body("email").isEmail(), body("password").notEmpty() ];
const vReqReset = [ body("email").isEmail() ];
const vReset = [ body("token").notEmpty(), body("password").isString().isLength({ min: 8 }) ];
const vChange = [ body("currentPassword").notEmpty(), body("newPassword").isString().isLength({ min: 8 }) ];
const vEmailOnly = [ body("email").isEmail() ];
const vCaptchaContext = [ query("context").optional().isString() ];

// Create verification limiter using the abuse limiter system
const verifyLimiter = createAbuseLimiter('register', { windowMs: 5 * 60 * 1000, maxAttempts: 5 }); // 5 attempts per 5 minutes

const safe = (name) => (typeof auth[name] === "function" ? auth[name] : (_req, res) => res.status(501).json({ message: `Missing ${name}` }));

// === NEW: adaptive captcha policy probe ===
router.get("/captcha-check", vCaptchaContext, safe("captchaCheck"));

// Auth routes with enhanced abuse protection
router.post("/register", registerLimiter, vRegister, safe("registerUser")); // Enhanced rate limiting with abuse detection
router.post("/login", loginLimiter, vLogin, safe("loginUser"));             // Enhanced rate limiting with failed attempt tracking
router.post("/logout", protect, safe("logoutUser"));

// Email verification (unchanged hooks)
router.post("/send-verification", verifyLimiter, vEmailOnly, safe("sendVerification"));
router.post("/resend-verification", verifyLimiter, vEmailOnly, safe("resendVerification"));
router.post("/verify-email", verifyLimiter, [ body("email").isEmail(), body("token").notEmpty() ], safe("verifyEmail"));

// Profile
router.get("/profile", protect, safe("getUserProfile"));
router.put("/profile", protect, safe("updateUserProfile"));

// Password reset/change with enhanced protection
router.post("/request-password-reset", passwordResetLimiter, vReqReset, safe("requestPasswordReset")); // Enhanced abuse protection
router.post("/reset-password", passwordResetLimiter, vReset, safe("resetPassword"));
router.put("/change-password", protect, vChange, safe("changePassword"));

// Session refresh
router.post("/refresh", protect, safe("refreshSession"));

export default router;
