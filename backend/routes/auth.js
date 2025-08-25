// backend/routes/auth.js
import express from "express";
import rateLimit from "express-rate-limit";
import { body, query } from "express-validator";
import { protect } from "../middleware/authMiddleware.js";
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

// limiters (updated for enhanced security)
const loginLimiter = rateLimit({ 
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  standardHeaders: true, 
  legacyHeaders: false,
  handler: (req, res) => {
    res.setHeader('Retry-After', Math.ceil(60)); // Retry after 60 seconds
    res.status(429).json({ 
      error: 'Too many login attempts. Please try again later.',
      retryAfter: 60 
    });
  }
});
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });
const verifyLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });
const resetIpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const resetEmailLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, max: 3, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => String(req.body?.email || "").trim().toLowerCase(),
});

const safe = (name) => (typeof auth[name] === "function" ? auth[name] : (_req, res) => res.status(501).json({ message: `Missing ${name}` }));

// === NEW: adaptive captcha policy probe ===
router.get("/captcha-check", vCaptchaContext, safe("captchaCheck"));

// Auth
router.post("/register", registerLimiter, vRegister, safe("registerUser")); // captcha is adaptive in controller
router.post("/login", loginLimiter, vLogin, safe("loginUser"));             // captcha is adaptive in controller
router.post("/logout", protect, safe("logoutUser"));

// Email verification (unchanged hooks)
router.post("/send-verification", verifyLimiter, vEmailOnly, safe("sendVerification"));
router.post("/resend-verification", verifyLimiter, vEmailOnly, safe("resendVerification"));
router.post("/verify-email", verifyLimiter, [ body("email").isEmail(), body("token").notEmpty() ], safe("verifyEmail"));

// Profile
router.get("/profile", protect, safe("getUserProfile"));
router.put("/profile", protect, safe("updateUserProfile"));

// Password reset/change
router.post("/request-password-reset", resetIpLimiter, resetEmailLimiter, vReqReset, safe("requestPasswordReset")); // adaptive captcha in controller
router.post("/reset-password", vReset, safe("resetPassword"));
router.put("/change-password", protect, vChange, safe("changePassword"));

// Session refresh
router.post("/refresh", protect, safe("refreshSession"));

export default router;
