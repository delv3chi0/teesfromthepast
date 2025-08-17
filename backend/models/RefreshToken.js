// backend/models/RefreshToken.js
import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jti: { type: String, required: true, unique: true, index: true }, // token id
    tokenHash: { type: String, required: true }, // sha256(refreshToken)
    userAgent: { type: String },
    ip: { type: String },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date },
    replaceOf: { type: String }, // previous jti (for rotation)
  },
  { timestamps: true }
);

refreshTokenSchema.index({ user: 1, createdAt: -1 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
