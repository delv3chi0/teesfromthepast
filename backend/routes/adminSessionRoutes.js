// backend/routes/adminSessionRoutes.js
import express from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/authMiddleware.js";
import RefreshTokenModel from "../models/RefreshToken.js";

const router = express.Router();
const RefreshToken =
  mongoose.models.RefreshToken || RefreshTokenModel;

function requireAdmin(req, res, next) {
  if (req?.user?.isAdmin) return next();
  return res.status(403).json({ message: "Admin access required" });
}

/**
 * GET /api/admin/sessions
 * Query:
 *  - page (default 1), limit (default 100, max 200)
 *  - activeOnly=true|false  (default true)
 *
 * Returns: { items, page, limit, total, hasMore }
 */
router.get("/", protect, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);
    const skip = (page - 1) * limit;

    const activeOnly =
      String(req.query.activeOnly ?? "true").toLowerCase() !== "false";

    const now = new Date();
    const q = {};
    if (activeOnly) {
      q.$and = [
        { revokedAt: { $eq: null } },
        { expiresAt: { $gt: now } },
      ];
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

    const normalized = items.map((i) => ({
      jti: i.jti,
      user: i.user || null,
      ip: i.ip || "",
      userAgent: i.userAgent || "",
      client: i.client || {},         // extra client hints (tz, lang, etc.)
      createdAt: i.createdAt,
      lastSeenAt: i.lastSeenAt || i.createdAt,
      expiresAt: i.expiresAt,
      revokedAt: i.revokedAt || null,
      status:
        i.revokedAt
          ? "revoked"
          : (new Date(i.expiresAt) < now ? "expired" : "active"),
    }));

    const hasMore = page * limit < total;
    return res.json({ items: normalized, page, limit, total, hasMore });
  } catch (err) {
    console.error("[admin/sessions] list error:", err);
    return res.status(500).json({
      message: "Failed to fetch sessions",
      error: String(err?.message || err),
    });
  }
});

/**
 * DELETE /api/admin/sessions/:jti
 * Revokes a single session.
 */
router.delete("/:jti", protect, requireAdmin, async (req, res) => {
  try {
    const { jti } = req.params;
    const doc = await RefreshToken.findOne({ jti, revokedAt: null }).exec();
    if (!doc) return res.status(204).end();
    doc.revokedAt = new Date();
    await doc.save();
    return res.status(204).end();
  } catch (err) {
    console.error("[admin/sessions] revoke error:", err);
    return res.status(500).json({
      message: "Failed to revoke session",
      error: String(err?.message || err),
    });
  }
});

/**
 * DELETE /api/admin/sessions/user/:userId
 * Revokes all active sessions for a user.
 */
router.delete("/user/:userId", protect, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    await RefreshToken.updateMany(
      { user: userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    ).exec();
    return res.status(204).end();
  } catch (err) {
    console.error("[admin/sessions] revoke-all error:", err);
    return res.status(500).json({
      message: "Failed to revoke user sessions",
      error: String(err?.message || err),
    });
  }
});

export default router;
