// backend/models/RefreshToken.js
import mongoose from "mongoose";

const RefreshTokenSchema = new mongoose.Schema(
  {
    jti: { type: String, index: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    // Token rotation and security
    tokenHash: { type: String, required: true, index: true }, // hashed refresh token
    rotationId: { type: String, index: true }, // tracks token families for rotation
    usedAt: { type: Date, default: null }, // when this token was used (for reuse detection)
    isRevoked: { type: Boolean, default: false, index: true }, // for quick revocation checks
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
  },
  { timestamps: true }
);

export default mongoose.models.RefreshToken ||
  mongoose.model("RefreshToken", RefreshTokenSchema);
