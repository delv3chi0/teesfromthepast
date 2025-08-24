// backend/models/PasswordResetToken.js
import mongoose from "mongoose";

/**
 * Single-use, time-limited password reset token
 * Stores only a SHA-256 hash of the token (never the raw token).
 */
const PasswordResetTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    tokenHash: { type: String, unique: true, required: true, index: true },
    // when the token expires (Mongo TTL index removes docs at/after this time)
    expiresAt: { type: Date, required: true, index: true },
    // once used, we mark it to prevent reuse
    usedAt: { type: Date, default: null },

    // optional context for auditing/forensics
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

// TTL index for automatic cleanup at expiresAt time
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PasswordResetToken ||
  mongoose.model("PasswordResetToken", PasswordResetTokenSchema);
