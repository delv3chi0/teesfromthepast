import mongoose from "mongoose";

/**
 * Rich audit schema:
 * - action: short verb ("LOGIN", "ORDER_DELETE", etc.)
 * - actor: ObjectId of User (nullable if anonymous)
 * - actorDisplay: cached text fallback for when actor doc isn't populated
 * - targetType/targetId: the object this action touched
 * - ip/userAgent: network + UA
 * - url/method/referrer/origin: request context
 * - sessionJti: ties an entry to a session (RefreshToken.jti) when available
 * - client: optional browser-collected info (locale, tz, screen, platform, etc.)
 * - meta: freeform extra data
 */
const AuditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true },

    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, default: null },
    actorDisplay: { type: String, default: "" }, // fallback if user doc isn't available

    targetType: { type: String, index: true, default: "" },
    targetId:   { type: String, index: true, default: "" },

    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },

    method: { type: String, default: "" },
    url: { type: String, default: "" },
    referrer: { type: String, default: "" },
    origin: { type: String, default: "" },

    sessionJti: { type: String, index: true, default: "" },

    client: {
      locale: { type: String, default: "" },
      timezone: { type: String, default: "" },
      platform: { type: String, default: "" },
      vendor: { type: String, default: "" },
      screen: {
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
        pixelRatio: { type: Number, default: 0 },
      },
      // room for Client Hints or anything else
      hints: { type: mongoose.Schema.Types.Mixed, default: {} },
    },

    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Helpful compound indexes
AuditLogSchema.index({ createdAt: -1, action: 1, targetType: 1 });
AuditLogSchema.index({ createdAt: -1, actor: 1 });

export default mongoose.models.AuditLog ||
  mongoose.model("AuditLog", AuditLogSchema);
