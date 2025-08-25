// backend/models/RefreshToken.js
import mongoose from "mongoose";

const RefreshTokenSchema = new mongoose.Schema(
  {
    jti: { type: String, index: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    // client hints / telemetry (filled progressively)
    client: {
      tz: String,
      lang: String,
      viewport: String,
      platform: String,
      ua: String,
      localTime: String,
      deviceMemory: String,
      cpuCores: String,
    },
    // session lifecycle
    expiresAt: { type: Date, index: true },
    revokedAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: null }, // updated on authenticated requests
    
    // NEW: Token rotation and security fields
    refreshTokenHash: { type: String, index: true }, // SHA-256 hash of the raw refresh token
    rotatedAt: { type: Date, default: null }, // When this token was rotated/created
    rotatedFrom: { type: String, default: null }, // JTI of the previous token (rotation chain)
    compromisedAt: { type: Date, default: null }, // When token was marked as compromised due to reuse
  },
  { timestamps: true }
);

export default mongoose.models.RefreshToken ||
  mongoose.model("RefreshToken", RefreshTokenSchema);
