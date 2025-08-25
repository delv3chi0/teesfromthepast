// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import { generateAccessToken, verifyAccessToken } from "../services/tokenService.js";
import logger from "../utils/logger.js";

/** Read "Bearer <token>" from Authorization header */
function readBearer(req) {
  const raw = req.headers?.authorization || req.headers?.Authorization || "";
  if (!raw || !raw.startsWith("Bearer ")) return null;
  return raw.slice(7).trim();
}

/**
 * Sign a short-lived access token for a user.
 * Keeps payload small and compatible with existing controllers.
 */
export function signAccessToken(user, extra = {}) {
  // Use the new token service
  return generateAccessToken(user, extra);
}

/**
 * Factory that enforces:
 *  - Valid JWT always
 *  - Optional or required x-session-id (device binding)
 */
const baseProtect = (requireSession) =>
  asyncHandler(async (req, res, next) => {
    const token = readBearer(req);
    if (!token) {
      return res.status(401).json({ message: "Not authorized: token missing" });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      logger.debug('Token verification failed', { error: err.message });
      return res.status(401).json({ message: "Not authorized: invalid token" });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Not authorized: user not found" });
    }

    req.user = user;

    // capture session id if present
    const sid =
      req.headers["x-session-id"] ||
      req.headers["X-Session-Id"] ||
      req.headers["x-sessionid"] ||
      "";
    if (sid) req.sessionId = String(sid);

    // lightweight client/net info (optional)
    req.client = {
      ua: req.headers["user-agent"] || "",
      ip:
        req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
        req.ip ||
        req.connection?.remoteAddress ||
        "",
    };

    if (requireSession && !req.sessionId) {
      return res.status(401).json({ message: "Session missing" });
    }

    return next();
  });

/**
 * Exports:
 *  - protect: JWT required; session OPTIONAL (use for email, profile, most APIs)
 *  - protectWithSession: JWT + x-session-id REQUIRED (use for device-bound admin/session endpoints)
 *  - requireAdmin: gate admin routes
 */
export const protect = baseProtect(false);
export const protectWithSession = baseProtect(true);

export function requireAdmin(req, res, next) {
  if (req?.user?.isAdmin) return next();
  return res.status(403).json({ message: "Admin access required" });
}
