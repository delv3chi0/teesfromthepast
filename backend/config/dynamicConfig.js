/**
 * In-memory dynamic runtime configuration & operational state.
 * Ephemeral: NOT persisted. Reset on process restart or redeploy.
 *
 * Domains:
 *  - rateLimit: algorithm, globalMax, windowMs, overrides (path + role)
 *  - security: cspReportOnly, enableCOEP
 *  - tracing: recent request IDs ring buffer + requestIdHeader
 *  - audit: ring buffer of recent audit events
 *  - metrics: enabled (read-only reflection of startup state)
 *  - version: commit + buildTime (set at startup)
 */
const DEFAULT_RATE_LIMIT = {
  algorithm: "fixed",          // "fixed" | "sliding" | "token_bucket"
  globalMax: 1000,
  windowMs: 60_000,
  overrides: [],               // [{ pathPrefix, max, algorithm? }]
  roleOverrides: []            // [{ role, pathPrefix?, max, algorithm? }]
};

const ALGORITHMS = new Set(["fixed", "sliding", "token_bucket"]);

const tracingState = {
  requestIdHeader: "x-request-id",
  bufferSize: 200,
  _buffer: []
};

function pushRequestId(id) {
  if (!id) return;
  const buf = tracingState._buffer;
  buf.unshift({ id, ts: Date.now() });
  if (buf.length > tracingState.bufferSize) buf.pop();
}

const auditState = {
  size: parseInt(process.env.AUDIT_RING_SIZE || "500", 10),
  _ring: []
};

function pushAuditLog(entry) {
  if (!entry || typeof entry !== "object") return;
  const normalized = {
    timestamp: entry.timestamp || new Date().toISOString(),
    category: entry.category || "general",
    message: entry.message || "",
    meta: entry.meta && typeof entry.meta === "object" ? entry.meta : {},
    actor: entry.actor || "system",
    level: entry.level || "info"
  };
  auditState._ring.push(normalized);
  if (auditState._ring.length > auditState.size) auditState._ring.shift();
}

let rateLimitConfig = { ...DEFAULT_RATE_LIMIT };
let securityConfig = {
  cspReportOnly: (process.env.CSP_REPORT_ONLY || "true").toLowerCase() !== "false",
  enableCOEP: (process.env.ENABLE_COEP || "false").toLowerCase() === "true"
};

const metricsConfig = {
  enabled: (process.env.METRICS_ENABLED || "true").toLowerCase() === "true"
};

const versionInfo = { commit: null, buildTime: null };

export function setVersionInfo({ commit, buildTime }) {
  if (commit) versionInfo.commit = commit;
  if (buildTime) versionInfo.buildTime = buildTime;
}
export function getVersionInfo() { return { ...versionInfo }; }

export function getRuntimeSnapshot() {
  return {
    rateLimit: rateLimitConfig,
    security: securityConfig,
    tracing: { requestIdHeader: tracingState.requestIdHeader, recent: tracingState._buffer.slice(0, 50) },
    audit: { size: auditState.size, recentCount: auditState._ring.length },
    metrics: { enabled: metricsConfig.enabled },
    version: getVersionInfo(),
    ephemeral: true
  };
}

export function resolveRateLimit(path, roles = []) {
  for (const roleOverride of rateLimitConfig.roleOverrides) {
    if (roles.includes(roleOverride.role) && (!roleOverride.pathPrefix || path.startsWith(roleOverride.pathPrefix))) {
      return { algorithm: roleOverride.algorithm || rateLimitConfig.algorithm, max: roleOverride.max, windowMs: rateLimitConfig.windowMs, source: "roleOverride" };
    }
  }
  for (const o of rateLimitConfig.overrides) {
    if (path.startsWith(o.pathPrefix)) {
      return { algorithm: o.algorithm || rateLimitConfig.algorithm, max: o.max, windowMs: rateLimitConfig.windowMs, source: "pathOverride" };
    }
  }
  return { algorithm: rateLimitConfig.algorithm, max: rateLimitConfig.globalMax, windowMs: rateLimitConfig.windowMs, source: "global" };
}

export function updateRateLimitConfig(payload) {
  const errors = [];
  const next = { ...rateLimitConfig };
  if (payload.algorithm !== undefined) {
    if (!ALGORITHMS.has(payload.algorithm)) errors.push("algorithm must be one of fixed|sliding|token_bucket"); else next.algorithm = payload.algorithm;
  }
  if (payload.globalMax !== undefined) {
    if (!Number.isInteger(payload.globalMax) || payload.globalMax <= 0) errors.push("globalMax must be positive integer"); else next.globalMax = payload.globalMax;
  }
  if (payload.windowMs !== undefined) {
    if (!Number.isInteger(payload.windowMs) || payload.windowMs <= 0) errors.push("windowMs must be positive integer"); else next.windowMs = payload.windowMs;
  }
  if (payload.overrides !== undefined) {
    if (!Array.isArray(payload.overrides)) errors.push("overrides must be array"); else {
      const list = [];
      for (const item of payload.overrides) {
        if (!item || typeof item.pathPrefix !== "string" || !item.pathPrefix) { errors.push("override.pathPrefix required"); continue; }
        if (!Number.isInteger(item.max) || item.max <= 0) { errors.push(`override.max must be positive integer for ${item.pathPrefix}`); continue; }
        if (item.algorithm && !ALGORITHMS.has(item.algorithm)) { errors.push(`override.algorithm invalid for ${item.pathPrefix}`); continue; }
        list.push({ pathPrefix: item.pathPrefix, max: item.max, algorithm: item.algorithm });
      }
      if (!errors.length) next.overrides = list;
    }
  }
  if (payload.roleOverrides !== undefined) {
    if (!Array.isArray(payload.roleOverrides)) errors.push("roleOverrides must be array"); else {
      const list = [];
      for (const ro of payload.roleOverrides) {
        if (!ro || typeof ro.role !== "string" || !ro.role) { errors.push("roleOverride.role required"); continue; }
        if (!Number.isInteger(ro.max) || ro.max <= 0) { errors.push(`roleOverride.max must be positive integer for role ${ro.role}`); continue; }
        if (ro.algorithm && !ALGORITHMS.has(ro.algorithm)) { errors.push(`roleOverride.algorithm invalid for role ${ro.role}`); continue; }
        if (ro.pathPrefix && typeof ro.pathPrefix !== "string") { errors.push(`roleOverride.pathPrefix must be string for role ${ro.role}`); continue; }
        list.push({ role: ro.role, pathPrefix: ro.pathPrefix, max: ro.max, algorithm: ro.algorithm });
      }
      if (!errors.length) next.roleOverrides = list;
    }
  }
  if (errors.length) return { ok: false, errors };
  rateLimitConfig = next;
  pushAuditLog({ category: "rateLimit", message: "Rate limit config updated", meta: { rateLimitConfig: next } });
  return { ok: true, config: rateLimitConfig };
}
export function getRateLimitConfig() { return rateLimitConfig; }

export function updateSecurityConfig(payload) {
  const errors = [];
  const next = { ...securityConfig };
  ["cspReportOnly", "enableCOEP"].forEach(k => { if (payload[k] !== undefined) { if (typeof payload[k] !== "boolean") errors.push(`${k} must be boolean`); else next[k] = payload[k]; } });
  if (errors.length) return { ok: false, errors };
  securityConfig = next;
  pushAuditLog({ category: "security", message: "Security config updated", meta: { securityConfig: next } });
  return { ok: true, config: securityConfig };
}
export function getSecurityConfig() { return securityConfig; }
export function setRequestIdHeader(name) { if (typeof name === "string" && name) tracingState.requestIdHeader = name.toLowerCase(); }
export function pushTracingRequestId(id) { pushRequestId(id); }
export function listAuditCategories() { return Array.from(new Set(auditState._ring.map(e => e.category))).sort(); }
export function queryAuditLogs({ category, q, limit = 100, since }) {
  let items = auditState._ring.slice().reverse();
  if (category) items = items.filter(e => e.category === category);
  if (q) { const needle = q.toLowerCase(); items = items.filter(e => e.message.toLowerCase().includes(needle) || JSON.stringify(e.meta).toLowerCase().includes(needle)); }
  if (since) { const sinceTs = Date.parse(since); if (!Number.isNaN(sinceTs)) items = items.filter(e => Date.parse(e.timestamp) >= sinceTs); }
  limit = Math.min(Math.max(1, limit), 500); return items.slice(0, limit);
}
export { pushAuditLog, ALGORITHMS };