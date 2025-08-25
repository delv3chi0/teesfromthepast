// Enhanced CORS utility
import cors from "cors";

/**
 * Default origins always allowed.
 * Add more via CORS_ORIGINS env (comma separated).
 */
const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://teesfromthepast.vercel.app",
];

// Allow preview *.vercel.app or other patterns if needed
const REGEX_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.teesfromthepast\.vercel\.app$/i, // future preview subdomains
  /^https:\/\/.+\.vercel\.app$/i, // generic vercel preview (optional; tighten if desired)
];

function normalize(list) {
  return list
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      // Remove trailing slash for consistent matching
      if (s.endsWith("/")) return s.slice(0, -1);
      return s;
    });
}

/**
 * Build CORS middleware. We keep credentials true so cookies (if any) or
 * Authorization headers can be sent cross-site.
 */
export function buildCors() {
  const extra = normalize((process.env.CORS_ORIGINS || "").split(","));
  const origins = [...new Set([...normalize(DEFAULT_ORIGINS), ...extra])];

  const allowAllFlag = /^true$/i.test(process.env.CORS_ALLOW_ALL || "");

  return cors({
    origin: (origin, cb) => {
      // Non-browser requests (no Origin) are allowed
      if (!origin) return cb(null, true);

      // Normalize incoming origin (strip trailing slash)
      const o = origin.endsWith("/") ? origin.slice(0, -1) : origin;

      if (allowAllFlag) return cb(null, true);

      if (origins.includes(o)) return cb(null, true);

      // Pattern match
      if (REGEX_PATTERNS.some(rx => rx.test(o))) return cb(null, true);

      // Deny
      return cb(new Error(`CORS: Origin not allowed: ${o}`));
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
    exposedHeaders: [
      "Content-Length",
      // Add custom exposed headers here if needed
    ],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
}

/**
 * Helper to apply CORS early plus a safety fallback to ensure OPTIONS
 * always returns quickly even if no route matches.
 */
export function applyCors(app) {
  const middleware = buildCors();
  app.use(middleware);

  // Explicit OPTIONS handler (some proxies behave better with this)
  app.options("*", middleware, (req, res) => {
    res.sendStatus(204);
  });
}

export default buildCors;
