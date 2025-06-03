// backend/controllers/authController.js
import asyncHandler from 'express-async-handler'; // For cleaner async error handling
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';        // For password reset token
import nodemailer from 'nodemailer'; // For sending emails
import User from '../models/User.js'; // Ensure User model has resetToken & resetExpires fields
import 'dotenv/config';

// Utility to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ user: { id } }, process.env.JWT_SECRET, {
    expiresIn: '1h', // Or your preferred expiration
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;

  const userExistsByEmail = await User.findOne({ email: email.toLowerCase() });
  if (userExistsByEmail) {
    res.status(400);
    throw new Error('User with this email already exists');
  }

  const userExistsByUsername = await User.findOne({ username });
  if (userExistsByUsername) {
    res.status(400);
    throw new Error('Username already taken');
  }

  // Password hashing is now handled by the pre-save hook in User.js model
  const user = await User.create({
    username,
    email: email.toLowerCase(),
    password, // Provide plaintext password, model will hash it
    firstName: firstName || '',
    lastName: lastName || '',
  });

  if (user) {
    const token = generateToken(user._id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 3600 * 1000, // 1 hour
    });
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
      token: token, // Also send token in response body for frontend state
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password'); // Explicitly select password

  if (user && (await user.matchPassword(password))) { // Use matchPassword method from User model
    const token = generateToken(user._id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 3600 * 1000,
    });
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
      shippingAddress: user.shippingAddress,
      billingAddress: user.billingAddress,
      token: token,
    });
  } else {
    res.status(401); // Unauthorized
    throw new Error('Invalid email or password');
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  // req.user is set by the 'protect' middleware
  // The 'protect' middleware should ideally fetch the user and attach it
  // Re-fetch to ensure latest data, or ensure 'protect' middleware provides full, fresh user object
  const user = await User.findById(req.user.id).select('-password'); // Exclude password

  if (user) {
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
      shippingAddress: user.shippingAddress,
      billingAddress: user.billingAddress,
      lastContestSubmissionMonth: user.lastContestSubmissionMonth,
      monthlyVoteRecord: user.monthlyVoteRecord,
      // Add any other fields you want to return for the profile
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user) {
    user.username = req.body.username || user.username;
    if (req.body.email && req.body.email.toLowerCase() !== user.email) {
        const existingUser = await User.findOne({ email: req.body.email.toLowerCase() });
        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
            res.status(400);
            throw new Error('Email already in use.');
        }
        user.email = req.body.email.toLowerCase();
    }
    user.firstName = req.body.firstName !== undefined ? req.body.firstName : user.firstName;
    user.lastName = req.body.lastName !== undefined ? req.body.lastName : user.lastName;

    if (req.body.password && req.body.password.length > 0) {
      // Password will be hashed by pre-save hook in User model
      user.password = req.body.password;
    }

    // Helper to update an address subdocument
    const updateAddress = (currentAddressDoc, newAddressData) => {
      if (!newAddressData && newAddressData !== null) return currentAddressDoc; // No new data, keep current
      if (newAddressData === null) return undefined; // Clear address

      const addressToUpdate = currentAddressDoc || {};
      Object.keys(newAddressData).forEach(key => {
        if (newAddressData[key] !== undefined) {
          addressToUpdate[key] = newAddressData[key];
        }
      });
      return addressToUpdate;
    };

    if (req.body.shippingAddress !== undefined) {
      user.shippingAddress = updateAddress(user.shippingAddress, req.body.shippingAddress);
    }
    if (req.body.billingAddress !== undefined) {
      user.billingAddress = updateAddress(user.billingAddress, req.body.billingAddress);
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      isAdmin: updatedUser.isAdmin,
      shippingAddress: updatedUser.shippingAddress,
      billingAddress: updatedUser.billingAddress,
      // Return a new token if sensitive info like password was changed, or for general best practice
      // token: generateToken(updatedUser._id), // Optional: refresh token
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public (though typically called by authenticated users)
export const logoutUser = asyncHandler(async (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: new Date(0), // Set cookie to expire immediately
  });
  res.status(200).json({ message: 'Logged out successfully' });
});


// @desc    Request a password reset
// @route   POST /api/auth/request-password-reset
// @access  Public
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Please provide an email address');
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    console.log(`[Auth Ctrl] Password reset requested for non-existent email: ${email}`);
    res.status(200).json({ message: 'If your email is registered, you will receive a password reset link shortly.' });
    return;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 3600000; // 1 hour

  try {
    await user.save({ validateBeforeSave: false }); // Save, skip validation if only updating token fields

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const messageBody = `
      <p>Hello ${user.firstName || user.username},</p>
      <p>You are receiving this email because you (or someone else) have requested to reset the password for your account on TeesFromThePast.</p>
      <p>Please click on the following link, or paste it into your browser to complete the process within one hour of receiving it:</p>
      <p><a href="${resetUrl}" target="_blank">${resetUrl}</a></p>
      <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
      <p>Thank you,<br/>The TeesFromThePast Team</p>
    `;

    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE, // e.g., 'Gmail'
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: `TeesFromThePast <${process.env.EMAIL_FROM || process.env.EMAIL_USERNAME}>`,
      to: user.email,
      subject: 'Password Reset Request - TeesFromThePast',
      html: messageBody,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Auth Ctrl] Password reset email sent to ${user.email}`);
    res.status(200).json({ message: 'If your email is registered, you will receive a password reset link shortly.' });

  } catch (error) {
    console.error('[Auth Ctrl] Error in requestPasswordReset:', error);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500).json({ message: 'There was an issue processing your request. Please try again later.' });
  }
});

// Remember to add a controller function for POST /api/auth/reset-password later
