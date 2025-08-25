/**
 * Central configuration & constants.
 * All exports are named (ESM) so they can be imported with:
 *   import { JSON_BODY_LIMIT_MB, MAX_PRINTFILE_DECODED_MB } from '../config/constants.js';
 */

function parsePositiveInt(val, fallback) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// JSON body size limit (MB) for express.json()
// Default 25MB unless overridden via environment variable JSON_LIMIT_MB
export const JSON_BODY_LIMIT_MB = parsePositiveInt(process.env.JSON_LIMIT_MB, 25);

// Maximum decoded (raw) print file size in MB.
// Default 22MB unless overridden via PRINTFILE_MAX_MB
export const MAX_PRINTFILE_DECODED_MB = parsePositiveInt(process.env.PRINTFILE_MAX_MB, 22);

// Standard header name for request IDs
export const REQUEST_ID_HEADER = 'X-Req-Id';

// A small object export if you need to iterate or introspect (optional convenience).
export const CONSTANTS = Object.freeze({
  JSON_BODY_LIMIT_MB,
  MAX_PRINTFILE_DECODED_MB,
  REQUEST_ID_HEADER
});
