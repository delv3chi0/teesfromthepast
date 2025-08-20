// backend/controllers/authController.js
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import { validationResult } from "express-validator";
import User from "../models/User.js";
import { signAccessToken } from "../middleware/authMiddleware.js";
import { logAudit } from "../utils/audit.js";

/**
 * Helper: standardize validation response
 */
const ensureValid = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    const err = new Error(first.msg);
    err.statusCode = 400;
    throw err;
  }
};

/**
 * POST /api/auth/register
 */
export const registerUser = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { username, email, password, firstName, lastName } = req.body;

  const exists = await User.findOne({ email });
  if (exists) { res.status(400); throw new Error("User already exists"); }

  const user = await User.create({ username, email, password, firstName, lastName });
  const token = signAccessToken(user._id);

  // Audit
  await logAudit(req, {
    action: "REGISTER",
    targetType: "User",
    targetId: user._id,
    meta: { email, username },
  }).catch(() => {});

  res.status(201).json({
    token,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: !!user.isAdmin,
    },
  });
});

/**
 * POST /api/auth/login
 */
export const loginUser = asyncHandler(async (req, res) => {
  ensureValid(req);

  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    res.status(401); throw new Error("Invalid email or password");
  }

  const token = signAccessToken(user._id);

  // Audit
  await logAudit(req, {
    action: "LOGIN",
    targetType: "User",
    targetId: user._id,
    meta: { email },
  }).catch(() => {});

  res.json({
    token,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: !!user.isAdmin,
    },
  });
});

/**
 * POST /api/auth/logout
 * (Stateless JWT — nothing to revoke here; still log the event upstream in the route.)
 */
export const logoutUser = asyncHandler(async (_req, res) => {
  res.json({ message: "Logged out" });
});

/**
 * POST /api/auth/refresh  (requires protect)
 * Returns a fresh short-lived access token for the same user.
 */
export const refreshSession = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) { res.status(401); throw new Error("Not authorized"); }

  const token = signAccessToken(userId);

  await logAudit(req, {
    action: "TOKEN_REFRESH",
    targetType: "User",
    targetId: userId,
    meta: {},
  }).catch(() => {});

  res.json({ token });
});

/**
 * GET /api/auth/profile  (requires protect)
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) { res.status(404); throw new Error("User not found"); }
  res.json(user);
});

/**
 * PUT /api/auth/profile  (requires protect)
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
  ensureValid(req);

  const user = await User.findById(req.user._id);
  if (!user) { res.status(404); throw new Error("User not found"); }

  const before = {
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };

  if (req.body.username != null) user.username = req.body.username;
  if (req.body.email != null)    user.email = req.body.email;
  if (req.body.firstName != null) user.firstName = req.body.firstName;
  if (req.body.lastName != null)  user.lastName = req.body.lastName;

  const updated = await user.save();
  const out = { ...updated.toObject() }; delete out.password;

  await logAudit(req, {
    action: "PROFILE_UPDATE",
    targetType: "User",
    targetId: user._id,
    meta: { before, after: { username: updated.username, email: updated.email, firstName: updated.firstName, lastName: updated.lastName } },
  }).catch(() => {});

  res.json(out);
});

/**
 * POST /api/auth/request-password-reset
 * Generates a short-lived reset token and stores a hashed version on the user.
 * (Email sending not included here.)
 */
export const requestPasswordReset = asyncHandler(async (req, res) => {
  ensureValid(req);

  const { email } = req.body;
  const user = await User.findOne({ email });
  // For privacy, never disclose whether user exists.
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = tokenHash;
    user.passwordResetExpires = expiresAt;
    await user.save();

    await logAudit(req, {
      action: "PASSWORD_RESET_REQUEST",
      targetType: "User",
      targetId: user._id,
      meta: { email },
    }).catch(() => {});

    // In a real app you'd email `token` to the user. For now we return it so you can wire the UI.
    return res.json({ message: "If the account exists, a reset link was created.", token });
  }

  res.json({ message: "If the account exists, a reset link was created." });
});

/**
 * POST /api/auth/reset-password
 * Body: { token, password }
 */
export const resetPassword = asyncHandler(async (req, res) => {
  ensureValid(req);

  const { token, password } = req.body;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select("+password");

  if (!user) { res.status(400); throw new Error("Invalid or expired reset token."); }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await logAudit(req, {
    action: "PASSWORD_RESET_COMPLETE",
    targetType: "User",
    targetId: user._id,
    meta: {},
  }).catch(() => {});

  res.json({ message: "Password reset successful." });
});

/**
 * PUT /api/auth/change-password  (requires protect)
 * Body: { currentPassword, newPassword }
 */
export const changePassword = asyncHandler(async (req, res) => {
  ensureValid(req);

  const userId = req.user?._id;
  if (!userId) { res.status(401); throw new Error("Not authorized"); }

  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(userId).select("+password");
  if (!user) { res.status(404); throw new Error("User not found."); }

  const ok = await user.matchPassword?.(currentPassword);
  if (!ok) { res.status(400); throw new Error("Current password is incorrect."); }

  user.password = newPassword;
  await user.save();

  await logAudit(req, {
    action: "PASSWORD_CHANGE",
    targetType: "User",
    targetId: user._id,
    meta: { selfService: true },
  }).catch(() => {});

  res.json({ message: "Password changed successfully." });
});
