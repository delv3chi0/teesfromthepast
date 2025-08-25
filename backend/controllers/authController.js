import asyncHandler from "express-async-handler";
import crypto from "crypto";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import { Resend } from "resend";
import User from "../models/User.js";
import RefreshTokenModel from "../models/RefreshToken.js";
import { signAccessToken } from "../middleware/authMiddleware.js";
import { logAuthLogin, logAuthLogout, logAudit } from "../utils/audit.js";
import { passwordResetTemplate, passwordChangedTemplate } from "../utils/emailTemplates.js";
import { queueSendVerificationEmail } from "./emailVerificationController.js";
import logger from "../utils/logger.js";

import { verifyHCaptcha } from "../middleware/hcaptcha.js";
import { markAuthFail, clearAuthFails, getCaptchaPolicy } from "../middleware/rateLimiters.js";

const RefreshToken = mongoose.models.RefreshToken || RefreshTokenModel;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM;
const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:5173";

function clientNet(req) {
  const h = req.headers || {};
  const ip = h["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "";
  const userAgent = h["x-client-ua"] || h["user-agent"] || "";
  return { ip, userAgent, hints: {
    tz: h["x-client-timezone"] || "", lang: h["x-client-lang"] || "", viewport: h["x-client-viewport"] || "",
    platform: h["x-client-platform"] || "", ua: userAgent, localTime: h["x-client-localtime"] || "",
    deviceMemory: h["x-client-devicememory"] || "", cpuCores: h["x-client-cpucores"] || "",
  }};
}
function sessionExpiry(days = 30) { return new Date(Date.now() + days * 86400000); }
async function revokeAllUserSessions(userId) {
  try { await RefreshToken.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: new Date() } }).exec(); }
  catch (e) { console.error("[sessions] revoke all failed:", e); }
}

// --- Optional dev bypass: DISABLE_CAPTCHA=1 will skip captcha checks
function captchaRequiredOk(token) {
  if (process.env.DISABLE_CAPTCHA === "1") return Promise.resolve({ ok: true, raw: { bypassed: true } });
  return verifyHCaptcha(token);
}

// Probe for FE (optional UI optimization)
export const captchaCheck = asyncHandler(async (req, res) => {
  const { ip } = clientNet(req);
  const email = String(req.query.email || "").trim().toLowerCase();
  const pol = await getCaptchaPolicy({ ip, email: email || undefined });
  res.json({ context: String(req.query.context || ""), ...pol });
});

/** POST /api/auth/register */
export const registerUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req); if (!errors.isEmpty()) { res.status(400); throw new Error(errors.array()[0].msg); }

  const { ip } = clientNet(req);
  const email = String(req.body?.email || "").trim().toLowerCase();
  const pol = await getCaptchaPolicy({ ip, email });
  if (pol.needCaptcha) {
    const { ok } = await captchaRequiredOk(req.body?.hcaptchaToken);
    if (!ok) return res.status(428).json({ message: "Captcha required", needCaptcha: true });
  }

  const { username, password, firstName = "", lastName = "" } = req.body;
  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) { res.status(400); throw new Error("User with that email or username already exists"); }

  const user = await User.create({ username, email, password, firstName, lastName });

  const token = signAccessToken(user._id);
  const jti = crypto.randomUUID();
  const { userAgent, hints } = clientNet(req);
  await RefreshToken.create({ jti, user: user._id, ip, userAgent, client: hints, expiresAt: sessionExpiry(30), lastSeenAt: new Date() });

  await logAudit(req, { action: "REGISTER", targetType: "User", targetId: String(user._id), meta: { email: user.email, sessionId: jti }, actor: user._id });
  await logAuthLogin(req, user, { via: "register", sessionId: jti });

  try { await queueSendVerificationEmail(user.email); } catch (e) { console.warn("[register] send verification email failed:", e?.message || e); }

  res.status(201).json({ token, sessionJti: jti, user: {
    _id: user._id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName,
    isAdmin: !!user.isAdmin, emailVerifiedAt: user.emailVerifiedAt || null,
  }});
});

/** POST /api/auth/login */
export const loginUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req); if (!errors.isEmpty()) { res.status(400); throw new Error(errors.array()[0].msg); }

  const email = String(req.body?.email || "").trim().toLowerCase();
  const { ip } = clientNet(req);

  const pol = await getCaptchaPolicy({ ip, email });
  if (pol.locked) return res.status(429).json({ message: "Too many attempts. Try later.", needCaptcha: true, lockedUntil: pol.until });
  if (pol.needCaptcha) {
    const { ok } = await captchaRequiredOk(req.body?.hcaptchaToken);
    if (!ok) return res.status(428).json({ message: "Captcha required", needCaptcha: true });
  }

  // Case-insensitive login by normalized email
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(req.body.password))) {
    await markAuthFail({ ip, email });
    res.status(401);
    throw new Error("Invalid email or password");
  }

  await clearAuthFails({ ip, email });

  const token = signAccessToken(user);
  const jti = crypto.randomUUID();
  const rotationId = crypto.randomUUID(); // for tracking token families
  const refreshToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  
  const { userAgent, hints } = clientNet(req);
  await RefreshToken.create({ 
    jti, 
    user: user._id, 
    ip, 
    userAgent, 
    client: hints, 
    tokenHash,
    rotationId,
    expiresAt: sessionExpiry(7), // 7 days sliding window
    lastSeenAt: new Date() 
  });

  await logAuthLogin(req, user, { email, sessionId: jti });

  res.json({ 
    token, 
    refreshToken, // return raw token to frontend
    sessionJti: jti, 
    user: {
      _id: user._id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName,
      isAdmin: !!user.isAdmin, emailVerifiedAt: user.emailVerifiedAt || null,
    }
  });
});

/** POST /api/auth/logout */
export const logoutUser = asyncHandler(async (req, res) => {
  const user = req.user || null;
  const sessionId = req.headers["x-session-id"] || "";
  await logAuthLogout(req, user, { sessionId });

  if (user?._id && sessionId) {
    const rt = await RefreshToken.findOne({ jti: sessionId, user: user._id, revokedAt: null }).exec();
    if (rt) { rt.revokedAt = new Date(); await rt.save(); }
  }
  res.json({ message: "Logged out" });
});

/** GET /api/auth/profile */
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) { res.status(404); throw new Error("User not found"); }
  res.json(user);
});

/** PUT /api/auth/profile */
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!user) { res.status(404); throw new Error("User not found"); }

  const { username, email, firstName, lastName, shippingAddress, billingAddress } = req.body;
  if (username !== undefined) user.username = username;
  if (email !== undefined) user.email = String(email).trim().toLowerCase();
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (shippingAddress !== undefined) user.shippingAddress = shippingAddress;
  if (billingAddress !== undefined) user.billingAddress = billingAddress;

  const updated = await user.save();

  await logAudit(req, { action: "PROFILE_UPDATE", targetType: "User", targetId: String(user._id), meta: {}, actor: user._id });

  const toSend = updated.toObject(); delete toSend.password; res.json(toSend);
});

/** POST /api/auth/request-password-reset */
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const errors = validationResult(req); if (!errors.isEmpty()) { res.status(400); throw new Error(errors.array()[0].msg); }

  const email = String(req.body?.email || "").trim().toLowerCase();
  const { ip } = clientNet(req);

  const pol = await getCaptchaPolicy({ ip, email });
  if (pol.needCaptcha) {
    const { ok } = await captchaRequiredOk(req.body?.hcaptchaToken);
    if (!ok) return res.status(428).json({ message: "Captcha required", needCaptcha: true });
  }

  const user = await User.findOne({ email }).select("+passwordResetToken +passwordResetExpires");

  const generic = { message: "If the email exists, a reset link has been sent." };
  if (!user) return res.json(generic);

  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  user.passwordResetToken = tokenHash;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  await logAudit(req, { action: "PASSWORD_RESET_REQUEST", targetType: "User", targetId: String(user._id), meta: {}, actor: user._id });

  try {
    const resetUrl = `${APP_ORIGIN}/reset-password?token=${encodeURIComponent(raw)}`;
    const { subject, text, html } = passwordResetTemplate({ resetUrl, ttlMin: 60 });
    const { error } = await resend.emails.send({ from: `Tees From The Past <${FROM}>`, to: user.email, subject, text, html });
    if (error) throw error;
  } catch (e) { 
    logger.error({ error: e.message, email: user.email }, "Password reset email send failed");
  }

  res.json(generic);
});

/** POST /api/auth/reset-password */
export const resetPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req); if (!errors.isEmpty()) { res.status(400); throw new Error(errors.array()[0].msg); }

  const { token, password } = req.body;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select("+password");
  if (!user) { res.status(400); throw new Error("Invalid or expired reset token"); }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await revokeAllUserSessions(user._id);

  await logAudit(req, { action: "PASSWORD_RESET", targetType: "User", targetId: String(user._id), meta: {}, actor: user._id });

  try {
    const { subject, text, html } = passwordChangedTemplate();
    const { error } = await resend.emails.send({ from: `Tees From The Past <${FROM}>`, to: user.email, subject, text, html });
    if (error) throw error;
  } catch (e) { console.error("[password-reset] confirmation email failed:", e); }

  res.json({ message: "Password updated" });
});

/** PUT /api/auth/change-password */
export const changePassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req); if (!errors.isEmpty()) { res.status(400); throw new Error(errors.array()[0].msg); }

  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  if (!user) { res.status(404); throw new Error("User not found"); }
  const ok = await user.matchPassword(currentPassword);
  if (!ok) { res.status(400); throw new Error("Current password is incorrect"); }

  user.password = newPassword;
  await user.save();
  await revokeAllUserSessions(user._id);

  await logAudit(req, { action: "PASSWORD_CHANGE", targetType: "User", targetId: String(user._id), meta: {}, actor: user._id });

  try {
    const { subject, text, html } = passwordChangedTemplate();
    const { error } = await resend.emails.send({ from: `Tees From The Past <${FROM}>`, to: user.email, subject, text, html });
    if (error) throw error;
  } catch (e) { 
    logger.error({ error: e.message, userId: user._id }, "Password change confirmation email failed");
  }

  res.json({ message: "Password changed" });
});

/** POST /api/auth/refresh */
export const refreshSession = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token required" });
  }
  
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  
  // Find the refresh token
  const rt = await RefreshToken.findOne({ tokenHash, isRevoked: false });
  if (!rt || rt.expiresAt < new Date()) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
  
  // Check for token reuse (compromised token detection)
  if (rt.usedAt) {
    // Token has been used before - this indicates potential compromise
    // Revoke all tokens in this rotation family
    await RefreshToken.updateMany(
      { rotationId: rt.rotationId },
      { isRevoked: true, revokedAt: new Date() }
    );
    
    await logAudit(req, { 
      action: "REFRESH_TOKEN_REUSE_DETECTED", 
      targetType: "User", 
      targetId: String(rt.user), 
      meta: { rotationId: rt.rotationId, ip: req.client?.ip }, 
      actor: rt.user 
    });
    
    return res.status(401).json({ message: "Token reuse detected. All sessions revoked." });
  }
  
  // Mark this token as used
  rt.usedAt = new Date();
  rt.isRevoked = true;
  await rt.save();
  
  // Create new access token
  const user = await User.findById(rt.user).select("-password");
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }
  
  const token = signAccessToken(user);
  
  // Create new refresh token (rotation)
  const newJti = crypto.randomUUID();
  const newRefreshToken = crypto.randomBytes(32).toString('hex');
  const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  
  await RefreshToken.create({
    jti: newJti,
    user: user._id,
    ip: rt.ip,
    userAgent: rt.userAgent,
    client: rt.client,
    tokenHash: newTokenHash,
    rotationId: rt.rotationId, // keep same rotation family
    expiresAt: sessionExpiry(7), // 7 days sliding window
    lastSeenAt: new Date()
  });

  res.json({ 
    token, 
    refreshToken: newRefreshToken,
    sessionJti: newJti 
  });
});
