// backend/routes/auth.js
import express from "express";
import rateLimit from "express-rate-limit";
import { body } from "express-validator";
import { protect } from "../middleware/authMiddleware.js";

// Namespace import avoids hard-failing if a single named export is missing
import * as auth from "../controllers/authController.js";

const router = express.Router();

/** ----------------------------------------------------------------------
 * Validators (keep your existing simple, local validators)
 * ---------------------------------------------------------------------*/
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

/** ----------------------------------------------------------------------
 * Safe wrapper so missing handlers don't crash the app
 * ---------------------------------------------------------------------*/
const safe = (fnName) => {
  const fn = auth[fnName];
  if (typeof fn === "function") return fn;
  return (_req, res) =>
    res
      .status(501)
      .json({ message: `Handler '${fnName}' is not available on authController` });
};

/** ----------------------------------------------------------------------
 * Per-route rate limiters (adds what the audit flagged)
 * ---------------------------------------------------------------------*/
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,                  // 10 login attempts / 15 min / IP
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 registrations / hour / IP
  standardHeaders: true,
  legacyHeaders: false,
});

// Optional but recommended: keep bots from hammering reset endpoints
const resetLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 min
  max: 10,                   // 10 reset requests / 30 min / IP
  standardHeaders: true,
  legacyHeaders: false,
});

/** ----------------------------------------------------------------------
 * Routes (preserve your full surface, add limiters where it makes sense)
 * ---------------------------------------------------------------------*/
// Register / Login / Logout
router.post("/register", registerLimiter, vRegister, safe("registerUser"));
router.post("/login", loginLimiter, vLogin, safe("loginUser"));
router.post("/logout", protect, safe("logoutUser"));

// Profile
router.get("/profile", protect, safe("getUserProfile"));
router.put("/profile", protect, safe("updateUserProfile"));

// Password reset flows
router.post("/request-password-reset", resetLimiter, vReqReset, safe("requestPasswordReset"));
router.post("/reset-password", vReset, safe("resetPassword"));
router.put("/change-password", protect, vChange, safe("changePassword"));

// Session refresh (kept as you had it)
router.post("/refresh", protect, safe("refreshSession"));

export default router;
