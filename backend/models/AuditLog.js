// backend/models/AuditLog.js
import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    // Who/what
    action: { type: String, required: true, index: true },      // e.g., LOGIN, LOGOUT, ORDER_CREATE
    actionLabel: { type: String, default: "" },                  // pretty label for UI (optional)
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    actorDisplay: { type: String, default: "" },                 // fallback text when actor not populated

    // Target of the action
    targetType: { type: String, default: "", index: true },      // "User", "Order", "Design", "Auth", ...
    targetId: { type: String, default: "", index: true },        // may be non-ObjectId (string)

    // Network / request context
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    method: { type: String, default: "" },
    url: { type: String, default: "" },
    origin: { type: String, default: "" },
    referrer: { type: String, default: "" },

    // Session correlation
    sessionJti: { type: String, default: "" },

    // Arbitrary structured blobs
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },     // app-specific info
    client: { type: mongoose.Schema.Types.Mixed, default: {} },   // client fingerprint info sent from frontend
  },
  { timestamps: true }
);

// Helpful compound index
AuditLogSchema.index({ createdAt: -1, action: 1, targetType: 1 });

export default mongoose.models.AuditLog ||
  mongoose.model("AuditLog", AuditLogSchema);
