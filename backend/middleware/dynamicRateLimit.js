/**
 * Dynamic rate limiting middleware using resolveRateLimit().
 * Algorithms: fixed, sliding (timestamp queue), token_bucket (refill each request).
 * In-memory only (single-instance). Replace with distributed store for scaling.
 */
import { resolveRateLimit } from "../config/dynamicConfig.js";

const stores = new Map();

function keyFrom(req) {
  const ip = req.ip || req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || req.connection?.remoteAddress || "unknown";
  return ip;
}

export function dynamicRateLimit(req, res, next) {
  const roles = (req.user && (req.user.roles || [])) || [];
  const rule = resolveRateLimit(req.path, roles);
  const k = `${rule.algorithm}:${rule.windowMs}:${rule.max}:${keyFrom(req)}`;
  const now = Date.now();
  let state = stores.get(k);
  if (!state) {
    state = rule.algorithm === "token_bucket" ? { tokens: rule.max, lastRefill: now } : { windowStart: now, count: 0 };
    stores.set(k, state);
  }
  let allowed = true; let remaining; let resetSec;
  if (rule.algorithm === "fixed") {
    if (now - state.windowStart >= rule.windowMs) { state.windowStart = now; state.count = 0; }
    state.count += 1; allowed = state.count <= rule.max; remaining = Math.max(0, rule.max - state.count); resetSec = Math.floor((state.windowStart + rule.windowMs)/1000);
  } else if (rule.algorithm === "sliding") {
    if (!state.timestamps) state.timestamps = [];
    state.timestamps = state.timestamps.filter(ts => now - ts < rule.windowMs);
    state.timestamps.push(now);
    allowed = state.timestamps.length <= rule.max;
    remaining = Math.max(0, rule.max - state.timestamps.length);
    resetSec = Math.floor((now + rule.windowMs)/1000);
  } else { // token_bucket
    const refillRate = rule.max / (rule.windowMs / 1000);
    const elapsed = (now - state.lastRefill)/1000;
    const refillTokens = elapsed * refillRate;
    state.tokens = Math.min(rule.max, state.tokens + refillTokens);
    state.lastRefill = now;
    if (state.tokens >= 1) { state.tokens -= 1; allowed = true; } else { allowed = false; }
    remaining = Math.floor(state.tokens);
    resetSec = Math.floor((now + (1/refillRate)*1000)/1000);
  }
  res.setHeader("X-RateLimit-Limit", rule.max);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", resetSec);
  res.setHeader("X-RateLimit-Algorithm", rule.algorithm);
  res.setHeader("X-RateLimit-Source", rule.source);
  if (!allowed) return res.status(429).json({ ok: false, error: { code: "RATE_LIMITED", message: "Too many requests" } });
  next();
}
export default dynamicRateLimit;