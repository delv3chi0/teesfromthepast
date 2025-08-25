export function requestLogger(req, res, next) {
  if (req.path === "/health") return next();
  const start = process.hrtime.bigint();
  const rid = req.id || "-";
  const traceId = req.traceId || "-";
  
  res.on("finish", () => {
    const ns = process.hrtime.bigint() - start;
    const ms = Number(ns) / 1e6;
    console.log(
      `[req:${rid}] [trace:${traceId}] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${ms.toFixed(1)}ms`
    );
  });
  next();
}

export default requestLogger;
