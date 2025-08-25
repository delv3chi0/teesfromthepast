function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const JSON_BODY_LIMIT_MB = parsePositiveInt(process.env.JSON_LIMIT_MB, 25);
export const MAX_PRINTFILE_DECODED_MB = parsePositiveInt(process.env.PRINTFILE_MAX_MB, 22);
export const REQUEST_ID_HEADER = "X-Req-Id";

export const CONSTANTS = Object.freeze({
  JSON_BODY_LIMIT_MB,
  MAX_PRINTFILE_DECODED_MB,
  REQUEST_ID_HEADER
});
