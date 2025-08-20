// backend/models/AuditLog.js
import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // admin user
    action: { type: String, required: true },                    // e.g., ORDER_DELETE
    targetType: { type: String },                                // e.g., Order
    targetId: { type: String },                                  // target _id as string
    ip: { type: String },
    userAgent: { type: String },
    meta: { type: Object },
  },
  { timestamps: true }
);

// Useful indexes for filtering
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
