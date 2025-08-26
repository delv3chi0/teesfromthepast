// backend/utils/auditLogger.js
import AuditLog from "../models/AuditLog.js";
import { pushAuditEntry } from "../config/dynamicConfig.js";

export const logAudit = async ({ user, action, details, req }) => {
  try {
    // Create the audit log entry in database
    const auditEntry = await AuditLog.create({
      user: user?._id,
      action,
      details,
      ip: req?.ip || "unknown",
      userAgent: req?.headers["user-agent"] || "unknown",
    });

    // Also push to in-memory ring buffer for dynamic admin console
    const ringBufferEntry = {
      id: auditEntry._id?.toString(),
      timestamp: auditEntry.createdAt?.toISOString() || new Date().toISOString(),
      category: action.includes('_') ? action.split('_')[0] : 'general',
      action,
      message: `${action}: ${details || 'No details'}`,
      actor: user ? {
        id: user._id?.toString(),
        username: user.username,
        email: user.email,
      } : null,
      target: {
        id: auditEntry._id?.toString(),
        type: 'audit_log'
      },
      metadata: {
        ip: req?.ip || "unknown",
        userAgent: req?.headers["user-agent"] || "unknown",
        requestId: req?.id,
      }
    };

    pushAuditEntry(ringBufferEntry);
  } catch (err) {
    console.error("Failed to log audit:", err.message);
  }
};
