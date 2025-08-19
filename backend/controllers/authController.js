// backend/controllers/authController.js
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sgMail from '@sendgrid/mail';
import User from '../models/User.js';
import 'dotenv/config';
import { validationResult } from 'express-validator';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.error('[Auth Cfg] WARNING: SENDGRID_API_KEY env var is not set! Email sending will fail.');
}

const generateToken = (id) => {
  return jwt.sign({ user: { id } }, process.env.JWT_SECRET, {
    expiresIn: '4h', // 4 hours
  });
};

export const registerUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); }

  const { username, email, password, firstName, lastName } = req.body;
  const userExistsByEmail = await User.findOne({ email: email.toLowerCase() });
  if (userExistsByEmail) { return res.status(400).json({ message: 'User with this email already exists' }); }
  const userExistsByUsername = await User.findOne({ username });
  if (userExistsByUsername) { return res.status(400).json({ message: 'Username already taken' }); }

  const user = await User.create({ username, email: email.toLowerCase(), password, firstName: firstName || '', lastName: lastName || '' });
  if (!user) return res.status(400).json({ message: 'Invalid user data during registration' });

  const token = generateToken(user._id);
  return res.status(201).json({
    _id: user._id, username: user.username, email: user.email,
    firstName: user.firstName, lastName: user.lastName,
    isAdmin: user.isAdmin, token
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); }

  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) return res.status(401).json({ message: 'Invalid email or password' });

  const ok = await user.matchPassword(password);
  if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

  const token = generateToken(user._id);
  return res.json({
    _id: user._id, username: user.username, email: user.email,
    firstName: user.firstName, lastName: user.lastName,
    isAdmin: user.isAdmin, shippingAddress: user.shippingAddress, billingAddress: user.billingAddress,
    token
  });
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found for profile' });
  return res.json({
    _id: user._id, username: user.username, email: user.email,
    firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin,
    shippingAddress: user.shippingAddress, billingAddress: user.billingAddress,
    lastContestSubmissionMonth: user.lastContestSubmissionMonth, monthlyVoteRecord: user.monthlyVoteRecord
  });
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found for profile update' });

  user.username = req.body.username || user.username;
  if (req.body.email && req.body.email.toLowerCase() !== user.email) {
    const exist = await User.findOne({ email: req.body.email.toLowerCase() });
    if (exist && exist._id.toString() !== user._id.toString()) {
      return res.status(400).json({ message: 'Email already in use.' });
    }
    user.email = req.body.email.toLowerCase();
  }
  user.firstName = req.body.firstName !== undefined ? req.body.firstName : user.firstName;
  user.lastName = req.body.lastName !== undefined ? req.body.lastName : user.lastName;

  const updateAddress = (currentAddressDoc, newAddressData) => {
    if (!newAddressData && newAddressData !== null) return currentAddressDoc;
    if (newAddressData === null) return undefined;
    const addressToUpdate = currentAddressDoc || {};
    Object.keys(newAddressData).forEach(key => { if (newAddressData[key] !== undefined) addressToUpdate[key] = newAddressData[key]; });
    return addressToUpdate;
  };
  if (req.body.shippingAddress !== undefined) user.shippingAddress = updateAddress(user.shippingAddress, req.body.shippingAddress);
  if (req.body.billingAddress !== undefined) user.billingAddress = updateAddress(user.billingAddress, req.body.billingAddress);

  const updatedUser = await user.save();
  return res.json({
    _id: updatedUser._id, username: updatedUser.username, email: updatedUser.email,
    firstName: updatedUser.firstName, lastName: updatedUser.lastName, isAdmin: updatedUser.isAdmin,
    shippingAddress: updatedUser.shippingAddress, billingAddress: updatedUser.billingAddress
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); }

  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+password');
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) return res.status(401).json({ message: 'Incorrect current password.' });

  user.password = newPassword;
  await user.save();
  return res.status(200).json({ message: 'Password changed successfully.' });
});

export const logoutUser = asyncHandler(async (_req, res) => {
  // JWT is client-held; just respond OK
  return res.status(200).json({ message: 'Logged out successfully' });
});

export const requestPasswordReset = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); }

  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link shortly.' });
  }
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 3600000;

  try {
    await user.save({ validateBeforeSave: false });
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL || !process.env.FRONTEND_URL) {
      throw new Error("Server configuration error for sending email.");
    }
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const msg = {
      to: user.email,
      from: { email: process.env.SENDGRID_FROM_EMAIL, name: 'TeesFromThePast Support' },
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
    };
    await sgMail.send(msg);
    return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link shortly.' });
  } catch (error) {
    console.error('[Auth Ctrl] Error during SendGrid password reset:', error);
    user.passwordResetToken = undefined; user.passwordResetExpires = undefined;
    try { await user.save({ validateBeforeSave: false }); } catch (saveError) { console.error(`[Auth Ctrl] Failed to clear token for ${user.email}:`, saveError); }
    return res.status(500).json({ message: 'There was an issue processing your request. Please try again later.' });
  }
});

export const resetPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); }

  const { token, password } = req.body;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } }).select('+passwordResetToken +passwordResetExpires');
  if (!user) return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  return res.status(200).json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
});
