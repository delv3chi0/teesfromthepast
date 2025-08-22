// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import User from "../models/User.js";
import RefreshTokenModel from "../models/RefreshToken.js";

const RefreshToken = mongoose.models.RefreshToken || RefreshTokenModel;

/** Create a signed access token (Bearer JWT) */
export function signAccessToken(userId) {
  const secret = process.env.JWT_SECRET || "dev-secret-change-me";
  return jwt.sign({ id: userId }, secret, { expiresIn: "7d" });
}
function getTokenFromHeader(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

/**
 * NEW: require a valid session id header + unrevoked/active RefreshToken row.
 * Header: X-Session-Id
 */
async function assertActiveSession(req, userId) {
  const jti = req.headers["x-session-id"];
  if (!jti) {
    const err = new Error("Session missing");
    err.statusCode = 401;
    throw err;
  }
  const row = await RefreshToken.findOne({ jti, user: userId }).lean();
  if (!row) {
    const err = new Error("Session not found");
    err.statusCode = 401;
    throw err;
  }
  if (row.revokedAt) {
    const err = new Error("Session revoked");
    err.statusCode = 401;
    throw err;
  }
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
    const err = new Error("Session expired");
    err.statusCode = 401;
    throw err;
  }
  // soft heartbeat (non-blocking)
  RefreshToken.updateOne({ _id: row._id }, { $set: { lastSeenAt: new Date() } }).catch(() => {});
}

export const protect = asyncHandler(async (req, res, next) => {
  const token = getTokenFromHeader(req);
  if (!token) {
    res.status(401);
    throw new Error("Not authorized, token missing");
  }

  try {
    const secret = process.env.JWT_SECRET || "dev-secret-change-me";
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      res.status(401);
      throw new Error("Not authorized, user not found");
    }
    // Enforce active session
    await assertActiveSession(req, user._id);

    req.user = user;
    next();
  } catch (err) {
    const code = err?.statusCode || 401;
    res.status(code);
    throw new Error(err?.message || "Not authorized");
  }
});

export const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) return next();
  res.status(403);
  throw new Error("Admin privileges required");
};
