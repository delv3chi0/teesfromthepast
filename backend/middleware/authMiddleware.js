// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";

/**
 * Create a signed access token (Bearer JWT) for a user id.
 * Expires in 7 days by default; adjust if you’d like shorter sessions.
 */
export function signAccessToken(userId) {
  const secret = process.env.JWT_SECRET || "dev-secret-change-me";
  return jwt.sign({ id: userId }, secret, { expiresIn: "7d" });
}

/**
 * Extract Bearer token from Authorization header.
 */
function getTokenFromHeader(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

/**
 * Protect middleware: verifies JWT, loads user, attaches to req.user
 */
export const protect = asyncHandler(async (req, res, next) => {
  const token = getTokenFromHeader(req);
  if (!token) {
    res.status(401);
    throw new Error("Not authorized, token missing");
  }

  try {
    const secret = process.env.JWT_SECRET || "dev-secret-change-me";
    const decoded = jwt.verify(token, secret);

    // Load fresh user so we have isAdmin, email, etc.
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      res.status(401);
      throw new Error("Not authorized, user not found");
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    throw new Error("Not authorized, token invalid");
  }
});

/**
 * Admin gate: requires req.user.isAdmin === true
 * (Export name must be exactly 'admin' because routes/admin.js imports it as such.)
 */
export const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) return next();
  res.status(403);
  throw new Error("Admin privileges required");
};
