export function sendError(res, code, httpStatus, message, details) {
  const payload = {
    ok: false,
    error: { code, message }
  };
  if (details && typeof details === "object") {
    payload.error.details = details;
  }
  if (res?.req?.id) {
    payload.requestId = res.req.id;
  }
  return res.status(httpStatus).json(payload);
}

export default sendError;
