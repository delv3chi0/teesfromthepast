// backend/models/AuditLog.js
import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    // Who performed the action (nullable for system events)
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // High-level action code, e.g. LOGIN, LOGOUT, USER_UPDATE, ORDER_STATUS_UPDATE, etc.
    action: { type: String, required: true, trim: true, uppercase: true },

    // Target (optional): what object the action touched
    targetType: { type: String, default: null, trim: true },
    targetId: { type: String, default: null, trim: true },

    // Freeform metadata you want to keep
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Request context
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
