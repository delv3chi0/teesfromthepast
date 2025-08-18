// backend/middleware/csrfStrict.js
import crypto from "crypto";

const SECRET_COOKIE = process.env.CSRF_SECRET_COOKIE || "XSRF-SECRET"; // HttpOnly secret
const TOKEN_COOKIE  = process.env.CSRF_TOKEN_COOKIE  || "XSRF-TOKEN";  // readable helper token
const TTL_MS        = Number(process.env.CSRF_TTL_MS || 6 * 60 * 60 * 1000); // 6h
const SAME_SITE     = "none"; // cross-site (Vercel -> Render)
const SECURE        = true;   // required with SameSite=None

// Exemptions (no CSRF checking here)
const EXEMPT_PREFIXES = ["/api/stripe", "/health", "/api/csrf"];
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// ---- helpers ----
function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromB64url(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}
function timingSafeEq(a, b) {
  const ab = Buffer.isBuffer(a) ? a : Buffer.from(String(a));
  const bb = Buffer.isBuffer(b) ? b : Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function ensureSecretCookie(req, res) {
  let secretHex = req.cookies?.[SECRET_COOKIE];
  if (!secretHex) {
    secretHex = crypto.randomBytes(32).toString("hex");
    res.cookie(SECRET_COOKIE, secretHex, {
      httpOnly: true,  // NOT readable by JS
      secure: SECURE,
      sameSite: SAME_SITE,
      path: "/",
      maxAge: TTL_MS,
    });
  }
  return Buffer.from(secretHex, "hex");
}

// token = base64url(HMAC(secret, nonce)) + "." + base64url(nonce)
// nonce = 8-byte timestamp(ms) || 16 random bytes
function mintToken(secretBuf) {
  const tsBuf = Buffer.allocUnsafe(8);
  tsBuf.writeBigInt64BE(BigInt(Date.now()));
  const rnd = crypto.randomBytes(16);
  const nonce = Buffer.concat([tsBuf, rnd]);
  const sig = crypto.createHmac("sha256", secretBuf).update(nonce).digest();
  return `${b64url(sig)}.${b64url(nonce)}`;
}

function parseTokenAndVerify(secretBuf, token) {
  if (!token || typeof token !== "string") return { ok: false, reason: "missing" };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "format" };
  const sig = fromB64url(parts[0]);
  const nonce = fromB64url(parts[1]);
  if (nonce.length < 8) return { ok: false, reason: "nonce" };

  const expect = crypto.createHmac("sha256", secretBuf).update(nonce).digest();
  if (!timingSafeEq(sig, expect)) return { ok: false, reason: "sig" };

  const ts = Number(nonce.readBigInt64BE(0));
  if (!Number.isFinite(ts)) return { ok: false, reason: "ts" };
  if (Date.now() - ts > TTL_MS) return { ok: false, reason: "expired" };

  return { ok: true };
}

function needsCheck(req) {
  if (SAFE_METHODS.has((req.method || "GET").toUpperCase())) return false;
  const p = req.path || req.originalUrl || "";
  return !EXEMPT_PREFIXES.some((pre) => p.startsWith(pre));
}

// GET /api/csrf => { csrfToken }
export function csrfTokenRoute(req, res) {
  const secret = ensureSecretCookie(req, res);
  const token = mintToken(secret);

  // Optional readable cookie (helps some frameworks/tools)
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: false,
    secure: SECURE,
    sameSite: SAME_SITE,
    path: "/",
    maxAge: TTL_MS,
  });

  return res.status(200).json({ csrfToken: token });
}

// Enforce on unsafe, non-exempt routes
export function csrfStrict(req, res, next) {
  const secret = ensureSecretCookie(req, res);

  if (!needsCheck(req)) return next();

  const headerToken =
    req.get("x-csrf-token") ||
    req.get("X-CSRF-Token") ||
    req.get("csrf-token") ||
    req.cookies?.[TOKEN_COOKIE];

  const { ok } = parseTokenAndVerify(secret, headerToken);
  if (!ok) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }
  return next();
}
