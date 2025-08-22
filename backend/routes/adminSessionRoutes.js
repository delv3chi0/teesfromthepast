import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import RefreshToken from "../models/RefreshToken.js";

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req?.user?.isAdmin) return next();
  return res.status(403).json({ message: "Admin access required" });
}

/**
 * GET /api/admin/sessions
 * Query: page, limit, activeOnly (default 1)
 * Returns only active by default: revokedAt == null AND expiresAt > now
 */
router.get("/", protect, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);
    const skip = (page - 1) * limit;
    const activeOnly = req.query.activeOnly !== "0";

    const q = {};
    if (activeOnly) {
      q.revokedAt = null;
      q.expiresAt = { $gt: new Date() };
    }

    const [items, total] = await Promise.all([
      RefreshToken.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "user", select: "username email" })
        .lean()
        .exec(),
      RefreshToken.countDocuments(q),
    ]);

    // no jti column requirement is UI-side; API still returns it for actions
    res.json({
      items: items.map((i) => ({
        jti: i.jti,
        user: i.user || null,
        ip: i.ip || "",
        userAgent: i.userAgent || "",
        createdAt: i.createdAt,
        expiresAt: i.expiresAt,
        revokedAt: i.revokedAt || null,
      })),
      page,
      limit,
      total,
      hasMore: skip + items.length < total,
    });
  } catch (err) {
    console.error("[admin/sessions] list error:", err);
    res.status(500).json({ message: "Failed to fetch sessions", error: String(err?.message || err) });
  }
});

/**
 * DELETE /api/admin/sessions/:jti  -> revoke one
 */
router.delete("/:jti", protect, requireAdmin, async (req, res) => {
  try {
    const jti = req.params.jti;
    const r = await RefreshToken.updateOne(
      { jti, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    if (r.matchedCount === 0) return res.status(404).json({ message: "Session not found or already revoked" });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: "Failed to revoke session", error: String(err?.message || err) });
  }
});

/**
 * DELETE /api/admin/sessions/user/:userId -> revoke all for a user
 */
router.delete("/user/:userId", protect, requireAdmin, async (req, res) => {
  try {
    await RefreshToken.updateMany(
      { user: req.params.userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: "Failed to revoke user sessions", error: String(err?.message || err) });
  }
});

export default router;
