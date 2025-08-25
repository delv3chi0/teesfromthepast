/**
 * Central configuration constants (ESM).
 * All values are exported as named exports.
 */

function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// JSON parsing body size limit (MB) for express.json()
export const JSON_BODY_LIMIT_MB = parsePositiveInt(process.env.JSON_LIMIT_MB, 25);

// Max decoded (raw) image size allowed for print file uploads (MB)
export const MAX_PRINTFILE_DECODED_MB = parsePositiveInt(
  process.env.PRINTFILE_MAX_MB,
  22
);

// Standard request ID header
export const REQUEST_ID_HEADER = "X-Req-Id";

// Convenience aggregate (optional usage)
export const CONSTANTS = Object.freeze({
  JSON_BODY_LIMIT_MB,
  MAX_PRINTFILE_DECODED_MB,
  REQUEST_ID_HEADER
});
