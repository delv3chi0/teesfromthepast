// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";

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
  if (!user?._id) throw new Error("signAccessToken: user missing _id");
  const payload = {
    id: user._id.toString(),
    isAdmin: !!user.isAdmin,
    ...extra,
  };
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  const expiresIn = process.env.JWT_EXPIRES_IN || "15m";
  
  const options = { expiresIn };
  
  // Add issuer and audience if configured
  const issuer = process.env.JWT_ISSUER;
  const audience = process.env.JWT_AUDIENCE;
  if (issuer) options.issuer = issuer;
  if (audience) options.audience = audience;
  
  return jwt.sign(payload, secret, options);
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
      const secret = process.env.JWT_SECRET;
      const options = {};
      
      // Add issuer and audience validation if configured
      const issuer = process.env.JWT_ISSUER;
      const audience = process.env.JWT_AUDIENCE;
      if (issuer) options.issuer = issuer;
      if (audience) options.audience = audience;
      
      decoded = jwt.verify(token, secret, options);
    } catch (err) {
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
