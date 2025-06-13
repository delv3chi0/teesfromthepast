// backend/controllers/authController.js
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
// import sgMail from '@sendgrid/mail'; // Original line - REMOVED
import { createRequire } from 'module'; // NEW: Import createRequire
const require = createRequire(import.meta.url); // NEW: Create a require function for this module
const sgMail = require('@sendgrid/mail'); // NEW: Use require for sendgrid/mail

import User from '../models/User.js';
import 'dotenv/config';

import { validationResult } from 'express-validator';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.error('[Auth Cfg] WARNING: SENDGRID_API_KEY environment variable is not set! Email sending will fail.');
}

const generateToken = (id) => {
  return jwt.sign({ user: { id } }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
};

export const registerUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); }

  const { username, email, password, firstName, lastName } = req.body;
  const userExistsByEmail = await User.findOne({ email: email.toLowerCase() });
  if (userExistsByEmail) { res.status(400); throw new Error('User with this email already exists'); }
  const userExistsByUsername = await User.findOne({ username });
  if (userExistsByUsername) { res.status(400); throw new Error('Username already taken'); }

  const user = await User.create({ username, email: email.toLowerCase(), password, firstName: firstName || '', lastName: lastName || '' });
  if (user) {
    const token = generateToken(user._id);
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 3600 * 1000 });
    res.status(201).json({ _id: user._id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin, token: token });
  } else {
    res.status(400); throw new Error('Invalid user data during registration');
  }
});

export const loginUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); }

  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (user && (await user.matchPassword(password))) {
    const token = generateToken(user._id);
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 3600 * 1000 });
    res.json({ _id: user._id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin, shippingAddress: user.shippingAddress, billingAddress: user.billingAddress, token: token });
  } else {
    res.status(401); throw new Error('Invalid email or password');
  }
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (user) {
    res.json({ _id: user._id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin, shippingAddress: user.shippingAddress, billingAddress: user.billingAddress, lastContestSubmissionMonth: user.lastContestSubmissionMonth, monthlyVoteRecord: user.monthlyVoteRecord });
  } else {
    res.status(404); throw new Error('User not found for profile');
  }
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); }

  const user = await User.findById(req.user.id);
  if (user) {
    user.username = req.body.username || user.username;
    if (req.body.email && req.body.email.toLowerCase() !== user.email) {
        const existingUser = await User.findOne({ email: req.body.email.toLowerCase() });
        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
            res.status(400); throw new Error('Email already in use.');
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
    res.json({ _id: updatedUser._id, username: updatedUser.username, email: updatedUser.email, firstName: updatedUser.firstName, lastName: updatedUser.lastName, isAdmin: updatedUser.isAdmin, shippingAddress: updatedUser.shippingAddress, billingAddress: updatedUser.billingAddress });
  } else {
    res.status(404); throw new Error('User not found for profile update');
  }
});

export const changePassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); }

  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+password');
  if (!user) { res.status(404); throw new Error('User not found.'); }
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) { res.status(401); throw new Error('Incorrect current password.'); }
  user.password = newPassword;
  await user.save();
  res.status(200).json({ message: 'Password changed successfully.' });
});

export const logoutUser = asyncHandler(async (req, res) => {
  res.cookie('token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', expires: new Date(0) });
  res.status(200).json({ message: 'Logged out successfully' });
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
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL || !process.env.FRONTEND_URL) { throw new Error("Server configuration error for sending email."); }
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const messageBody = `<p>You are receiving this email because you (or someone else) have requested the reset of the password for your account.</p><p>Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`;
    const msg = { to: user.email, from: { email: process.env.SENDGRID_FROM_EMAIL, name: 'TeesFromThePast Support' }, subject: 'Password Reset Request', html: messageBody };
    await sgMail.send(msg);
    res.status(200).json({ message: 'If your email is registered, you will receive a password reset link shortly.' });
  } catch (error) {
    console.error('[Auth Ctrl] Error during SendGrid password reset process:', error);
    user.passwordResetToken = undefined; user.passwordResetExpires = undefined;
    try { await user.save({ validateBeforeSave: false }); }
    catch (saveError) { console.error(`[Auth Ctrl] CRITICAL: Failed to clear token for ${user.email}:`, saveError); }
    res.status(500).json({ message: 'There was an issue processing your request. Please try again later.' });
  }
});

export const resetPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); }
  
  const { token, password } = req.body;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } }).select('+passwordResetToken +passwordResetExpires');
  if (!user) { res.status(400); throw new Error('Password reset token is invalid or has expired.'); }
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  res.status(200).json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
});
