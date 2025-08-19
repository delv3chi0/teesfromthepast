// backend/controllers/authController.js
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import sgMail from "@sendgrid/mail";
import { validationResult } from "express-validator";
import User from "../models/User.js";
import { signAccessToken } from "../middleware/authMiddleware.js"; // use the same token shape as protect()

import "dotenv/config";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.error("[Auth Cfg] WARNING: SENDGRID_API_KEY env var is not set! Email sending will fail.");
}

// POST /api/auth/register
export const registerUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, email, password, firstName, lastName } = req.body;
  const lower = (email || "").toLowerCase();

  const userExistsByEmail = await User.findOne({ email: lower });
  if (userExistsByEmail) return res.status(400).json({ message: "User with this email already exists" });

  const userExistsByUsername = await User.findOne({ username });
  if (userExistsByUsername) return res.status(400).json({ message: "Username already taken" });

  // NOTE: your User model likely hashes password in a pre-save hook
  const user = await User.create({
    username,
    email: lower,
    password,
    firstName: firstName || "",
    lastName: lastName || "",
  });
  if (!user) return res.status(400).json({ message: "Invalid user data during registration" });

  const token = signAccessToken(user._id);

  return res.status(201).json({
    _id: user._id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isAdmin: user.isAdmin,
    token,
  });
});

// POST /api/auth/login
export const loginUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const lower = (email || "").toLowerCase();

  const user = await User.findOne({ email: lower }).select("+password");
  if (!user) return res.status(401).json({ message: "Invalid email or password" });

  const ok = await user.matchPassword(password);
  if (!ok) return res.status(401).json({ message: "Invalid email or password" });

  const token = signAccessToken(user._id);

  return res.json({
    _id: user._id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isAdmin: user.isAdmin,
    shippingAddress: user.shippingAddress,
    billingAddress: user.billingAddress,
    token,
  });
});

// POST /api/auth/logout
export const logoutUser = asyncHandler(async (_req, res) => {
  // Stateless JWT: nothing to invalidate server-side (unless you maintain a denylist).
  return res.status(200).json({ message: "Logged out successfully" });
});

// POST /api/auth/refresh (protected)
export const refreshSession = asyncHandler(async (req, res) => {
  // `protect` populated req.user with the current token claims / user
  const userId = req.user?._id || req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ message: "Not authorized" });

  const token = signAccessToken(userId);
  return res.status(200).json({ token });
});

// GET /api/auth/profile
export const getUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id || req.user?.sub;
  const user = await User.findById(userId).select("-password");
  if (!user) return res.status(404).json({ message: "User not found for profile" });

  return res.json({
    _id: user._id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isAdmin: user.isAdmin,
    shippingAddress: user.shippingAddress,
    billingAddress: user.billingAddress,
    lastContestSubmissionMonth: user.lastContestSubmissionMonth,
    monthlyVoteRecord: user.monthlyVoteRecord,
  });
});

// PUT /api/auth/profile
export const updateUserProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userId = req.user?._id || req.user?.id || req.user?.sub;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found for profile update" });

  user.username = req.body.username ?? user.username;

  if (req.body.email && req.body.email.toLowerCase() !== user.email) {
    const lower = req.body.email.toLowerCase();
    const exist = await User.findOne({ email: lower });
    if (exist && String(exist._id) !== String(user._id)) {
      return res.status(400).json({ message: "Email already in use." });
    }
    user.email = lower;
  }

  user.firstName = req.body.firstName ?? user.firstName;
  user.lastName = req.body.lastName ?? user.lastName;

  // Merge address helpers
  const updateAddress = (currentAddressDoc, newAddressData) => {
    if (!newAddressData && newAddressData !== null) return currentAddressDoc;
    if (newAddressData === null) return undefined; // allow clearing the address
    const next = currentAddressDoc || {};
    Object.keys(newAddressData).forEach((k) => {
      if (newAddressData[k] !== undefined) next[k] = newAddressData[k];
    });
    return next;
  };
  if (req.body.shippingAddress !== undefined) {
    user.shippingAddress = updateAddress(user.shippingAddress, req.body.shippingAddress);
  }
  if (req.body.billingAddress !== undefined) {
    user.billingAddress = updateAddress(user.billingAddress, req.body.billingAddress);
  }

  const updated = await user.save();

  return res.json({
    _id: updated._id,
    username: updated.username,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    isAdmin: updated.isAdmin,
    shippingAddress: updated.shippingAddress,
    billingAddress: updated.billingAddress,
  });
});

// PUT /api/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { currentPassword, newPassword } = req.body;
  const userId = req.user?._id || req.user?.id || req.user?.sub;

  const user = await User.findById(userId).select("+password");
  if (!user) return res.status(404).json({ message: "User not found." });

  const ok = await user.matchPassword(currentPassword);
  if (!ok) return res.status(401).json({ message: "Incorrect current password." });

  user.password = newPassword;
  await user.save();

  return res.status(200).json({ message: "Password changed successfully." });
});

// POST /api/auth/request-password-reset
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;
  const lower = (email || "").toLowerCase();
  const user = await User.findOne({ email: lower });

  // Respond 200 regardless, to avoid leaking which emails are registered
  if (!user) {
    return res.status(200).json({ message: "If your email is registered, you will receive a password reset link shortly." });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 3600000; // 1h

  try {
    await user.save({ validateBeforeSave: false });

    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL || !process.env.FRONTEND_URL) {
      throw new Error("Server configuration error for sending email.");
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const msg = {
      to: user.email,
      from: { email: process.env.SENDGRID_FROM_EMAIL, name: "TeesFromThePast Support" },
      subject: "Password Reset Request",
      html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    };

    await sgMail.send(msg);
    return res.status(200).json({ message: "If your email is registered, you will receive a password reset link shortly." });
  } catch (error) {
    console.error("[Auth Ctrl] Error during SendGrid password reset:", error);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    try {
      await user.save({ validateBeforeSave: false });
    } catch (saveError) {
      console.error(`[Auth Ctrl] Failed to clear token for ${user.email}:`, saveError);
    }
    return res.status(500).json({ message: "There was an issue processing your request. Please try again later." });
  }
});

// POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { token, password } = req.body;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select("+passwordResetToken +passwordResetExpires");

  if (!user) return res.status(400).json({ message: "Password reset token is invalid or has expired." });

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return res.status(200).json({ message: "Password has been reset successfully. You can now log in with your new password." });
});
