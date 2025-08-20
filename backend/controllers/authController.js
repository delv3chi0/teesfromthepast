// backend/controllers/authController.js
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import { validationResult } from "express-validator";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import { signAccessToken } from "../middleware/authMiddleware.js";
import { logAuthLogin, logAuthLogout, logAudit } from "../utils/audit.js";

/** helpers */
function clientNet(req) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    "";
  const userAgent = req.headers["user-agent"] || "";
  return { ip, userAgent };
}
function sessionExpiry(days = 30) {
  return new Date(Date.now() + days * 86400000);
}

/**
 * POST /api/auth/register
 */
export const registerUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  const { username, email, password, firstName = "", lastName = "" } = req.body;

  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) {
    res.status(400);
    throw new Error("User with that email or username already exists");
  }

  const user = await User.create({ username, email, password, firstName, lastName });

  const token = signAccessToken(user._id);

  // create a device/session record (for Admin > Devices view)
  const jti = crypto.randomUUID();
  const { ip, userAgent } = clientNet(req);
  await RefreshToken.create({
    jti,
    user: user._id,
    ip,
    userAgent,
    expiresAt: sessionExpiry(30),
  });

  // optional audit: REGISTER + LOGIN
  await logAudit(req, {
    action: "REGISTER",
    targetType: "User",
    targetId: String(user._id),
    meta: { email: user.email },
  });
  await logAuthLogin(req, user, { via: "register" });

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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const token = signAccessToken(user._id);

  // record a session for Devices panel
  const jti = crypto.randomUUID();
  const { ip, userAgent } = clientNet(req);
  await RefreshToken.create({
    jti,
    user: user._id,
    ip,
    userAgent,
    expiresAt: sessionExpiry(30),
  });

  // fire-and-forget audit
  await logAuthLogin(req, user, { email });

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
 * POST /api/auth/logout  (stateless JWT)
 * We still audit, and attempt to revoke the most-recent session for this client.
 */
export const logoutUser = asyncHandler(async (req, res) => {
  const user = req.user || null;
  await logAuthLogout(req, user, {});

  if (user?._id) {
    const { ip, userAgent } = clientNet(req);
    // Revoke the most recent active session for this user+client
    const rt = await RefreshToken.findOne({
      user: user._id,
      revokedAt: { $eq: null },
    })
      .sort({ createdAt: -1 })
      .exec();
    if (rt) {
      rt.revokedAt = new Date();
      await rt.save();
    }
  }

  res.json({ message: "Logged out" });
});

/**
 * GET /api/auth/profile
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json(user);
});

/**
 * PUT /api/auth/profile
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { username, email, firstName, lastName, shippingAddress, billingAddress } = req.body;

  if (username !== undefined) user.username = username;
  if (email !== undefined) user.email = email;
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (shippingAddress !== undefined) user.shippingAddress = shippingAddress;
  if (billingAddress !== undefined) user.billingAddress = billingAddress;

  const updated = await user.save();

  await logAudit(req, {
    action: "PROFILE_UPDATE",
    targetType: "User",
    targetId: String(user._id),
    meta: {},
  });

  const toSend = updated.toObject();
  delete toSend.password;
  res.json(toSend);
});

/**
 * POST /api/auth/request-password-reset
 */
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  const { email } = req.body;
  const user = await User.findOne({ email }).select("+passwordResetToken +passwordResetExpires");
  if (!user) {
    // Don't leak presence — still return OK
    return res.json({ message: "If the email exists, a reset link has been sent." });
  }

  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  user.passwordResetToken = tokenHash;
  user.passwordResetExpires = new Date(Date.now() + 3600 * 1000); // 1 hour
  await user.save();

  await logAudit(req, {
    action: "PASSWORD_RESET_REQUEST",
    targetType: "User",
    targetId: String(user._id),
    meta: {},
  });

  // You would email `raw` to the user here. For now we just respond.
  res.json({ message: "If the email exists, a reset link has been sent." });
});

/**
 * POST /api/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  const { token, password } = req.body;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select("+password");
  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired reset token");
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await logAudit(req, {
    action: "PASSWORD_RESET",
    targetType: "User",
    targetId: String(user._id),
    meta: {},
  });

  res.json({ message: "Password updated" });
});

/**
 * PUT /api/auth/change-password  (auth required)
 */
export const changePassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  const ok = await user.matchPassword(currentPassword);
  if (!ok) {
    res.status(400);
    throw new Error("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  await logAudit(req, {
    action: "PASSWORD_CHANGE",
    targetType: "User",
    targetId: String(user._id),
    meta: {},
  });

  res.json({ message: "Password changed" });
});

/**
 * POST /api/auth/refresh  (auth required)
 */
export const refreshSession = asyncHandler(async (req, res) => {
  const token = signAccessToken(req.user._id);

  // light touch: extend the most recent session
  const rt = await RefreshToken.findOne({ user: req.user._id, revokedAt: null })
    .sort({ createdAt: -1 })
    .exec();
  if (rt) {
    rt.expiresAt = sessionExpiry(30);
    await rt.save();
  }

  res.json({ token });
});
