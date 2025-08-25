// frontend/src/constants.js
// Frontend constants - keep in sync with backend constants

// Upload size limits (should match backend MAX_PRINTFILE_DECODED_MB)
export const MAX_PRINTFILE_DECODED_MB = parseInt(import.meta.env.VITE_PRINTFILE_MAX_MB || '22', 10);

// Upload warning threshold (80% of max)
export const UPLOAD_WARNING_THRESHOLD = MAX_PRINTFILE_DECODED_MB * 0.8;