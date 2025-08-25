import asyncHandler from "express-async-handler";
import crypto from "crypto";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import { Resend } from "resend";
import User from "../models/User.js";
import RefreshTokenModel from "../models/RefreshToken.js";
import { signAccessToken } from "../middleware/authMiddleware.js";
import { logAuthLogin, logAuthLogout, logAudit } from "../utils/audit.js";
import { trackFailedAction } from "../utils/adaptiveRateLimit.js";
import { passwordResetTemplate, passwordChangedTemplate } from "../utils/emailTemplates.js";
import { queueSendVerificationEmail } from "./emailVerificationController.js";
import { blacklistRefreshToken, isRefreshTokenBlacklisted, storeRefreshTokenMetadata, removeRefreshTokenMetadata } from "../redis/index.js";
import { getConfig } from "../config/index.js";

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
    
    // Track failed login for abuse detection
    await trackFailedAction(req, 'login_failure', { email, ip });
    
    res.status(401);
    throw new Error("Invalid email or password");
  }

  await clearAuthFails({ ip, email });

  const token = signAccessToken(user._id);
  const jti = crypto.randomUUID();
  const { userAgent, hints } = clientNet(req);
  await RefreshToken.create({ jti, user: user._id, ip, userAgent, client: hints, expiresAt: sessionExpiry(30), lastSeenAt: new Date() });

  await logAuthLogin(req, user, { email, sessionId: jti });

  res.json({ token, sessionJti: jti, user: {
    _id: user._id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName,
    isAdmin: !!user.isAdmin, emailVerifiedAt: user.emailVerifiedAt || null,
  }});
});

/** POST /api/auth/logout */
/** POST /api/auth/logout - Enhanced with token blacklisting */
export const logoutUser = asyncHandler(async (req, res) => {
  const user = req.user || null;
  const sessionId = req.headers["x-session-id"] || "";
  await logAuthLogout(req, user, { sessionId });

  if (user?._id && sessionId) {
    // Find the refresh token to get its expiry for blacklist TTL
    const rt = await RefreshToken.findOne({ jti: sessionId, user: user._id, revokedAt: null }).exec();
    if (rt) {
      // Blacklist the refresh token in Redis
      const ttlSeconds = Math.floor((rt.expiresAt - new Date()) / 1000);
      await blacklistRefreshToken(sessionId, Math.max(ttlSeconds, 3600)); // At least 1 hour

      // Revoke in database
      rt.revokedAt = new Date();
      await rt.save();

      // Remove metadata from Redis
      await removeRefreshTokenMetadata(sessionId);
    }
  }
  
  res.json({ 
    message: "Logged out",
    sessionRevoked: !!sessionId
  });
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
  } catch (e) { console.error("[password-reset] email send failed:", e); }

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
  } catch (e) { console.error("[change-password] confirmation email failed:", e); }

  res.json({ message: "Password changed" });
});

/** POST /api/auth/refresh - Enhanced with rotation and blacklisting */
export const refreshSession = asyncHandler(async (req, res) => {
  const config = getConfig();
  const oldSessionId = req.headers["x-session-id"];
  
  if (!oldSessionId) {
    return res.status(400).json({ 
      message: "Session ID required for refresh",
      code: "SESSION_ID_REQUIRED" 
    });
  }

  // Check if old refresh token is blacklisted
  const isBlacklisted = await isRefreshTokenBlacklisted(oldSessionId);
  if (isBlacklisted) {
    return res.status(401).json({ 
      message: "Invalid refresh token",
      code: "INVALID_REFRESH_TOKEN" 
    });
  }

  // Find the refresh token in database
  const oldRefreshToken = await RefreshToken.findOne({ 
    jti: oldSessionId, 
    user: req.user._id, 
    revokedAt: null 
  }).exec();

  if (!oldRefreshToken) {
    return res.status(401).json({ 
      message: "Invalid refresh token",
      code: "INVALID_REFRESH_TOKEN" 
    });
  }

  // Check if refresh token is expired
  if (oldRefreshToken.expiresAt < new Date()) {
    return res.status(401).json({ 
      message: "Refresh token expired",
      code: "REFRESH_TOKEN_EXPIRED" 
    });
  }

  // Generate new tokens
  const newJti = crypto.randomUUID();
  const { userAgent, hints } = clientNet(req);
  const refreshTtlDays = parseInt(config.JWT_REFRESH_TTL.replace(/[^\d]/g, '')) || 30;

  // Create new access token with JTI
  const accessToken = signAccessToken(req.user);

  // Create new refresh token
  const newRefreshToken = await RefreshToken.create({
    jti: newJti,
    user: req.user._id,
    ip: req.client?.ip || "",
    userAgent,
    client: hints,
    expiresAt: sessionExpiry(refreshTtlDays),
    lastSeenAt: new Date()
  });

  // Blacklist the old refresh token in Redis (rotation)
  const ttlSeconds = Math.floor((oldRefreshToken.expiresAt - new Date()) / 1000);
  await blacklistRefreshToken(oldSessionId, Math.max(ttlSeconds, 86400));

  // Store new refresh token metadata in Redis
  await storeRefreshTokenMetadata(newJti, req.user._id.toString(), {
    ip: req.client?.ip,
    userAgent
  }, refreshTtlDays * 86400);

  // Revoke old refresh token in database
  oldRefreshToken.revokedAt = new Date();
  await oldRefreshToken.save();

  // Remove old metadata from Redis
  await removeRefreshTokenMetadata(oldSessionId);

  res.json({ 
    token: accessToken,
    sessionJti: newJti,
    refreshedAt: new Date().toISOString()
  });
});

// ============================================================================
// 2FA SCAFFOLD ENDPOINTS (Task 6)
// ============================================================================

/** POST /api/auth/2fa/setup - 2FA Setup Scaffold (STUB) */
export const setup2FA = asyncHandler(async (req, res) => {
  const config = getConfig();
  
  if (!config.ENABLE_2FA) {
    return res.status(501).json({
      message: "2FA is not enabled on this server",
      code: "2FA_DISABLED"
    });
  }

  // TODO: Task 6 - Implement full TOTP secret generation and QR code
  // TODO: - Generate TOTP secret using crypto.randomBytes(20)
  // TODO: - Create QR code URL with app name and user email
  // TODO: - Store secret temporarily (pending verification) in user model
  // TODO: - Return QR code data URL and backup codes

  return res.status(501).json({
    message: "2FA setup not fully implemented yet",
    code: "NOT_IMPLEMENTED",
    todo: [
      "Generate TOTP secret",
      "Create QR code for authenticator app",
      "Implement backup codes generation",
      "Add 2FA fields to User model"
    ],
    mockData: {
      qrCodeUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      secret: "MOCK_SECRET_FOR_DEVELOPMENT",
      backupCodes: ["123456", "789012", "345678"]
    }
  });
});

/** POST /api/auth/2fa/verify - 2FA Verification Scaffold (STUB) */
export const verify2FA = asyncHandler(async (req, res) => {
  const config = getConfig();
  
  if (!config.ENABLE_2FA) {
    return res.status(501).json({
      message: "2FA is not enabled on this server", 
      code: "2FA_DISABLED"
    });
  }

  const { code, backupCode } = req.body;

  if (!code && !backupCode) {
    return res.status(400).json({
      message: "Either TOTP code or backup code is required",
      code: "CODE_REQUIRED"
    });
  }

  // TODO: Task 6 - Implement full TOTP verification
  // TODO: - Validate TOTP code using time-based algorithm
  // TODO: - Handle backup code verification and consumption
  // TODO: - Update user model to mark 2FA as enabled
  // TODO: - Invalidate pending setup state

  return res.status(501).json({
    message: "2FA verification not fully implemented yet",
    code: "NOT_IMPLEMENTED", 
    todo: [
      "Implement TOTP validation algorithm",
      "Add backup code verification logic",
      "Update User model with 2FA status",
      "Add 2FA requirement to sensitive operations"
    ],
    mockVerification: {
      valid: code === "123456" || backupCode === "123456",
      codeUsed: code || backupCode
    }
  });
});

/** POST /api/auth/2fa/disable - 2FA Disable Scaffold (STUB) */
export const disable2FA = asyncHandler(async (req, res) => {
  const config = getConfig();
  
  if (!config.ENABLE_2FA) {
    return res.status(501).json({
      message: "2FA is not enabled on this server",
      code: "2FA_DISABLED"
    });
  }

  // TODO: Task 6 - Implement 2FA disable functionality
  // TODO: - Require current password or 2FA code for security
  // TODO: - Clear 2FA secrets and backup codes from user
  // TODO: - Log security event for audit
  // TODO: - Optionally revoke all sessions for security

  return res.status(501).json({
    message: "2FA disable not fully implemented yet",
    code: "NOT_IMPLEMENTED",
    todo: [
      "Add password/2FA verification requirement",
      "Clear 2FA data from user model",
      "Implement audit logging",
      "Consider session revocation for security"
    ]
  });
});

// TODO: Task 6 - Additional 2FA features to implement later:
// TODO: - 2FA recovery via email verification
// TODO: - Multiple authenticator device support  
// TODO: - 2FA requirement policies (admin-configurable)
// TODO: - 2FA bypass tokens for emergency access
// TODO: - Integration with hardware security keys (WebAuthn)
