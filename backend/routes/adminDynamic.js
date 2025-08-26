import express from "express";
import {
  getRuntimeSnapshot,
  updateRateLimitConfig,
  updateSecurityConfig,
  listAuditCategories,
  queryAuditLogs
} from "../config/dynamicConfig.js";

// Use existing admin middleware
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/runtime/config", protect, requireAdmin, (_req, res) => {
  res.json({ ok: true, snapshot: getRuntimeSnapshot() });
});

router.put("/runtime/rate-limit", protect, requireAdmin, (req, res) => {
  const result = updateRateLimitConfig(req.body || {});
  if (!result.ok) return res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid rate limit config", details: result.errors } });
  res.json({ ok: true, rateLimit: result.config });
});

router.put("/runtime/security", protect, requireAdmin, (req, res) => {
  const result = updateSecurityConfig(req.body || {});
  if (!result.ok) return res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid security config", details: result.errors } });
  res.json({ ok: true, security: result.config });
});

router.get("/audit/categories", protect, requireAdmin, (_req, res) => {
  res.json({ ok: true, categories: listAuditCategories() });
});

router.get("/audit/logs", protect, requireAdmin, (req, res) => {
  const { category, q, limit, since } = req.query;
  const logs = queryAuditLogs({ category: category || undefined, q: q || undefined, limit: limit ? parseInt(limit, 10) : undefined, since: since || undefined });
  res.json({ ok: true, logs });
});

export default router;