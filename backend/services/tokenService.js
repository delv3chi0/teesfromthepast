// backend/services/tokenService.js
// JWT token operations with rotation and security features
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import logger from '../utils/logger.js';

const {
  JWT_SECRET,
  JWT_ISSUER,
  JWT_AUDIENCE,
  REQUIRE_JWT_CLAIMS
} = process.env;

function getJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return JWT_SECRET;
}

/**
 * Generate a short-lived access token (15 minutes)
 * @param {Object} user - User object with _id
 * @param {Object} extra - Additional claims to include
 * @returns {string} JWT access token
 */
export function generateAccessToken(user, extra = {}) {
  if (!user?._id) {
    throw new Error('generateAccessToken: user missing _id');
  }

  const payload = {
    id: user._id.toString(),
    isAdmin: !!user.isAdmin,
    ...extra,
  };

  const options = {
    expiresIn: '15m' // Fixed 15-minute expiry for access tokens
  };

  // Add issuer/audience if configured and required
  if (REQUIRE_JWT_CLAIMS === '1') {
    if (JWT_ISSUER) options.issuer = JWT_ISSUER;
    if (JWT_AUDIENCE) options.audience = JWT_AUDIENCE;
  }

  return jwt.sign(payload, getJwtSecret(), options);
}

/**
 * Verify an access token and return decoded payload
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
export function verifyAccessToken(token) {
  const options = {};
  
  // Add issuer/audience verification if required
  if (REQUIRE_JWT_CLAIMS === '1') {
    if (JWT_ISSUER) options.issuer = JWT_ISSUER;
    if (JWT_AUDIENCE) options.audience = JWT_AUDIENCE;
  }

  try {
    return jwt.verify(token, getJwtSecret(), options);
  } catch (error) {
    logger.debug('Token verification failed', { error: error.message });
    throw error;
  }
}

/**
 * Generate a secure hash for refresh token storage
 * @param {string} rawToken - Raw refresh token string
 * @returns {string} SHA-256 hash of the token
 */
export function hashRefreshToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generate a new refresh token with rotation tracking
 * @param {Object} currentToken - Current refresh token document (if rotating)
 * @returns {Object} { rawToken, hashedToken, jti, rotationData }
 */
export function rotateRefreshToken(currentToken = null) {
  const rawToken = nanoid(32); // Generate secure random token
  const hashedToken = hashRefreshToken(rawToken);
  const jti = nanoid(16); // Session identifier
  
  const rotationData = {
    refreshTokenHash: hashedToken,
    rotatedAt: new Date(),
    rotatedFrom: currentToken?.jti || null
  };

  return {
    rawToken,
    hashedToken,
    jti,
    ...rotationData
  };
}

/**
 * Check if a refresh token is within the valid time window
 * @param {Date} createdAt - Token creation date
 * @param {number} windowDays - Valid window in days (default 7)
 * @returns {boolean} True if token is within valid window
 */
export function isWithinRefreshWindow(createdAt, windowDays = 7) {
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  return Date.now() - createdAt.getTime() < windowMs;
}