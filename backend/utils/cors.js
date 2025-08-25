// backend/utils/cors.js
import cors from "cors";
import logger from './logger.js';

/**
 * Default always-allowed origins.
 * Extend via CORS_ORIGINS=comma,separated,list
 */
const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://teesfromthepast.vercel.app",
];

// Optional regex patterns for preview domains (tighten if desired)
const REGEX_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.teesfromthepast\.vercel\.app$/i, // future preview subdomains
];

function normalizeOrigins(list) {
  return list
    .map(o => o.trim())
    .filter(Boolean)
    .map(o => (o.endsWith("/") ? o.slice(0, -1) : o));
}

function buildOriginChecker() {
  const extra = normalizeOrigins((process.env.CORS_ORIGINS || "").split(","));
  const base = normalizeOrigins(DEFAULT_ORIGINS);
  const allowAll = /^true$/i.test(process.env.CORS_ALLOW_ALL || "");
  const origins = [...new Set([...base, ...extra])];

  function isAllowed(origin) {
    if (!origin) return true; // Non-browser (no Origin header)
    if (allowAll) return true;
    const o = origin.endsWith("/") ? origin.slice(0, -1) : origin;
    if (origins.includes(o)) return true;
    if (REGEX_PATTERNS.some(rx => rx.test(o))) return true;
    return false;
  }

  return { isAllowed, allowAll, origins };
}

export function buildCors() {
  const { isAllowed } = buildOriginChecker();
  return cors({
    origin: (origin, cb) => {
      if (isAllowed(origin)) return cb(null, true);
      return cb(new Error(`CORS: Origin not allowed: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "X-Session-Id",
      "x-session-id",
      "X-CSRF-Token",
      "x-csrf-token",
      "X-Client-Info",
      "x-client-info",
    ],
    exposedHeaders: ["Content-Length"],
    maxAge: 86400,
    optionsSuccessStatus: 204,
  });
}

/**
 * Apply CORS early and provide an explicit OPTIONS handler to satisfy
 * proxies/CDNs that expect a route-level response.
 */
export function applyCors(app) {
  const middleware = buildCors();
  app.use(middleware);
  app.options("*", middleware, (_req, res) => res.sendStatus(204));
}

/**
 * Helper to log resolved origins (for diagnostics).
 * Does NOT reveal secrets.
 */
export function logCorsConfig() {
  const { origins, allowAll } = buildOriginChecker();
  if (allowAll) {
    logger.info("[CORS] ALL origins temporarily allowed (CORS_ALLOW_ALL=true).");
  } else {
    logger.info({ origins }, "[CORS] Allowed origins configured");
  }
}

export default buildCors;
