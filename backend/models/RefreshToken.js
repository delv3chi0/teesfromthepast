// backend/models/RefreshToken.js
import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ip: { type: String },
    userAgent: { type: String },
    replaceOf: { type: String }, // previous jti (rotation)
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date },   // when device/session revoked
  },
  { timestamps: true }
);

export default mongoose.model('RefreshToken', refreshTokenSchema);
