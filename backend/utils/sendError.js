// backend/utils/sendError.js
// Structured error response utility

/**
 * Send standardized error response
 * @param {Object} res - Express response object
 * @param {string} code - Error code (e.g. 'UPLOAD_TOO_LARGE')
 * @param {number} httpStatus - HTTP status code
 * @param {string} message - Human-readable error message
 * @param {Object} [details] - Optional additional details
 */
export function sendError(res, code, httpStatus, message, details = null) {
  const payload = {
    ok: false,
    error: {
      code,
      message,
      ...(details && { details })
    }
  };
  
  return res.status(httpStatus).json(payload);
}