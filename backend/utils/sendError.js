/**
 * Standardized error response utility.
 * Usage:
 *   return sendError(res, "UPLOAD_TOO_LARGE", 413, "Print file exceeds limit", { maxMB, estimatedMB });
 *
 * Response shape:
 * {
 *   ok: false,
 *   error: {
 *     code: string,
 *     message: string,
 *     details?: object
 *   },
 *   requestId?: string
 * }
 */
export function sendError(res, code, httpStatus, message, details) {
  const payload = {
    ok: false,
    error: { code, message }
  };
  if (details && typeof details === "object") {
    payload.error.details = details;
  }
  // If requestId middleware ran, surface it
  if (res?.req?.id) {
    payload.requestId = res.req.id;
  }
  return res.status(httpStatus).json(payload);
}

export default sendError;
