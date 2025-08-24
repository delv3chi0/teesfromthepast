// backend/models/AuditLog.js
import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    // Who/what
    action: { type: String, required: true, index: true },      // e.g., LOGIN, LOGOUT
    actionLabel: { type: String, default: "" },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    actorDisplay: { type: String, default: "" },

    // Target of the action
    targetType: { type: String, default: "", index: true },
    targetId: { type: String, default: "", index: true },

    // Network / request context
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    method: { type: String, default: "" },
    url: { type: String, default: "" },
    origin: { type: String, default: "" },
    referrer: { type: String, default: "" },

    // Session correlation
    sessionJti: { type: String, default: "", index: true },

    // Arbitrary structured blobs
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    client: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Helpful indexes
AuditLogSchema.index({ createdAt: -1, action: 1, targetType: 1 });
AuditLogSchema.index({ actorDisplay: 1 });
AuditLogSchema.index({ "meta.sessionId": 1 }); // works even with Mixed
AuditLogSchema.index({ "meta.sid": 1 });
AuditLogSchema.index({ "meta.session": 1 });

export default mongoose.models.AuditLog ||
  mongoose.model("AuditLog", AuditLogSchema);
