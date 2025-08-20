// backend/utils/auditLogger.js
import AuditLog from "../models/AuditLog.js";

export const logAudit = async ({ user, action, details, req }) => {
  try {
    await AuditLog.create({
      user: user?._id,
      action,
      details,
      ip: req?.ip || "unknown",
      userAgent: req?.headers["user-agent"] || "unknown",
    });
  } catch (err) {
    console.error("Failed to log audit:", err.message);
  }
};
