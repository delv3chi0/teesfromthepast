// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import User from "../models/User.js";

let RefreshToken;
try {
  RefreshToken = mongoose.model("RefreshToken");
} catch {
  // lazy load if not registered
  const mod = await import("../models/RefreshToken.js");
  RefreshToken = mod.default || mod;
}

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

/** Collect client hint headers and attach to req.clientInfo for auditing */
export function readClientHints(req) {
  const h = req.headers || {};
  const ip =
    h["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    "";
  return {
    ip,
    ua: h["x-client-ua"] || h["user-agent"] || "",
    tz: h["x-client-timezone"] || "",
    lang: h["x-client-lang"] || "",
    viewport: h["x-client-viewport"] || "",
    platform: h["x-client-platform"] || "",
    localTime: h["x-client-localtime"] || "",
    deviceMemory: h["x-client-devicememory"] || "",
    cpuCores: h["x-client-cpucores"] || "",
    sessionId: h["x-session-id"] || "",
  };
}

/**
 * Protect middleware: verifies JWT, loads user, attaches to req.user,
 * and updates the matching session's lastSeenAt + client hints.
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

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      res.status(401);
      throw new Error("Not authorized, user not found");
    }

    req.user = user;
    req.clientInfo = readClientHints(req);

    // Update session lastSeen + client data if X-Session-ID was supplied
    if (req.clientInfo.sessionId) {
      const rt = await RefreshToken.findOne({ jti: req.clientInfo.sessionId }).exec();
      if (rt && String(rt.user) === String(user._id)) {
        rt.lastSeenAt = new Date();
        // patch any missing client fields
        rt.client = { ...(rt.client || {}), ...{
          tz: req.clientInfo.tz || rt.client?.tz,
          lang: req.clientInfo.lang || rt.client?.lang,
          viewport: req.clientInfo.viewport || rt.client?.viewport,
          platform: req.clientInfo.platform || rt.client?.platform,
          ua: req.clientInfo.ua || rt.client?.ua,
          localTime: req.clientInfo.localTime || rt.client?.localTime,
          deviceMemory: req.clientInfo.deviceMemory || rt.client?.deviceMemory,
          cpuCores: req.clientInfo.cpuCores || rt.client?.cpuCores,
        }};
        await rt.save();
      }
    }

    next();
  } catch (err) {
    res.status(401);
    throw new Error("Not authorized, token invalid");
  }
});

/** Admin gate */
export const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) return next();
  res.status(403);
  throw new Error("Admin privileges required");
};
