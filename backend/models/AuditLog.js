// backend/models/AuditLog.js
import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },        // e.g., LOGIN, LOGOUT, ORDER_CREATE, DESIGN_DELETE
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who did it
    targetType: { type: String },                    // User, Order, Design, Auth, Product
    targetId: { type: String },                      // string id (not necessarily ObjectId)
    ip: { type: String },
    userAgent: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },     // arbitrary additional info
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", AuditLogSchema);
