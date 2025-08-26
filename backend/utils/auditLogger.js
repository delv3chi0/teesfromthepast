// backend/utils/auditLogger.js
import AuditLog from "../models/AuditLog.js";
import { pushAuditLog } from "../config/dynamicConfig.js";

export const logAudit = async ({ user, action, details, req }) => {
  try {
    // Create audit log in database
    await AuditLog.create({
      user: user?._id,
      action,
      details,
      ip: req?.ip || "unknown",
      userAgent: req?.headers["user-agent"] || "unknown",
    });
    
    // Also push to dynamic config ring buffer for real-time access
    pushAuditLog({
      category: action || 'general',
      message: `${action}: ${details || 'No details provided'}`,
      meta: {
        userId: user?._id,
        userEmail: user?.email,
        userUsername: user?.username,
        details,
        ip: req?.ip || "unknown",
        userAgent: req?.headers["user-agent"] || "unknown",
        path: req?.path,
        method: req?.method
      },
      actor: {
        id: user?._id,
        email: user?.email,
        username: user?.username,
        displayName: user?.username || user?.email || 'Unknown'
      },
      level: 'info'
    });
  } catch (err) {
    console.error("Failed to log audit:", err.message);
    
    // Still try to push to ring buffer even if database fails
    try {
      pushAuditLog({
        category: 'error',
        message: `Failed to log audit for action: ${action}`,
        meta: { originalError: err.message, action, details },
        actor: { id: user?._id, username: user?.username || 'Unknown' },
        level: 'error'
      });
    } catch (ringBufferErr) {
      console.error("Failed to log to ring buffer:", ringBufferErr.message);
    }
  }
};
