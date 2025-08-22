// backend/routes/adminSessionRoutes.js
import express from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- Models (reuse if already registered) ---
let RefreshToken;
try {
  RefreshToken = mongoose.model("RefreshToken");
} catch {
  // Fallback minimal schema to match your authController writes
  const RefreshTokenSchema = new mongoose.Schema(
    {
      jti: { type: String, index: true, required: true, unique: true },
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
      expiresAt: { type: Date, index: true, required: true },
      revokedAt: { type: Date, default: null, index: true },
    },
    { timestamps: true }
  );
  RefreshTokenSchema.index({ user: 1, createdAt: -1 });
  mongoose.model("RefreshToken", RefreshTokenSchema);
  RefreshToken = mongoose.model("RefreshToken");
}

function requireAdmin(req, res, next) {
  if (req?.user?.isAdmin) return next();
  return res.status(403).json({ message: "Admin access required" });
}

/**
 * GET /api/admin/sessions
 * Query: page, limit, userId (optional), activeOnly (optional true/false)
 * Responds: { items: [...], page, limit, total }
 */
router.get("/", protect, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page ?? "1", 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "100", 10) || 100, 1), 200);
    const skip = (page - 1) * limit;

    const q = {};
    if (req.query.userId) q.user = req.query.userId;
    if (String(req.query.activeOnly).toLowerCase() === "true") {
      q.$and = [{ revokedAt: null }, { expiresAt: { $gt: new Date() } }];
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

    const normalized = items.map((s) => ({
      jti: s.jti,
      user: s.user || null,
      ip: s.ip || "",
      userAgent: s.userAgent || "",
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      revokedAt: s.revokedAt,
    }));

    return res.json({ items: normalized, page, limit, total });
  } catch (err) {
    console.error("[admin/sessions] list error:", err);
    return res.status(500).json({ message: "Failed to fetch sessions" });
  }
});

/**
 * DELETE /api/admin/sessions/:jti
 * Revokes a single session by JTI.
 */
router.delete("/:jti", protect, requireAdmin, async (req, res) => {
  try {
    const { jti } = req.params;
    const rt = await RefreshToken.findOne({ jti }).exec();
    if (!rt) return res.status(404).json({ message: "Session not found" });
    if (!rt.revokedAt) {
      rt.revokedAt = new Date();
      await rt.save();
    }
    return res.status(204).end();
  } catch (err) {
    console.error("[admin/sessions] revoke error:", err);
    return res.status(500).json({ message: "Failed to revoke session" });
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
    return res.status(500).json({ message: "Failed to revoke user sessions" });
  }
});

export default router;
