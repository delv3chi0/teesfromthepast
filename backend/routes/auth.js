import express from "express";
import { body } from "express-validator";
import { protect } from "../middleware/authMiddleware.js";

import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  requestPasswordReset,
  resetPassword,
  changePassword,
  refreshSession,
} from "../controllers/authController.js";

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

/** routes */
router.post("/register", vRegister, registerUser);
router.post("/login", vLogin, loginUser);
router.post("/logout", protect, logoutUser);

router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);

router.post("/request-password-reset", vReqReset, requestPasswordReset);
router.post("/reset-password", vReset, resetPassword);
router.put("/change-password", protect, vChange, changePassword);

router.post("/refresh", protect, refreshSession);

export default router;
