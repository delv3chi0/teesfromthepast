// backend/controllers/authController.js
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sgMail from '@sendgrid/mail';
import User from '../models/User.js';
import 'dotenv/config';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('[Auth Cfg] SendGrid API Key configured.');
} else {
  console.error('[Auth Cfg] CRITICAL: SENDGRID_API_KEY environment variable is not set!');
}

const generateToken = (id) => {
  return jwt.sign({ user: { id } }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// --- REGISTER USER ---
export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;
  console.log('[Auth Ctrl] Registering user:', { username, email, firstName, lastName });
  const userExistsByEmail = await User.findOne({ email: email.toLowerCase() });
  if (userExistsByEmail) {
    res.status(400); throw new Error('User with this email already exists');
  }
  const userExistsByUsername = await User.findOne({ username });
  if (userExistsByUsername) {
    res.status(400); throw new Error('Username already taken');
  }
  const user = await User.create({
    username, email: email.toLowerCase(), password,
    firstName: firstName || '', lastName: lastName || '',
  });
  if (user) {
    const token = generateToken(user._id);
    res.cookie('token', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 3600 * 1000,
    });
    console.log('[Auth Ctrl] User registered successfully:', user.username);
    res.status(201).json({
      _id: user._id, username: user.username, email: user.email,
      firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin, token: token,
    });
  } else {
    res.status(400); throw new Error('Invalid user data during registration');
  }
});

// --- LOGIN USER ---
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  console.log('[Auth Ctrl] Attempting login for email:', email);
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (user && (await user.matchPassword(password))) {
    const token = generateToken(user._id);
    res.cookie('token', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 3600 * 1000,
    });
    console.log('[Auth Ctrl] User logged in successfully:', user.username);
    res.json({
      _id: user._id, username: user.username, email: user.email,
      firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin,
      shippingAddress: user.shippingAddress, billingAddress: user.billingAddress, token: token,
    });
  } else {
    console.warn('[Auth Ctrl] Login failed for email:', email);
    res.status(401); throw new Error('Invalid email or password');
  }
});

// --- GET USER PROFILE ---
export const getUserProfile = asyncHandler(async (req, res) => {
  console.log('[Auth Ctrl] Fetching profile for user ID:', req.user.id);
  const user = await User.findById(req.user.id).select('-password');
  if (user) {
    res.json({
      _id: user._id, username: user.username, email: user.email,
      firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin,
      shippingAddress: user.shippingAddress, billingAddress: user.billingAddress,
      lastContestSubmissionMonth: user.lastContestSubmissionMonth, monthlyVoteRecord: user.monthlyVoteRecord,
    });
  } else {
    res.status(404); throw new Error('User not found for profile');
  }
});

// --- UPDATE USER PROFILE ---
export const updateUserProfile = asyncHandler(async (req, res) => {
  console.log('[Auth Ctrl] Updating profile for user ID:', req.user.id);
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
    if (req.body.password && req.body.password.length > 0) {
      console.log('[Auth Ctrl] User password being updated during profile update.');
      user.password = req.body.password;
    }
    const updateAddress = (currentAddressDoc, newAddressData) => {
      if (!newAddressData && newAddressData !== null) return currentAddressDoc;
      if (newAddressData === null) return undefined;
      const addressToUpdate = currentAddressDoc || {};
      Object.keys(newAddressData).forEach(key => {
        if (newAddressData[key] !== undefined) addressToUpdate[key] = newAddressData[key];
      });
      return addressToUpdate;
    };
    if (req.body.shippingAddress !== undefined) user.shippingAddress = updateAddress(user.shippingAddress, req.body.shippingAddress);
    if (req.body.billingAddress !== undefined) user.billingAddress = updateAddress(user.billingAddress, req.body.billingAddress);
    const updatedUser = await user.save();
    console.log('[Auth Ctrl] Profile updated successfully for:', updatedUser.username);
    res.json({
      _id: updatedUser._id, username: updatedUser.username, email: updatedUser.email,
      firstName: updatedUser.firstName, lastName: updatedUser.lastName, isAdmin: updatedUser.isAdmin,
      shippingAddress: updatedUser.shippingAddress, billingAddress: updatedUser.billingAddress,
    });
  } else {
    res.status(404); throw new Error('User not found for profile update');
  }
});

// --- LOGOUT USER ---
export const logoutUser = asyncHandler(async (req, res) => {
  console.log('[Auth Ctrl] Logging out user.');
  res.cookie('token', '', {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

// --- REQUEST PASSWORD RESET ---
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  console.log(`[Auth Ctrl] Password reset requested for email: ${email}`);
  if (!email) {
    res.status(400); throw new Error('Please provide an email address');
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.log(`[Auth Ctrl] Password reset: Email not found: ${email}. Sending generic response.`);
    return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link shortly.' });
  }
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 3600000; // 1 hour
  try {
    await user.save({ validateBeforeSave: false });
    console.log(`[Auth Ctrl] Saved password reset token for user: ${user.email}`);
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL || !process.env.FRONTEND_URL) {
        console.error("[Auth Ctrl] CRITICAL: Email sending environment variables are not fully configured.");
        throw new Error("Server configuration error for sending email.");
    }
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log(`[Auth Ctrl] Generated Reset URL: ${resetUrl}`);
    const messageBody = `... your HTML email body from previous step ...`; // Keep your existing messageBody
    const msg = {
      to: user.email,
      from: { email: process.env.SENDGRID_FROM_EMAIL, name: 'TeesFromThePast Support' },
      subject: 'Password Reset Request - TeesFromThePast', html: messageBody,
    };
    console.log(`[Auth Ctrl] Attempting to send password reset email to: ${user.email} from: ${process.env.SENDGRID_FROM_EMAIL} via SendGrid.`);
    await sgMail.send(msg);
    console.log(`[Auth Ctrl] Password reset email sent successfully to ${user.email} via SendGrid.`);
    res.status(200).json({ message: 'If your email is registered, you will receive a password reset link shortly.' });
  } catch (error) {
    console.error('[Auth Ctrl] Error during SendGrid password reset process:', error);
    if (error.response && error.response.body && error.response.body.errors) {
      console.error('[Auth Ctrl] SendGrid Error Body Details:', JSON.stringify(error.response.body.errors, null, 2));
    } else if (error.message) {
      console.error('[Auth Ctrl] Error message:', error.message);
    }
    user.passwordResetToken = undefined; user.passwordResetExpires = undefined;
    try { await user.save({ validateBeforeSave: false }); console.log(`[Auth Ctrl] Cleared token for ${user.email} after error.`); }
    catch (saveError) { console.error(`[Auth Ctrl] CRITICAL: Failed to clear token for ${user.email}:`, saveError); }
    res.status(500).json({ message: 'There was an issue processing your request. Please try again later.' });
  }
});

// --- NEW: RESET PASSWORD WITH TOKEN ---
// @desc    Reset password using a token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  console.log(`[Auth Ctrl] Attempting to reset password with token (first 10 chars): ${token ? token.substring(0,10) + '...' : 'No Token'}`);

  if (!token || !password) {
    res.status(400);
    throw new Error('Please provide a token and a new password.');
  }

  if (password.length < 6) { // Add your password strength requirements
      res.status(400);
      throw new Error('Password must be at least 6 characters long.');
  }

  // Hash the incoming token from the URL/request body so we can find it in the DB
  const hashedToken = crypto
    .createHash('sha256')
    .update(token) // Hash the plaintext token received from the client
    .digest('hex');

  // Find user by the hashed token and check if the token has not expired
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }, // Check if expiry date is greater than current time
  }).select('+passwordResetToken +passwordResetExpires'); // Explicitly select these fields

  if (!user) {
    console.log(`[Auth Ctrl] Password reset token is invalid or has expired.`);
    res.status(400);
    throw new Error('Password reset token is invalid or has expired.');
  }

  // Set the new password (it will be hashed by the pre-save hook in User.js)
  user.password = password;
  user.passwordResetToken = undefined; // Clear the token
  user.passwordResetExpires = undefined; // Clear the expiry
  // user.forcePasswordChange = false; // If you implement this flag

  await user.save();
  console.log(`[Auth Ctrl] Password has been reset successfully for user: ${user.email}`);

  // Optionally, log the user in directly or send a confirmation
  // For now, just send success and let them log in manually
  res.status(200).json({ message: 'Password has been reset successfully. Please log in with your new password.' });
});
