// backend/controllers/authController.js
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import { signAccessToken } from "../middleware/authMiddleware.js";
import { validationResult } from "express-validator";
import { logAuthLogin, logAuthLogout } from "../utils/audit.js";

/**
 * POST /api/auth/login
 */
export const loginUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400); throw new Error(errors.array()[0].msg); }

  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    res.status(401); throw new Error("Invalid email or password");
  }

  const token = signAccessToken(user._id);
  // fire-and-forget audit
  logAuthLogin(req, user, { email });

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

/**
 * POST /api/auth/logout
 * (Stateless JWT — nothing to revoke here; we still log the intention.)
 */
export const logoutUser = asyncHandler(async (req, res) => {
  // If you keep refresh tokens elsewhere, revoke them here.
  logAuthLogout(req, req.user || null, {});
  res.json({ message: "Logged out" });
});

/**
 * Other handlers (register, profile, update, etc.) unchanged…
 * Make sure they are exported here exactly as before in your app.
 */
