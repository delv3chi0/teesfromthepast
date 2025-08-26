// backend/utils/audit.js
import mongoose from "mongoose";

let AuditLog;
try {
  AuditLog = mongoose.model("AuditLog");
} catch {
  const AuditLogSchema = new mongoose.Schema(
    {
      action: { type: String, required: true, index: true },
      actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
      actorDisplay: { type: String, default: "" },
      targetType: { type: String, default: "", index: true },
      targetId: { type: String, default: "", index: true },
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
      meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
  );
  AuditLogSchema.index({ createdAt: -1, action: 1, targetType: 1 });
  AuditLog = mongoose.model("AuditLog", AuditLogSchema);
}

// Ring buffer for recent audit entries (for UI display)
const RING_BUFFER_SIZE = parseInt(process.env.AUDIT_RING_BUFFER_SIZE || '500', 10);
const recentAuditLogs = [];

// Add entry to ring buffer
function addToRingBuffer(entry) {
  recentAuditLogs.unshift(entry);
  if (recentAuditLogs.length > RING_BUFFER_SIZE) {
    recentAuditLogs.splice(RING_BUFFER_SIZE);
  }
}

export async function logAudit(
  req,
  { action, targetType = "", targetId = "", meta = {}, actor = null }
) {
  try {
    const ip = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || req.ip || "";
    const userAgent = req.headers["user-agent"] || "";
    const actorId = actor || req.user?._id || null;

    // Auto-capture current session id if present:
    const sid = req.headers["x-session-id"];
    const mergedMeta = { ...meta };
    if (sid && !mergedMeta.sessionId) mergedMeta.sessionId = String(sid);

    const auditEntry = {
      action,
      actor: actorId,
      targetType,
      targetId: String(targetId || ""),
      ip,
      userAgent,
      meta: mergedMeta,
      createdAt: new Date(),
    };

    // Add to ring buffer for UI access
    addToRingBuffer(auditEntry);

    // Persist to database
    await AuditLog.create(auditEntry);
  } catch (err) {
    console.warn("[audit] failed:", err?.message);
  }
}

export async function logAdminAction(req, payload) {
  return logAudit(req, payload);
}
export async function logAuthLogin(req, user, meta = {}) {
  return logAudit(req, { action: "LOGIN", targetType: "Auth", targetId: user?._id, meta, actor: user?._id });
}
export async function logAuthLogout(req, user, meta = {}) {
  return logAudit(req, { action: "LOGOUT", targetType: "Auth", targetId: user?._id, meta, actor: user?._id });
}

/**
 * Get recent audit logs from ring buffer with optional filtering
 */
export function getRecentAuditLogs({ category, search, limit = 100, since } = {}) {
  let filtered = [...recentAuditLogs];

  // Filter by category (action)
  if (category) {
    filtered = filtered.filter(log => log.action === category);
  }

  // Filter by search term (basic text search)
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(log => {
      const searchableText = [
        log.action,
        log.targetType,
        log.targetId,
        log.ip,
        log.userAgent,
        JSON.stringify(log.meta)
      ].join(' ').toLowerCase();
      
      return searchableText.includes(searchLower);
    });
  }

  // Filter by date
  if (since) {
    const sinceTime = new Date(since).getTime();
    filtered = filtered.filter(log => new Date(log.createdAt).getTime() >= sinceTime);
  }

  // Apply limit
  return filtered.slice(0, limit);
}

/**
 * Get unique audit categories from recent logs
 */
export function getAuditCategories() {
  const categories = new Set();
  
  recentAuditLogs.forEach(log => {
    if (log.action) {
      categories.add(log.action);
    }
  });

  return Array.from(categories).sort();
}

/**
 * Get ring buffer stats (for debugging)
 */
export function getAuditRingBufferStats() {
  return {
    size: recentAuditLogs.length,
    maxSize: RING_BUFFER_SIZE,
    oldestEntry: recentAuditLogs.length > 0 ? recentAuditLogs[recentAuditLogs.length - 1].createdAt : null,
    newestEntry: recentAuditLogs.length > 0 ? recentAuditLogs[0].createdAt : null
  };
}
