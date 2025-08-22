// backend/routes/adminSessionRoutes.js
import express from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req?.user?.isAdmin) return next();
  return res.status(403).json({ message: "Admin access required" });
}

let RefreshToken;
try {
  RefreshToken = mongoose.model("RefreshToken");
} catch {
  const mod = await import("../models/RefreshToken.js");
  RefreshToken = mod.default || mod;
}

// GET /api/admin/sessions?active=1&page=&limit=
router.get("/", protect, requireAdmin, async (req, res) => {
  try {
    const { active = "0", page: pageRaw = "1", limit: limitRaw = "100" } = req.query;
    const page = Math.max(parseInt(pageRaw, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 100, 1), 200);
    const skip = (page - 1) * limit;

    const now = new Date();
    const q = {};
    if (String(active) === "1") {
      q.revokedAt = null;
      q.expiresAt = { $gt: now };
    }

    const [items, total] = await Promise.all([
      RefreshToken.find(q)
        .sort({ lastSeenAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "user", select: "username email" })
        .lean()
        .exec(),
      RefreshToken.countDocuments(q),
    ]);

    res.json({
      items,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (err) {
    console.error("[admin/sessions] list error:", err);
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
});

// DELETE /api/admin/sessions/:jti  -> revoke one
router.delete("/:jti", protect, requireAdmin, async (req, res) => {
  try {
    const { jti } = req.params;
    const doc = await RefreshToken.findOne({ jti }).exec();
    if (!doc) return res.status(204).end();
    if (!doc.revokedAt) {
      doc.revokedAt = new Date();
      await doc.save();
    }
    return res.status(204).end();
  } catch (err) {
    console.error("[admin/sessions] revoke error:", err);
    res.status(500).json({ message: "Failed to revoke session" });
  }
});

// DELETE /api/admin/sessions/user/:userId  -> revoke all for a user
router.delete("/user/:userId", protect, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    await RefreshToken.updateMany(
      { user: userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    ).exec();
    return res.status(204).end();
  } catch (err) {
    console.error("[admin/sessions] revoke all error:", err);
    res.status(500).json({ message: "Failed to revoke user sessions" });
  }
});

export default router;
