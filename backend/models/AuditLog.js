// backend/models/AuditLog.js
import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // admin user id
    action: { type: String, required: true, index: true },                    // e.g. USER_DELETE
    targetType: { type: String, index: true },                                 // e.g. User, Order, Design, Product
    targetId: { type: String, index: true },                                   // usually ObjectId as string
    ip: { type: String },
    userAgent: { type: String },
    meta: { type: Object },                                                    // arbitrary JSON details
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
