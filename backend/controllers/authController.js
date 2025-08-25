import asyncHandler from "express-async-handler";
import crypto from "crypto";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import { Resend } from "resend";
import User from "../models/User.js";
import RefreshTokenModel from "../models/RefreshToken.js";
import { signAccessToken } from "../middleware/authMiddleware.js";
import { generateAccessToken, rotateRefreshToken, hashRefreshToken, isWithinRefreshWindow } from "../services/tokenService.js";
import { trackFailedAttempt } from "../middleware/abuseLimiter.js";
import logger from "../utils/logger.js";
import { logAuthLogin, logAuthLogout, logAudit } from "../utils/audit.js";
import { passwordResetTemplate, passwordChangedTemplate } from "../utils/emailTemplates.js";
import { queueSendVerificationEmail } from "./emailVerificationController.js";

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
function sessionExpiry(days = 7) { return new Date(Date.now() + days * 86400000); } // Changed to 7 days for rotation window
async function revokeAllUserSessions(userId) {
  try { 
    await RefreshToken.updateMany(
      { user: userId, revokedAt: null }, 
      { $set: { revokedAt: new Date() } }
    ).exec(); 
  }
  catch (e) { 
    logger.error("Failed to revoke all user sessions", { error: e.message, userId });
  }
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
    // Track failed attempt for rate limiting
    if (req.rateLimitBuckets) {
      trackFailedAttempt(req);
    }
    res.status(401);
    throw new Error("Invalid email or password");
  }

  await clearAuthFails({ ip, email });

  // Generate new access token using token service
  const token = generateAccessToken(user);
  
  // Create refresh token with rotation tracking
  const { jti, hashedToken, rotatedAt } = rotateRefreshToken();
  const { userAgent, hints } = clientNet(req);
  
  await RefreshToken.create({ 
    jti, 
    user: user._id, 
    ip, 
    userAgent, 
    client: hints, 
    expiresAt: sessionExpiry(7), // 7-day window for refresh token
    lastSeenAt: new Date(),
    refreshTokenHash: hashedToken,
    rotatedAt
  });

  // Set secure HTTP-only cookies for session management
  const isSecure = req.secure || req.get('x-forwarded-proto') === 'https';
  const cookieOptions = {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'strict' : 'lax', // Strict for HTTPS, Lax for HTTP (fallback)
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  res.cookie('sessionId', jti, cookieOptions);

  await logAuthLogin(req, user, { email, sessionId: jti });

  logger.info('User logged in successfully', {
    userId: user._id.toString(),
    email,
    sessionId: jti,
    ip
  });

  res.json({ token, sessionJti: jti, user: {
    _id: user._id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName,
    isAdmin: !!user.isAdmin, emailVerifiedAt: user.emailVerifiedAt || null,
  }});
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

/** POST /api/auth/refresh */
export const refreshSession = asyncHandler(async (req, res) => {
  const sessionId = req.headers["x-session-id"] || req.cookies?.sessionId;
  
  if (!sessionId) {
    res.status(401);
    throw new Error("Session ID required for refresh");
  }

  // Find the current refresh token
  const currentToken = await RefreshToken.findOne({ 
    jti: sessionId, 
    user: req.user._id, 
    revokedAt: null,
    compromisedAt: null
  }).exec();

  if (!currentToken) {
    logger.warn('Refresh token not found or revoked', {
      sessionId,
      userId: req.user._id.toString()
    });
    res.status(401);
    throw new Error("Invalid or expired session");
  }

  // Check if token is within valid refresh window (7 days)
  if (!isWithinRefreshWindow(currentToken.createdAt, 7)) {
    // Revoke expired token
    currentToken.revokedAt = new Date();
    await currentToken.save();
    
    logger.info('Refresh token expired beyond window', {
      sessionId,
      userId: req.user._id.toString(),
      tokenAge: Date.now() - currentToken.createdAt.getTime()
    });
    
    res.status(401);
    throw new Error("Session expired, please log in again");
  }

  // Check for reuse detection (if this token was already rotated)
  if (currentToken.refreshTokenHash) {
    const reusedToken = await RefreshToken.findOne({
      rotatedFrom: sessionId,
      user: req.user._id
    }).exec();
    
    if (reusedToken) {
      // Token reuse detected - mark current session as compromised and revoke all user sessions
      currentToken.compromisedAt = new Date();
      currentToken.revokedAt = new Date();
      await currentToken.save();
      
      await revokeAllUserSessions(req.user._id);
      
      logger.error('Refresh token reuse detected - revoking all sessions', {
        sessionId,
        userId: req.user._id.toString(),
        reuseAttempt: true
      });
      
      res.status(401);
      throw new Error("Session security violation detected");
    }
  }

  // Generate new access token
  const accessToken = generateAccessToken(req.user);
  
  // Rotate the refresh token
  const { jti: newJti, hashedToken, rotatedAt } = rotateRefreshToken(currentToken);
  const { ip, userAgent, hints } = clientNet(req);

  // Create new refresh token
  await RefreshToken.create({
    jti: newJti,
    user: req.user._id,
    ip,
    userAgent,
    client: hints,
    expiresAt: sessionExpiry(7),
    lastSeenAt: new Date(),
    refreshTokenHash: hashedToken,
    rotatedAt,
    rotatedFrom: sessionId
  });

  // Revoke the old refresh token
  currentToken.revokedAt = new Date();
  await currentToken.save();

  // Set new session cookie
  const isSecure = req.secure || req.get('x-forwarded-proto') === 'https';
  const cookieOptions = {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  res.cookie('sessionId', newJti, cookieOptions);

  logger.info('Session refreshed with token rotation', {
    userId: req.user._id.toString(),
    oldSessionId: sessionId,
    newSessionId: newJti
  });

  res.json({ 
    token: accessToken,
    sessionJti: newJti
  });
});
