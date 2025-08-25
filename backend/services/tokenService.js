// backend/services/tokenService.js
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { nanoid } from "nanoid";
import RefreshTokenModel from "../models/RefreshToken.js";

// Environment configuration with defaults
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || "teesfromthepast";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "teesfromthepast-app";
const REQUIRE_JWT_CLAIMS = process.env.REQUIRE_JWT_CLAIMS === "true";
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS) || 7;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const RefreshToken = RefreshTokenModel;

/**
 * Generate a short-lived access token
 * @param {Object} payload - Token payload (user data)
 * @param {Object} opts - Additional options
 */
export function generateAccessToken(payload, opts = {}) {
  const tokenPayload = {
    id: payload.id || payload._id?.toString(),
    isAdmin: !!payload.isAdmin,
    ...opts.extra
  };

  const signOptions = {
    expiresIn: opts.expiresIn || ACCESS_TOKEN_TTL,
    ...(REQUIRE_JWT_CLAIMS && {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    })
  };

  return jwt.sign(tokenPayload, JWT_SECRET, signOptions);
}

/**
 * Generate a secure refresh token and store session
 * @param {Object} sessionCtx - Session context {userId, ip, userAgent, client}
 */
export async function generateRefreshToken(sessionCtx) {
  const { userId, ip = "", userAgent = "", client = {} } = sessionCtx;
  
  // Generate cryptographically secure random token
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  
  const jti = nanoid();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Store hashed token in database
  const tokenDoc = new RefreshToken({
    jti,
    user: userId,
    refreshTokenHash,
    ip,
    userAgent,
    client,
    expiresAt,
    lastSeenAt: new Date()
  });

  await tokenDoc.save();

  return {
    token: refreshToken,
    jti,
    expiresAt
  };
}

/**
 * Rotate refresh token securely with reuse detection
 * @param {string} oldTokenRaw - Raw refresh token to rotate
 * @param {Object} sessionCtx - New session context
 */
export async function rotateRefreshToken(oldTokenRaw, sessionCtx) {
  const oldTokenHash = crypto.createHash('sha256').update(oldTokenRaw).digest('hex');
  
  // Find the old token
  const oldTokenDoc = await RefreshToken.findOne({
    refreshTokenHash: oldTokenHash,
    revokedAt: null
  });

  if (!oldTokenDoc) {
    throw new Error('INVALID_TOKEN');
  }

  // Check if token is expired
  if (oldTokenDoc.expiresAt < new Date()) {
    throw new Error('TOKEN_EXPIRED');
  }

  // Check for token reuse (already rotated)
  if (oldTokenDoc.rotatedAt) {
    // This is a reuse attempt - mark as compromised and revoke all user sessions
    oldTokenDoc.compromisedAt = new Date();
    oldTokenDoc.revokedAt = new Date();
    await oldTokenDoc.save();

    // Revoke all tokens for this user as a security measure
    await RefreshToken.updateMany(
      { user: oldTokenDoc.user, revokedAt: null },
      { $set: { revokedAt: new Date(), compromisedAt: new Date() } }
    );

    throw new Error('TOKEN_REUSE_DETECTED');
  }

  // Mark old token as rotated
  oldTokenDoc.rotatedAt = new Date();
  oldTokenDoc.revokedAt = new Date();
  await oldTokenDoc.save();

  // Generate new refresh token
  const newRefreshToken = await generateRefreshToken({
    ...sessionCtx,
    userId: oldTokenDoc.user
  });

  // Link the new token to the old one for audit trail
  await RefreshToken.findOneAndUpdate(
    { jti: newRefreshToken.jti },
    { rotatedFrom: oldTokenDoc._id }
  );

  return newRefreshToken;
}

/**
 * Verify access token with optional claims validation
 * @param {string} token - JWT access token
 */
export function verifyAccessToken(token) {
  const verifyOptions = {
    ...(REQUIRE_JWT_CLAIMS && {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    })
  };

  try {
    return jwt.verify(token, JWT_SECRET, verifyOptions);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('TOKEN_EXPIRED');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('INVALID_TOKEN');
    } else {
      throw new Error('TOKEN_VERIFICATION_FAILED');
    }
  }
}

/**
 * Revoke refresh token
 * @param {string} tokenRaw - Raw refresh token to revoke
 */
export async function revokeRefreshToken(tokenRaw) {
  const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
  
  const result = await RefreshToken.findOneAndUpdate(
    { refreshTokenHash: tokenHash, revokedAt: null },
    { revokedAt: new Date() },
    { new: true }
  );

  return !!result;
}

/**
 * Revoke all user sessions
 * @param {string} userId - User ID
 */
export async function revokeAllUserSessions(userId) {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}