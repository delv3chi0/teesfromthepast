import logger from "../utils/logger.js";

export function requestLogger(req, res, next) {
  if (req.path === "/health") return next();
  
  const start = process.hrtime.bigint();
  const reqId = req.id || "-";
  
  // Log request start
  logger.info({
    reqId,
    method: req.method,
    path: req.originalUrl,
    ip: req.client?.ip || req.ip || "-",
    userAgent: req.headers["user-agent"] || "-",
    userId: req.user?._id?.toString() || null
  }, `${req.method} ${req.originalUrl} - Request started`);
  
  res.on("finish", () => {
    const ns = process.hrtime.bigint() - start;
    const durationMs = Number(ns) / 1e6;
    
    // Structured log with all required fields
    logger.info({
      reqId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10, // round to 1 decimal
      userId: req.user?._id?.toString() || null,
      ip: req.client?.ip || req.ip || "-"
    }, `${req.method} ${req.originalUrl} -> ${res.statusCode} ${durationMs.toFixed(1)}ms`);
  });
  
  next();
}

export default requestLogger;
