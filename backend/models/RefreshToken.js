// backend/models/RefreshToken.js
import mongoose from "mongoose";

const RefreshTokenSchema = new mongoose.Schema(
  {
    jti: { type: String, index: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    // Hash of the refresh token for secure storage (never store plain token)
    refreshTokenHash: { type: String, required: true, index: true },
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
    // Token rotation tracking
    rotatedAt: { type: Date, default: null },
    rotatedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "RefreshToken", default: null },
    // Security compromise tracking
    compromisedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.RefreshToken ||
  mongoose.model("RefreshToken", RefreshTokenSchema);
