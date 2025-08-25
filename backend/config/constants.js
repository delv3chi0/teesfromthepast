/**
 * Central configuration constants (ESM).
 * Parsed once at startup. All sizes are MB unless noted.
 *
 * Environment variables:
 *   JSON_LIMIT_MB            -> Max JSON body size (default 25)
 *   PRINTFILE_MAX_MB         -> Custom logical max decoded size you want to accept (default 22)
 *   CLOUDINARY_IMAGE_MAX_MB  -> Known/assumed provider limit for single image uploads (default 10)
 *
 * Effective print file limit is the MIN of PRINTFILE_MAX_MB and CLOUDINARY_IMAGE_MAX_MB so we never
 * accept something locally that Cloudinary will later reject.
 */

function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const JSON_BODY_LIMIT_MB = parsePositiveInt(process.env.JSON_LIMIT_MB, 25);

// Your business logic max
export const MAX_PRINTFILE_DECODED_MB = parsePositiveInt(
  process.env.PRINTFILE_MAX_MB,
  22
);

// Provider (Cloudinary) practical limit (plan/upload-preset). Default 10MB based on your error.
// Adjust via CLOUDINARY_IMAGE_MAX_MB if your account changes (e.g., 25 or 50).
export const CLOUDINARY_MAX_IMAGE_MB = parsePositiveInt(
  process.env.CLOUDINARY_IMAGE_MAX_MB,
  10
);

// The enforced preflight max (smallest).
export const EFFECTIVE_PRINTFILE_LIMIT_MB = Math.min(
  MAX_PRINTFILE_DECODED_MB,
  CLOUDINARY_MAX_IMAGE_MB
);

// Warning threshold percentage for file size recommendations
export const PRINTFILE_WARNING_PCT = parsePositiveInt(
  process.env.PRINTFILE_WARNING_PCT,
  80
);

// Accepted MIME types for image uploads
export const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg", 
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/heic",
  "image/heif"
];

export const REQUEST_ID_HEADER = "X-Req-Id";

export const CONSTANTS = Object.freeze({
  JSON_BODY_LIMIT_MB,
  MAX_PRINTFILE_DECODED_MB,
  CLOUDINARY_MAX_IMAGE_MB,
  EFFECTIVE_PRINTFILE_LIMIT_MB,
  PRINTFILE_WARNING_PCT,
  ACCEPTED_IMAGE_MIME_TYPES,
  REQUEST_ID_HEADER
});
