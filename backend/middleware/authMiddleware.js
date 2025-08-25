// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import User from "../models/User.js";
import { getConfig } from "../config/index.js";
import { isRefreshTokenBlacklisted } from "../redis/index.js";
import { logger } from "../utils/logger.js";

/** Read "Bearer <token>" from Authorization header */
function readBearer(req) {
  const raw = req.headers?.authorization || req.headers?.Authorization || "";
  if (!raw || !raw.startsWith("Bearer ")) return null;
  return raw.slice(7).trim();
}

/**
 * Sign a short-lived access token for a user with enhanced payload.
 * Now includes JTI for token tracking and revocation.
 */
export function signAccessToken(user, extra = {}) {
  if (!user?._id) throw new Error("signAccessToken: user missing _id");
  
  const config = getConfig();
  const jti = crypto.randomUUID(); // JWT ID for tracking
  
  const payload = {
    id: user._id.toString(),
    sub: user._id.toString(), // Standard JWT subject claim
    isAdmin: !!user.isAdmin,
    jti, // JWT ID for token tracking/revocation
    iat: Math.floor(Date.now() / 1000), // Issued at
    ...extra,
  };
  
  const secret = config.JWT_SECRET;
  const expiresIn = config.JWT_ACCESS_TTL || "15m";
  
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Enhanced authentication middleware that extracts and validates JWT,
 * attaches user info to req.auth for better security practices.
 * This is the ensureAuth middleware from Task 6 requirements.
 */
export const ensureAuth = asyncHandler(async (req, res, next) => {
  const token = readBearer(req);
  if (!token) {
    return res.status(401).json({ 
      message: "Not authorized: token missing",
      code: "TOKEN_MISSING" 
    });
  }

  let decoded;
  try {
    const config = getConfig();
    decoded = jwt.verify(token, config.JWT_SECRET);
  } catch (err) {
    let message = "Not authorized: invalid token";
    let code = "TOKEN_INVALID";
    
    if (err.name === 'TokenExpiredError') {
      message = "Not authorized: token expired";
      code = "TOKEN_EXPIRED";
    } else if (err.name === 'JsonWebTokenError') {
      message = "Not authorized: malformed token";
      code = "TOKEN_MALFORMED";
    }
    
    return res.status(401).json({ message, code });
  }

  // Check if token has required claims
  if (!decoded.sub && !decoded.id) {
    return res.status(401).json({ 
      message: "Not authorized: invalid token claims",
      code: "TOKEN_INVALID_CLAIMS" 
    });
  }

  const userId = decoded.sub || decoded.id;
  const user = await User.findById(userId).select("-password");
  if (!user) {
    return res.status(401).json({ 
      message: "Not authorized: user not found",
      code: "USER_NOT_FOUND" 
    });
  }

  // Attach auth info to request - new pattern for enhanced security
  req.auth = {
    sub: userId,
    userId: userId,
    roles: user.isAdmin ? ['admin', 'user'] : ['user'],
    jti: decoded.jti,
    isAdmin: !!user.isAdmin,
    user: user // Full user object for convenience
  };

  // Backward compatibility - keep req.user for existing code
  req.user = user;

  // Capture session id if present
  const sid =
    req.headers["x-session-id"] ||
    req.headers["X-Session-Id"] ||
    req.headers["x-sessionid"] ||
    "";
  if (sid) req.sessionId = String(sid);

  // Lightweight client/net info (optional)
  req.client = {
    ua: req.headers["user-agent"] || "",
    ip:
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.ip ||
      req.connection?.remoteAddress ||
      "",
  };

  return next();
});

/**
 * Factory that enforces:
 *  - Valid JWT always
 *  - Optional or required x-session-id (device binding)
 */
const baseProtect = (requireSession) =>
  asyncHandler(async (req, res, next) => {
    // Use ensureAuth for JWT validation
    await ensureAuth(req, res, async () => {
      if (requireSession && !req.sessionId) {
        return res.status(401).json({ 
          message: "Session missing",
          code: "SESSION_REQUIRED" 
        });
      }
      return next();
    });
  });

/**
 * Exports:
 *  - protect: JWT required; session OPTIONAL (use for email, profile, most APIs)
 *  - protectWithSession: JWT + x-session-id REQUIRED (use for device-bound admin/session endpoints)
 *  - ensureAuth: Enhanced JWT validation with req.auth attachment
 *  - requireAdmin: gate admin routes
 */
export const protect = baseProtect(false);
export const protectWithSession = baseProtect(true);

export function requireAdmin(req, res, next) {
  if (req?.auth?.isAdmin || req?.user?.isAdmin) return next();
  return res.status(403).json({ 
    message: "Admin access required",
    code: "ADMIN_REQUIRED" 
  });
}

// TODO: Task 6 - Advanced auth middleware features to implement later:
// TODO: - Rate limiting per user/IP for auth endpoints
// TODO: - Suspicious activity detection (multiple failed attempts, unusual locations)
// TODO: - Token refresh prediction (proactive refresh before expiry)
// TODO: - Multi-device session management and conflict resolution
// TODO: - Audit logging for all authentication events
