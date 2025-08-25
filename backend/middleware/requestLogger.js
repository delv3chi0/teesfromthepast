/**
 * Lightweight request logger middleware (ESM).
 * Logs after response finish:
 *   [req:ID] METHOD PATH -> STATUS DURATIONms
 * Skips /health to reduce noise.
 *
 * Ensure this is mounted AFTER requestId so req.id is present:
 *   app.use(requestId);
 *   app.use(requestLogger);
 */
export function requestLogger(req, res, next) {
  if (req.path === "/health") return next();

  const start = process.hrtime.bigint();
  const rid = req.id || "-";

  res.on("finish", () => {
    const elapsedNs = process.hrtime.bigint() - start;
    const ms = Number(elapsedNs) / 1e6;
    // Keep logs minimal—avoid PII
    console.log(
      `[req:${rid}] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${ms.toFixed(
        1
      )}ms`
    );
  });

  next();
}

export default requestLogger;
