// backend/routes/auth.js
import express from "express";
import rateLimit from "express-rate-limit";
import { body } from "express-validator";
import { protect } from "../middleware/authMiddleware.js";
import * as auth from "../controllers/authController.js";

// Email verification handlers (public, rate-limited)
import {
  sendVerification,
  verifyEmail,
  resendVerification,
} from "../controllers/emailVerificationController.js";

const router = express.Router();

/** --------------------------- Validators --------------------------- */
const vRegister = [
  body("username").trim().notEmpty().withMessage("Username is required"),
  body("email").isEmail().withMessage("Valid email required"),
  body("password").isLength({ min: 6 }).withMessage("Password min 6 chars"),
];

const vLogin = [
  body("email").isEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const vReqReset = [body("email").isEmail().withMessage("Valid email required")];

const vReset = [
  body("token").notEmpty().withMessage("Reset token required"),
  body("password").isLength({ min: 6 }).withMessage("Password min 6 chars"),
];

const vChange = [
  body("currentPassword").notEmpty().withMessage("Current password required"),
  body("newPassword").isLength({ min: 6 }).withMessage("New password min 6 chars"),
];

const vEmailOnly = [body("email").isEmail().withMessage("Valid email required")];
const vVerify = [
  body("email").isEmail().withMessage("Valid email required"),
  body("token").notEmpty().withMessage("Token required"),
];

/** ----------------------- Per-route limiters ---------------------- */
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
const resetLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const verifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

/** -------- Safe wrapper so missing handlers don't crash the app --- */
const safe = (fnName) => {
  const fn = auth[fnName];
  if (typeof fn === "function") return fn;
  return (_req, res) =>
    res
      .status(501)
      .json({ message: `Handler '${fnName}' is not available on authController` });
};

/** ------------------------------- Routes -------------------------- */
// Register / Login / Logout
router.post("/register", registerLimiter, vRegister, safe("registerUser"));
router.post("/login", loginLimiter, vLogin, safe("loginUser"));
router.post("/logout", protect, safe("logoutUser"));

// Email verification (PUBLIC + rate-limited)
// These must not require x-session-id so that magic links & fresh devices work.
router.post("/send-verification", verifyLimiter, vEmailOnly, sendVerification);
router.post("/resend-verification", verifyLimiter, vEmailOnly, resendVerification);
router.post("/verify-email", verifyLimiter, vVerify, verifyEmail);

// Profile (JWT required; session optional)
router.get("/profile", protect, safe("getUserProfile"));
router.put("/profile", protect, safe("updateUserProfile"));

// Password reset flows (PUBLIC/low-friction)
router.post("/request-password-reset", resetLimiter, vReqReset, safe("requestPasswordReset"));
router.post("/reset-password", vReset, safe("resetPassword"));

// Change password (JWT required; session optional)
router.put("/change-password", protect, vChange, safe("changePassword"));

// Session refresh (JWT required; session optional)
router.post("/refresh", protect, safe("refreshSession"));

export default router;
