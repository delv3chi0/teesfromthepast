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
  // This log will appear if the key is missing when the server starts.
  // The requestPasswordReset function also has a runtime check.
  console.error('[Auth Cfg] WARNING: SENDGRID_API_KEY environment variable is not set! Email sending will fail.');
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
    
    // Note: This endpoint is for profile details. Password change is handled by /api/auth/change-password
    // If a password field is sent here, it should ideally be ignored or handled explicitly if intended.
    // For clarity, we assume password changes are separate. If you want to allow password change here too,
    // you'd add the logic like:
    // if (req.body.password && req.body.password.length > 0) {
    //   console.log('[Auth Ctrl] User password being updated during profile update (not recommended here, use /change-password).');
    //   user.password = req.body.password;
    // }

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

// @desc    Change user password (when logged in)
// @route   PUT /api/auth/change-password
// @access  Private (user must be logged in)
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  // req.user.id comes from the 'protect' middleware
  console.log('[Auth Ctrl] Attempting to change password for user ID:', req.user.id);

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Please provide current and new passwords.');
  }

  if (newPassword.length < 6) { // Consistent with frontend/registration validation
    res.status(400);
    throw new Error('New password must be at least 6 characters long.');
  }

  // We need to fetch the user and explicitly select the password to compare the current one
  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    // This should not happen if 'protect' middleware is working correctly
    res.status(404);
    throw new Error('User not found.');
  }

  // Check if currentPassword matches
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    console.warn('[Auth Ctrl] Change password failed - current password incorrect for user:', user.email);
    res.status(401); // Unauthorized or Bad credentials
    throw new Error('Incorrect current password.');
  }

  // Set new password (pre-save hook in User model will hash it)
  user.password = newPassword;
  await user.save(); // This will trigger the pre-save hook to hash the new password

  console.log('[Auth Ctrl] Password changed successfully for user:', user.email);
  res.status(200).json({ message: 'Password changed successfully.' });
});


// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
export const logoutUser = asyncHandler(async (req, res) => {
  console.log('[Auth Ctrl] Logging out user.');
  res.cookie('token', '', {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', expires: new Date(0),
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

// @desc    Reset password using a token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  console.log(`[Auth Ctrl] Attempting to reset password with token (first 10 chars): ${token ? token.substring(0,10) + '...' : 'No Token'}`);
  if (!token || !password) {
    res.status(400); throw new Error('Please provide a token and a new password.');
  }
  if (password.length < 6) {
      res.status(400); throw new Error('Password must be at least 6 characters long.');
  }
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');
  if (!user) {
    console.log(`[Auth Ctrl] Password reset token is invalid or has expired for token (hashed): ${hashedToken.substring(0,10)}...`);
    res.status(400); throw new Error('Password reset token is invalid or has expired.');
  }
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  console.log(`[Auth Ctrl] Password has been reset successfully for user: ${user.email}`);
  res.status(200).json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
});
