// backend/controllers/authController.js
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { signAccessToken } from '../middleware/authMiddleware.js';
import { logAdminAction } from '../utils/audit.js';

const ACCESS_HOURS = 4;
const REFRESH_DAYS = 30;

function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    undefined
  );
}

// --- POST /api/auth/register ---
export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;
  if (!username || !email || !password) {
    res.status(400); throw new Error('Missing required fields');
  }
  const exists = await User.findOne({ email });
  if (exists) {
    res.status(400); throw new Error('User already exists');
  }
  const user = await User.create({ username, email, password, firstName, lastName });
  const token = signAccessToken(user._id);

  // create a device/session row
  const jti = crypto.randomUUID();
  await RefreshToken.create({
    jti,
    user: user._id,
    ip: getIp(req),
    userAgent: req.headers['user-agent'],
    expiresAt: new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000),
  });

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

// --- POST /api/auth/login ---
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400); throw new Error('Email and password are required');
  }
  const user = await User.findOne({ email }).select('+password');
  if (!user) { res.status(401); throw new Error('Invalid credentials'); }

  // If your User model has matchPassword, use that. Otherwise bcrypt compare:
  const ok = user.matchPassword
    ? await user.matchPassword(password)
    : await bcrypt.compare(password, user.password);

  if (!ok) { res.status(401); throw new Error('Invalid credentials'); }

  const token = signAccessToken(user._id);

  // Record a device/session row (used by Admin / Devices)
  const jti = crypto.randomUUID();
  await RefreshToken.create({
    jti,
    user: user._id,
    ip: getIp(req),
    userAgent: req.headers['user-agent'],
    expiresAt: new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000),
  });

  // (Optional) record an audit line for logins
  await logAdminAction(req, {
    action: 'LOGIN',
    targetType: 'User',
    targetId: user._id,
    meta: {},
  });

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

// --- POST /api/auth/logout ---
export const logoutUser = asyncHandler(async (req, res) => {
  // Stateless access tokens mean we can't “invalidate” easily.
  // Do a best-effort: mark all non-revoked refresh rows as revoked for this user.
  if (req.user?._id) {
    await RefreshToken.updateMany(
      { user: req.user._id, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );
    await logAdminAction(req, {
      action: 'LOGOUT',
      targetType: 'User',
      targetId: req.user._id,
      meta: {},
    });
  }
  res.json({ message: 'Logged out' });
});

// --- GET /api/auth/profile ---
export const getUserProfile = asyncHandler(async (req, res) => {
  // req.user is set by protect
  res.json({
    _id: req.user._id,
    username: req.user.username,
    email: req.user.email,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    isAdmin: !!req.user.isAdmin,
    shippingAddress: req.user.shippingAddress,
    billingAddress: req.user.billingAddress,
  });
});

// --- PUT /api/auth/profile ---
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) { res.status(404); throw new Error('User not found'); }

  user.username = req.body.username ?? user.username;
  user.email = req.body.email ?? user.email;
  user.firstName = req.body.firstName ?? user.firstName;
  user.lastName = req.body.lastName ?? user.lastName;

  if (req.body.shippingAddress) user.shippingAddress = req.body.shippingAddress;
  if (req.body.billingAddress)  user.billingAddress  = req.body.billingAddress;

  if (req.body.password) user.password = req.body.password;

  const saved = await user.save();

  res.json({
    _id: saved._id,
    username: saved.username,
    email: saved.email,
    firstName: saved.firstName,
    lastName: saved.lastName,
    isAdmin: !!saved.isAdmin,
    shippingAddress: saved.shippingAddress,
    billingAddress: saved.billingAddress,
  });
});

// --- Optional stubs (password reset/refresh). Keep API stable. ---
export const requestPasswordReset = asyncHandler(async (_req, res) => {
  res.status(202).json({ message: 'If implemented, an email would be sent.' });
});

export const resetPassword = asyncHandler(async (_req, res) => {
  res.status(200).json({ message: 'Password reset handled.' });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) { res.status(400); throw new Error('Missing fields'); }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) { res.status(404); throw new Error('User not found'); }

  const ok = user.matchPassword
    ? await user.matchPassword(currentPassword)
    : await bcrypt.compare(currentPassword, user.password);

  if (!ok) { res.status(401); throw new Error('Current password incorrect'); }

  user.password = newPassword;
  await user.save();

  res.json({ message: 'Password changed' });
});

export const refreshSession = asyncHandler(async (_req, res) => {
  // You are not using refresh-token issuance in the FE; keep a simple success.
  res.json({ ok: true });
});
