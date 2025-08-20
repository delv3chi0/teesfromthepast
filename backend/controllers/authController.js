// backend/controllers/authController.js
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { signAccessToken } from '../middleware/authMiddleware.js';

const ACCESS_TOKEN_TTL_HOURS = 4;
const REFRESH_TTL_DAYS = 30;

// helpers
function nowPlusDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
}
function ua(req) {
  return req.headers['user-agent'] || '';
}

// @desc Register
// @route POST /api/auth/register
export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;
  if (!username || !email || !password) { res.status(400); throw new Error('Missing fields'); }

  const existing = await User.findOne({ email });
  if (existing) { res.status(400); throw new Error('User already exists'); }

  const user = await User.create({ username, email, password, firstName, lastName });
  const token = signAccessToken(user._id);

  // record a device session
  const jti = crypto.randomUUID();
  await RefreshToken.create({
    jti,
    user: user._id,
    ip: clientIp(req),
    userAgent: ua(req),
    expiresAt: nowPlusDays(REFRESH_TTL_DAYS),
  });

  res.status(201).json({
    _id: user._id,
    username: user.username,
    email: user.email,
    isAdmin: !!user.isAdmin,
    token,
  });
});

// @desc Login
// @route POST /api/auth/login
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401); throw new Error('Invalid email or password');
  }

  const token = signAccessToken(user._id);

  // record a device session
  const jti = crypto.randomUUID();
  await RefreshToken.create({
    jti,
    user: user._id,
    ip: clientIp(req),
    userAgent: ua(req),
    expiresAt: nowPlusDays(REFRESH_TTL_DAYS),
  });

  res.json({
    _id: user._id,
    username: user.username,
    email: user.email,
    isAdmin: !!user.isAdmin,
    token,
  });
});

// @desc Logout (best-effort revoke most recent active session for this UA)
// @route POST /api/auth/logout
export const logoutUser = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (userId) {
    const item = await RefreshToken.findOne({
      user: userId,
      revokedAt: { $exists: false },
    }).sort({ createdAt: -1 });
    if (item) {
      item.revokedAt = new Date();
      await item.save();
    }
  }
  res.json({ message: 'Logged out' });
});

// @desc Profile (GET)
// @route GET /api/auth/profile
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password').lean();
  res.json(user);
});

// @desc Update profile (PUT)
// @route PUT /api/auth/profile
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) { res.status(404); throw new Error('User not found'); }

  user.username = req.body.username ?? user.username;
  user.email = req.body.email ?? user.email;
  user.firstName = req.body.firstName ?? user.firstName;
  user.lastName = req.body.lastName ?? user.lastName;

  const updated = await user.save();
  const toSend = updated.toObject(); delete toSend.password;
  res.json(toSend);
});

// --- Password flows (stubs to match your routes) ---
export const requestPasswordReset = asyncHandler(async (_req, res) => {
  res.json({ message: 'If this were wired, we would email a reset link.' });
});
export const resetPassword = asyncHandler(async (_req, res) => {
  res.json({ message: 'Password reset complete (stub).' });
});
export const changePassword = asyncHandler(async (_req, res) => {
  res.json({ message: 'Password changed (stub).' });
});

// @desc Issue a new access token (keeps header-based flow); rotates session row
// @route POST /api/auth/refresh (protected)
export const refreshSession = asyncHandler(async (req, res) => {
  // rotate device session to show "activity" in Devices
  const last = await RefreshToken.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  const jti = crypto.randomUUID();
  await RefreshToken.create({
    jti,
    user: req.user._id,
    ip: clientIp(req),
    userAgent: ua(req),
    replaceOf: last?.jti,
    expiresAt: nowPlusDays(REFRESH_TTL_DAYS),
  });

  const token = signAccessToken(req.user._id);
  res.json({ token, expiresInHours: ACCESS_TOKEN_TTL_HOURS });
});
