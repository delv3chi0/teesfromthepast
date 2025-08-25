// backend/config/constants.js
// Centralized constants and configuration

// JSON body size limits
export const JSON_BODY_LIMIT_MB = parseInt(process.env.JSON_LIMIT_MB || '25', 10);

// Upload size limits  
export const MAX_PRINTFILE_DECODED_MB = parseInt(process.env.PRINTFILE_MAX_MB || '22', 10);

// Request tracking
export const REQUEST_ID_HEADER = 'X-Req-Id';