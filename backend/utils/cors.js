// backend/utils/cors.js
import cors from "cors";

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://teesfromthepast.vercel.app",
];

export function buildCors() {
  const allowlist = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const origins = [...new Set([...DEFAULT_ORIGINS, ...allowlist])];

  return cors({
    origin: (origin, cb) => {
      // Allow non-browser tools (no Origin header) and allowlisted origins
      if (!origin || origins.includes(origin)) return cb(null, true);
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
    ],
    exposedHeaders: ["Content-Length"],
    maxAge: 86400,
  });
}
