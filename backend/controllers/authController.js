// backend/controllers/authController.js
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sgMail from '@sendgrid/mail'; // Import SendGrid Mail service
import User from '../models/User.js';
import 'dotenv/config';

// Set SendGrid API Key (it's good practice to set it once when the module loads)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('[Auth Cfg] SendGrid API Key configured.');
} else {
  console.error('[Auth Cfg] CRITICAL: SENDGRID_API_KEY environment variable is not set!');
}


// Utility to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ user: { id } }, process.env.JWT_SECRET, {
    expiresIn: '1h',
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

  const user = await User.create({
    username,
    email: email.toLowerCase(),
    password, // Hashing handled by pre-save hook in User.js
    firstName: firstName || '',
    lastName: lastName || '',
  });

  if (user) {
    const token = generateToken(user._id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 3600 * 1000,
    });
    console.log('[Auth Ctrl] User registered successfully:', user.username);
    res.status(201).json({
      _id: user._id, username: user.username, email: user.email,
      firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin, token: token,
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
      _id: user._id, username: user.username, email: user.email,
      firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin,
      shippingAddress: user.shippingAddress, billingAddress: user.billingAddress, token: token,
    });
  } else {
    console.warn('[Auth Ctrl] Login failed for email:', email);
    res.status(401);
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
      _id: user._id, username: user.username, email: user.email,
      firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin,
      shippingAddress: user.shippingAddress, billingAddress: user.billingAddress,
      lastContestSubmissionMonth: user.lastContestSubmissionMonth, monthlyVoteRecord: user.monthlyVoteRecord,
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
            res.status(400); throw new Error('Email already in use.');
        }
        user.email = req.body.email.toLowerCase();
    }
    user.firstName = req.body.firstName !== undefined ? req.body.firstName : user.firstName;
    user.lastName = req.body.lastName !== undefined ? req.body.lastName : user.lastName;
    if (req.body.password && req.body.password.length > 0) {
      console.log('[Auth Ctrl] User password being updated.');
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
    console.log(`[Auth Ctrl] Password reset: Email not found: ${email}. Sending generic response.`);
    // It's important to send a generic success-like response to prevent email enumeration
    return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link shortly.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 3600000; // 1 hour

  try {
    await user.save({ validateBeforeSave: false }); // Save only token and expiry
    console.log(`[Auth Ctrl] Saved password reset token for user: ${user.email}`);

    // --- Check for critical environment variables ---
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL || !process.env.FRONTEND_URL) {
        console.error("[Auth Ctrl] CRITICAL: Email sending environment variables (SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, FRONTEND_URL) are not fully configured.");
        // Do not proceed if config is missing. The error will be caught by the outer catch block.
        throw new Error("Server configuration error for sending email.");
    }
    // API key is set globally at the top of the file now: sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log(`[Auth Ctrl] Generated Reset URL: ${resetUrl}`);

    const messageBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4E342E;">Password Reset Request - TeesFromThePast</h2>
        <p>Hello ${user.firstName || user.username},</p>
        <p>You are receiving this email because you (or someone else) have requested to reset the password for your account on TeesFromThePast.</p>
        <p>Please click on the button below, or paste the following link into your browser to complete the process. This link will expire in one hour:</p>
        <p style="margin: 20px 0; text-align: center;">
          <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #FF7043; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Your Password</a>
        </p>
        <p>If the button doesn't work, you can copy and paste this URL into your browser:</p>
        <p><a href="${resetUrl}" target="_blank">${resetUrl}</a></p>
        <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
        <p>Thank you,<br/>The TeesFromThePast Team</p>
      </div>
    `;

    const msg = {
      to: user.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL, // Your VERIFIED sender email in SendGrid
        name: 'TeesFromThePast Support',        // Optional: Sender name
      },
      subject: 'Password Reset Request - TeesFromThePast',
      html: messageBody,
    };

    console.log(`[Auth Ctrl] Attempting to send password reset email to: ${user.email} from: ${process.env.SENDGRID_FROM_EMAIL} via SendGrid.`);
    await sgMail.send(msg);
    console.log(`[Auth Ctrl] Password reset email sent successfully to ${user.email} via SendGrid.`);
    res.status(200).json({ message: 'If your email is registered, you will receive a password reset link shortly.' });

  } catch (error) {
    console.error('[Auth Ctrl] Error during SendGrid password reset process:', error);
    if (error.response && error.response.body && error.response.body.errors) { // SendGrid often includes detailed errors here
      console.error('[Auth Ctrl] SendGrid Error Body Details:', JSON.stringify(error.response.body.errors, null, 2));
    } else if (error.message) {
      console.error('[Auth Ctrl] Error message:', error.message);
    }

    // Attempt to clear token fields to allow user to retry without being blocked by old token
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    try {
      await user.save({ validateBeforeSave: false });
      console.log(`[Auth Ctrl] Cleared password reset token fields for user ${user.email} after SendGrid error.`);
    } catch (saveError) {
      console.error(`[Auth Ctrl] CRITICAL: Failed to clear password reset token fields for user ${user.email} after an initial error:`, saveError);
    }
    // Send a generic error message to the client
    res.status(500).json({ message: 'There was an issue processing your request. Please try again later.' });
  }
});

// Placeholder for the next step - resetting the password with the token
// export const resetPassword = asyncHandler(async (req, res) => { /* ... to be implemented ... */ });
