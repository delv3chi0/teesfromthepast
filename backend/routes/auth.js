import express from "express";
import { body } from "express-validator";
import { protect } from "../middleware/authMiddleware.js";

// Namespace import avoids hard-failing if a single named export is missing
import * as auth from "../controllers/authController.js";

const router = express.Router();

/** validators */
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

// small helper so a missing handler doesn’t crash the app
const safe = (fnName) => {
  const fn = auth[fnName];
  if (typeof fn === "function") return fn;
  return (_req, res) =>
    res
      .status(501)
      .json({ message: `Handler '${fnName}' is not available on authController` });
};

/** routes */
router.post("/register", vRegister, safe("registerUser"));
router.post("/login", vLogin, safe("loginUser"));
router.post("/logout", protect, safe("logoutUser"));

router.get("/profile", protect, safe("getUserProfile"));
router.put("/profile", protect, safe("updateUserProfile"));

router.post("/request-password-reset", vReqReset, safe("requestPasswordReset"));
router.post("/reset-password", vReset, safe("resetPassword"));
router.put("/change-password", protect, vChange, safe("changePassword"));

router.post("/refresh", protect, safe("refreshSession"));

export default router;
