// backend/models/RefreshToken.js
import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true },        // token id
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ip: { type: String },
    userAgent: { type: String },
    replaceOf: { type: String },                                 // prior jti if rotated
    revokedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ user: 1, createdAt: -1 });
refreshTokenSchema.index({ jti: 1 }, { unique: true });
refreshTokenSchema.index({ expiresAt: 1 });
refreshTokenSchema.index({ revokedAt: 1 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
