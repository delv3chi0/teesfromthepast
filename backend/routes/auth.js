import express from "express";
import rateLimit from "express-rate-limit";
import { body } from "express-validator";
import { protect } from "../middleware/authMiddleware.js";
import * as auth from "../controllers/authController.js";

// ✅ FIXED PATH: controllers (not routes)
import {
  sendVerification,
  verifyEmail,
  resendVerification,
} from "../controllers/emailVerificationController.js";

const router = express.Router();

/* ----------------------------- Validators ---------------------------- */
const vRegister = [
  body("username").trim().notEmpty().withMessage("Username is required"),
  body("email").isEmail().withMessage("Valid email required"),
  body("password")
    .isString()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

const vLogin = [
  body("email").isEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const vReqReset = [body("email").isEmail().withMessage("Valid email required")];

const vReset = [
  body("token").notEmpty().withMessage("Reset token required"),
  body("password")
    .isString()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

const vChange = [
  body("currentPassword").notEmpty().withMessage("Current password required"),
  body("newPassword")
    .isString()
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters"),
];

const vEmailOnly = [body("email").isEmail().withMessage("Valid email required")];
const vVerify = [
  body("email").isEmail().withMessage("Valid email required"),
  body("token").notEmpty().withMessage("Token required"),
];

/* ----------------------------- Safe wrapper -------------------------- */
const safe = (fnName) => {
  const fn = auth[fnName];
  if (typeof fn === "function") return fn;
  return (_req, res) =>
    res
      .status(501)
      .json({ message: `Handler '${fnName}' is not available on authController` });
};

/* ----------------------------- Rate limits --------------------------- */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});
const verifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset — dual limiter
const resetIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const resetEmailLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.body?.email || "").trim().toLowerCase(),
});

/* -------------------------------- Routes ---------------------------- */
// Auth
router.post("/register", registerLimiter, vRegister, safe("registerUser"));
router.post("/login", loginLimiter, vLogin, safe("loginUser"));
router.post("/logout", protect, safe("logoutUser"));

// Email verification (public)
router.post("/send-verification", verifyLimiter, vEmailOnly, sendVerification);
router.post("/resend-verification", verifyLimiter, vEmailOnly, resendVerification);
router.post("/verify-email", verifyLimiter, vVerify, verifyEmail);

// Profile
router.get("/profile", protect, safe("getUserProfile"));
router.put("/profile", protect, safe("updateUserProfile"));

// Password reset/change
router.post(
  "/request-password-reset",
  resetIpLimiter,
  resetEmailLimiter,
  vReqReset,
  safe("requestPasswordReset")
);
router.post("/reset-password", vReset, safe("resetPassword"));
router.put("/change-password", protect, vChange, safe("changePassword"));

// Session refresh
router.post("/refresh", protect, safe("refreshSession"));

export default router;
