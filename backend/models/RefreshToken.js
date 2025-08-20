// backend/models/RefreshToken.js
import mongoose from "mongoose";

const RefreshTokenSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true }, // session id
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    replaceOf: { type: String, default: null }, // optional jti this replaces
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

RefreshTokenSchema.index({ user: 1, createdAt: -1 });
RefreshTokenSchema.index({ expiresAt: 1 });

const RefreshToken = mongoose.model("RefreshToken", RefreshTokenSchema);
export default RefreshToken;
