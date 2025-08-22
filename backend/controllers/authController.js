// backend/controllers/authController.js
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import { validationResult } from "express-validator";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import { signAccessToken } from "../middleware/authMiddleware.js";
import { logAuthLogin, logAuthLogout, logAudit } from "../utils/audit.js";

/** helpers */
function clientNet(req) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    "";
  const userAgent = req.headers["user-agent"] || "";
  return { ip, userAgent };
}
function clientHeadersSubset(req) {
  const h = req.headers || {};
  return {
    "accept-language": h["accept-language"] || "",
    "sec-ch-ua": h["sec-ch-ua"] || "",
    "sec-ch-ua-platform": h["sec-ch-ua-platform"] || "",
    "sec-ch-ua-mobile": h["sec-ch-ua-mobile"] || "",
    referer: h["referer"] || "",
    origin: h["origin"] || "",
  };
}
function sessionExpiry(days = 30) {
  return new Date(Date.now() + days * 86400000);
}
function setSidCookie(res, jti) {
  // Cross-site from vercel.app -> onrender.com requires SameSite=None; Secure
  res.cookie("sid", jti, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
  });
}

/**
 * POST /api/auth/register
 */
export const registerUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400); throw new Error(errors.array()[0].msg); }

  const { username, email, password, firstName = "", lastName = "" } = req.body;

  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) { res.status(400); throw new Error("User with that email or username already exists"); }

  const user = await User.create({ username, email, password, firstName, lastName });
  const token = signAccessToken(user._id);

  const jti = crypto.randomUUID();
  const { ip, userAgent } = clientNet(req);
  await RefreshToken.create({
    jti,
    user: user._id,
    ip,
    userAgent,
    expiresAt: sessionExpiry(30),
    meta: { client: clientHeadersSubset(req) },
  });
  setSidCookie(res, jti);

  await logAudit(req, {
    action: "REGISTER",
    targetType: "User",
    targetId: String(user._id),
    meta: { email: user.email },
    actor: user._id,
  });
  await logAuthLogin(req, user, { via: "register" });

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

/**
 * POST /api/auth/login
 */
export const loginUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400); throw new Error(errors.array()[0].msg); }

  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) { res.status(401); throw new Error("Invalid email or password"); }

  const token = signAccessToken(user._id);

  const jti = crypto.randomUUID();
  const { ip, userAgent } = clientNet(req);
  await RefreshToken.create({
    jti,
    user: user._id,
    ip,
    userAgent,
    expiresAt: sessionExpiry(30),
    meta: { client: clientHeadersSubset(req) },
  });
  setSidCookie(res, jti);

  await logAuthLogin(req, user, { email });

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
 */
export const logoutUser = asyncHandler(async (req, res) => {
  const user = req.user || null;
  await logAuthLogout(req, user, {});

  if (user?._id) {
    // Revoke the most recent active session for this client
    const rt = await RefreshToken.findOne({ user: user._id, revokedAt: null }).sort({ createdAt: -1 });
    if (rt) { rt.revokedAt = new Date(); await rt.save(); }
  }

  // Clear sid cookie
  res.cookie("sid", "", { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 0 });

  res.json({ message: "Logged out" });
});

/**
 * GET /api/auth/profile
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) { res.status(404); throw new Error("User not found"); }
  res.json(user);
});

/**
 * PUT /api/auth/profile
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!user) { res.status(404); throw new Error("User not found"); }

  const { username, email, firstName, lastName, shippingAddress, billingAddress } = req.body;
  if (username !== undefined) user.username = username;
  if (email !== undefined) user.email = email;
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (shippingAddress !== undefined) user.shippingAddress = shippingAddress;
  if (billingAddress !== undefined) user.billingAddress = billingAddress;

  const updated = await user.save();

  await logAudit(req, {
    action: "PROFILE_UPDATE",
    targetType: "User",
    targetId: String(user._id),
    meta: {},
    actor: user._id,
  });

  const toSend = updated.toObject();
  delete toSend.password;
  res.json(toSend);
});

/**
 * Password reset + change handlers unchanged (but keep actor: req.user?._id where applicable)
 */

export const refreshSession = asyncHandler(async (req, res) => {
  const token = signAccessToken(req.user._id);
  const rt = await RefreshToken.findOne({ user: req.user._id, revokedAt: null }).sort({ createdAt: -1 });
  if (rt) {
    rt.expiresAt = sessionExpiry(30);
    await rt.save();
    setSidCookie(res, rt.jti);
  }
  res.json({ token });
});
