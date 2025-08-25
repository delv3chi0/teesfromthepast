import { randomUUID } from "crypto";

export default function requestLogger(req, res, next) {
  const id = randomUUID();
  const start = Date.now();
  req.id = id;
  res.setHeader("X-Request-ID", id);

  console.log(`[req] ${id} → ${req.method} ${req.originalUrl}`);

  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`[req] ${id} ← ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });

  next();
}