import asyncHandler from "express-async-handler";
import crypto from "crypto";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import { Resend } from "resend";
import User from "../models/User.js";
import RefreshTokenModel from "../models/RefreshToken.js";
import { signAccessToken } from "../middleware/authMiddleware.js";
import { logAuthLogin, logAuthLogout, logAudit } from "../utils/audit.js";
import {
  passwordResetTemplate,
  passwordChangedTemplate,
} from "../utils/emailTemplates.js";

// NEW: send verification email after register
import { queueSendVerificationEmail } from "./emailVerificationController.js";

const RefreshToken = mongoose.models.RefreshToken || RefreshTokenModel;

// Resend client + config
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM;
const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:5173";

// Helpers
function clientNet(req) {
  const h = req.headers || {};
  const ip =
    h["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    "";
  const userAgent = h["x-client-ua"] || h["user-agent"] || "";
  return {
    ip,
    userAgent,
    hints: {
      tz: h["x-client-timezone"] || "",
      lang: h["x-client-lang"] || "",
      viewport: h["x-client-viewport"] || "",
      platform: h["x-client-platform"] || "",
      ua: userAgent,
      localTime: h["x-client-localtime"] || "",
      deviceMemory: h["x-client-devicememory"] || "",
      cpuCores: h["x-client-cpucores"] || "",
    },
  };
}
function sessionExpiry(days = 30) {
  return new Date(Date.now() + days * 86400000);
}

/** POST /api/auth/register */
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
  const jti = crypto.randomUUID();
  const { ip, userAgent, hints } = clientNet(req);
  await RefreshToken.create({
    jti,
    user: user._id,
    ip,
    userAgent,
    client: hints,
    expiresAt: sessionExpiry(30),
    lastSeenAt: new Date(),
  });

  await logAudit(req, {
    action: "REGISTER",
    targetType: "User",
    targetId: String(user._id),
    meta: { email: user.email, sessionId: jti },
    actor: user._id,
  });
  await logAuthLogin(req, user, { via: "register", sessionId: jti });

  try {
    await queueSendVerificationEmail(user.email);
  } catch (e) {
    console.warn("[register] send verification email failed:", e?.message || e);
  }

  res.status(201).json({
    token,
    sessionJti: jti,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: !!user.isAdmin,
      emailVerifiedAt: user.emailVerifiedAt || null,
    },
  });
});

/** POST /api/auth/login */
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
  const jti = crypto.randomUUID();
  const { ip, userAgent, hints } = clientNet(req);
  await RefreshToken.create({
    jti,
    user: user._id,
    ip,
    userAgent,
    client: hints,
    expiresAt: sessionExpiry(30),
    lastSeenAt: new Date(),
  });

  await logAuthLogin(req, user, { email, sessionId: jti });

  res.json({
    token,
    sessionJti: jti,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: !!user.isAdmin,
      emailVerifiedAt: user.emailVerifiedAt || null,
    },
  });
});

/** POST /api/auth/logout */
export const logoutUser = asyncHandler(async (req, res) => {
  const user = req.user || null;
  const sessionId = req.headers["x-session-id"] || "";
  await logAuthLogout(req, user, { sessionId });

  if (user?._id && sessionId) {
    const rt = await RefreshToken.findOne({ jti: sessionId, user: user._id, revokedAt: null }).exec();
    if (rt) {
      rt.revokedAt = new Date();
      await rt.save();
    }
  }
  res.json({ message: "Logged out" });
});

/** GET /api/auth/profile */
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json(user);
});

/** PUT /api/auth/profile */
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
    actor: user._id,
  });

  const toSend = updated.toObject();
  delete toSend.password;
  res.json(toSend);
});

/** POST /api/auth/request-password-reset */
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  const { email } = req.body;
  const user = await User.findOne({ email }).select("+passwordResetToken +passwordResetExpires");
  if (!user) return res.json({ message: "If the email exists, a reset link has been sent." });

  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  user.passwordResetToken = tokenHash;
  user.passwordResetExpires = new Date(Date.now() + 3600 * 1000);
  await user.save();

  await logAudit(req, {
    action: "PASSWORD_RESET_REQUEST",
    targetType: "User",
    targetId: String(user._id),
    meta: {},
    actor: user._id,
  });

  // Build + send email via Resend
  try {
    const resetUrl = `${APP_ORIGIN}/reset-password?token=${encodeURIComponent(raw)}`;
    const { subject, text, html } = passwordResetTemplate({ resetUrl, ttlMin: 60 });
    const { error } = await resend.emails.send({
      from: `Tees From The Past <${FROM}>`,
      to: user.email,
      subject,
      text,
      html,
    });
    if (error) throw error;
  } catch (e) {
    console.error("[password-reset] email send failed:", e);
  }

  res.json({ message: "If the email exists, a reset link has been sent." });
});

/** POST /api/auth/reset-password */
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
    actor: user._id,
  });

  // Confirmation email
  try {
    const { subject, text, html } = passwordChangedTemplate();
    const { error } = await resend.emails.send({
      from: `Tees From The Past <${FROM}>`,
      to: user.email,
      subject,
      text,
      html,
    });
    if (error) throw error;
  } catch (e) {
    console.error("[password-reset] confirmation email failed:", e);
  }

  res.json({ message: "Password updated" });
});

/** PUT /api/auth/change-password */
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
    actor: user._id,
  });

  // Confirmation email
  try {
    const { subject, text, html } = passwordChangedTemplate();
    const { error } = await resend.emails.send({
      from: `Tees From The Past <${FROM}>`,
      to: user.email,
      subject,
      text,
      html,
    });
    if (error) throw error;
  } catch (e) {
    console.error("[change-password] confirmation email failed:", e);
  }

  res.json({ message: "Password changed" });
});

/** POST /api/auth/refresh */
export const refreshSession = asyncHandler(async (req, res) => {
  const token = signAccessToken(req.user._id);

  const sessionId = req.headers["x-session-id"];
  if (sessionId) {
    const rt = await RefreshToken.findOne({ jti: sessionId, user: req.user._id, revokedAt: null }).exec();
    if (rt) {
      rt.expiresAt = sessionExpiry(30);
      rt.lastSeenAt = new Date();
      await rt.save();
    }
  }

  res.json({ token });
});
