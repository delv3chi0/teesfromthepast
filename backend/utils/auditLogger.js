// backend/utils/auditLogger.js
import AuditLog from "../models/AuditLog.js";
import logger from "./logger.js";

export const logAudit = async ({ user, action, details, req }) => {
  try {
    await AuditLog.create({
      user: user?._id,
      action,
      details,
      ip: req?.ip || "unknown",
      userAgent: req?.headers["user-agent"] || "unknown",
    });
    
    // Log with request correlation if available
    const log = req?.log || logger;
    log.info("audit.logged", {
      action,
      userId: user?._id,
      details: typeof details === 'object' ? details : { message: details }
    });
  } catch (err) {
    const log = req?.log || logger;
    log.error("audit.failed", { 
      error: err.message,
      action,
      userId: user?._id
    });
  }
};
