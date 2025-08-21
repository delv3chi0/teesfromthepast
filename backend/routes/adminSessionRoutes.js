// backend/routes/adminSessionRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Simple admin-check wrapper that doesn't rely on a specific "admin" export.
 * Ensures compatibility with your existing middleware by using only `protect`.
 */
function requireAdmin(req, res, next) {
  if (req?.user?.isAdmin) return next();
  return res.status(403).json({ message: "Admin access required" });
}

/**
 * GET /api/admin/sessions
 * Returns an empty list (placeholder) so the UI renders without failing.
 * Replace with your real session store later.
 */
router.get("/", protect, requireAdmin, async (req, res) => {
  return res.json({ items: [], page: 1, limit: 100, total: 0 });
});

/**
 * DELETE /api/admin/sessions/:jti
 * Placeholder no-op (204). Replace with actual revocation logic if/when needed.
 */
router.delete("/:jti", protect, requireAdmin, async (req, res) => {
  return res.status(204).end();
});

/**
 * DELETE /api/admin/sessions/user/:userId
 * Placeholder no-op (204).
 */
router.delete("/user/:userId", protect, requireAdmin, async (req, res) => {
  return res.status(204).end();
});

export default router;
