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
  console.log('[Auth Ctrl] Registering user:', { username, email, firstName, lastName });

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

  // Password hashing is handled by the pre-save hook in User.js model
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
    console.log('[Auth Ctrl] User registered successfully:', user.username);
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
      token: token,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data during registration');
  }
});

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  console.log('[Auth Ctrl] Attempting login for email:', email);
  // Explicitly select password as it might be excluded by default in some User model setups
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (user && (await user.matchPassword(password))) {
    const token = generateToken(user._id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 3600 * 1000,
    });
    console.log('[Auth Ctrl] User logged in successfully:', user.username);
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
    console.warn('[Auth Ctrl] Login failed for email:', email);
    res.status(401); // Unauthorized
    throw new Error('Invalid email or password');
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  console.log('[Auth Ctrl] Fetching profile for user ID:', req.user.id);
  const user = await User.findById(req.user.id).select('-password');

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
    });
  } else {
    res.status(404);
    throw new Error('User not found for profile');
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res) => {
  console.log('[Auth Ctrl] Updating profile for user ID:', req.user.id);
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
      console.log('[Auth Ctrl] User password being updated.');
      user.password = req.body.password; // Hashing handled by pre-save hook
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

    if (req.body.shippingAddress !== undefined) {
      user.shippingAddress = updateAddress(user.shippingAddress, req.body.shippingAddress);
    }
    if (req.body.billingAddress !== undefined) {
      user.billingAddress = updateAddress(user.billingAddress, req.body.billingAddress);
    }

    const updatedUser = await user.save();
    console.log('[Auth Ctrl] Profile updated successfully for:', updatedUser.username);
    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      isAdmin: updatedUser.isAdmin,
      shippingAddress: updatedUser.shippingAddress,
      billingAddress: updatedUser.billingAddress,
    });
  } else {
    res.status(404);
    throw new Error('User not found for profile update');
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
export const logoutUser = asyncHandler(async (req, res) => {
  console.log('[Auth Ctrl] Logging out user.');
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
});


// @desc    Request a password reset
// @route   POST /api/auth/request-password-reset
// @access  Public
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  console.log(`[Auth Ctrl] Password reset requested for email: ${email}`);

  if (!email) {
    res.status(400);
    throw new Error('Please provide an email address');
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    console.log(`[Auth Ctrl] Password reset requested for non-existent or unverified email: ${email}. Sending generic response.`);
    res.status(200).json({ message: 'If your email is registered, you will receive a password reset link shortly.' });
    return;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 3600000; // 1 hour

  try {
    // Save user with token and expiry. Using validateBeforeSave: false if only these fields are changing.
    // If other parts of user model might be affected by other logic, keep default validation.
    await user.save({ validateBeforeSave: false });
    console.log(`[Auth Ctrl] Saved password reset token for user: ${user.email}`);

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log(`[Auth Ctrl] Generated Reset URL: ${resetUrl}`);
    if (!process.env.FRONTEND_URL) {
        console.error("[Auth Ctrl] CRITICAL: FRONTEND_URL environment variable is not set!");
    }

    const messageBody = `
      <p>Hello ${user.firstName || user.username},</p>
      <p>You are receiving this email because you (or someone else) have requested to reset the password for your account on TeesFromThePast.</p>
      <p>Please click on the following link, or paste it into your browser to complete the process within one hour of receiving it:</p>
      <p><a href="${resetUrl}" target="_blank" style="color: #FF7043; text-decoration: none; font-weight: bold;">Reset Your Password</a></p>
      <p>If you cannot click the link, copy and paste this URL into your browser:</p>
      <p>${resetUrl}</p>
      <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
      <p>Thank you,<br/>The TeesFromThePast Team</p>
    `;

    console.log('[Auth Ctrl] Attempting to create nodemailer transporter with service:', process.env.EMAIL_SERVICE);
    console.log('[Auth Ctrl] Email Username (for auth):', process.env.EMAIL_USERNAME ? 'SET' : 'NOT SET');
    // DO NOT log EMAIL_PASSWORD itself. Just check if it's set.
    console.log('[Auth Ctrl] Email Password (for auth):', process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET');


    if (!process.env.EMAIL_SERVICE || !process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
        console.error("[Auth Ctrl] CRITICAL: Email service environment variables (EMAIL_SERVICE, EMAIL_USERNAME, EMAIL_PASSWORD) are not fully configured.");
        // Do not proceed to send email if config is missing.
        // The generic 500 error will be sent by the catch block.
        throw new Error("Email service configuration is incomplete on the server.");
    }

    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
      // Adding timeout options for debugging
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,   // 10 seconds
      socketTimeout: 10000,     // 10 seconds
    });
    console.log('[Auth Ctrl] Nodemailer transporter created.');

    const mailOptions = {
      from: `TeesFromThePast <${process.env.EMAIL_FROM || process.env.EMAIL_USERNAME}>`,
      to: user.email,
      subject: 'Password Reset Request - TeesFromThePast',
      html: messageBody,
    };
    console.log(`[Auth Ctrl] Attempting to send password reset email to: ${user.email}`);

    const emailInfo = await transporter.sendMail(mailOptions);
    console.log(`[Auth Ctrl] Password reset email sent to ${user.email}. Message ID: ${emailInfo.messageId}`);
    res.status(200).json({ message: 'If your email is registered, you will receive a password reset link shortly.' });

  } catch (error) {
    console.error('[Auth Ctrl] Error during password reset process (saving user or sending email):', error);
    // Log the full error object, especially if it's from nodemailer
    if (error.responseCode) { // Nodemailer errors often have a responseCode
        console.error('[Auth Ctrl] Nodemailer Error Details - Code:', error.responseCode, 'Message:', error.message);
    }
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    try {
        await user.save({ validateBeforeSave: false }); // Attempt to clear token fields
        console.log(`[Auth Ctrl] Cleared password reset token fields for user ${user.email} after error.`);
    } catch (saveError) {
        console.error(`[Auth Ctrl] CRITICAL: Failed to clear password reset token fields for user ${user.email} after an initial error:`, saveError);
    }
    // Send the generic message to the client as intended
    res.status(500).json({ message: 'There was an issue processing your request. Please try again later.' });
  }
});

// Remember to add a controller function for POST /api/auth/reset-password (the next step)
