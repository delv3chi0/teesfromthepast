// backend/models/Throttle.js
import mongoose from "mongoose";

const ThrottleSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["ip", "email"], required: true, index: true },
    key: { type: String, required: true, index: true }, // ip or email (lowercase)
    fails: { type: Number, default: 0 },
    windowStart: { type: Date, default: () => new Date() },
    lockedUntil: { type: Date, default: null, index: true },
    lastSeen: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);
ThrottleSchema.index({ kind: 1, key: 1 }, { unique: true });

export default (mongoose.models.Throttle || mongoose.model("Throttle", ThrottleSchema));
