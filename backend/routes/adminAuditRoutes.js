// backend/routes/adminAuditRoutes.js
import express from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/authMiddleware.js";
import AuditLogModel from "../models/AuditLog.js";
import User from "../models/User.js";

const router = express.Router();
const AuditLog = mongoose.models.AuditLog || AuditLogModel;

function requireAdmin(req, res, next) {
  if (req?.user?.isAdmin) return next();
  return res.status(403).json({ message: "Admin access required" });
}

const isObjId = (s) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s);
const esc = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Build a flexible query:
 * - actor: if 24-hex → match actor ObjectId; otherwise try to resolve user by username/email contains
 * - q: free text → matches actorDisplay, targetId, action, meta.sessionId/sessionJti, _id prefix, ip, userAgent
 * - targetType, action, targetId pass-through filters
 * - createdFrom/createdTo for date range (ISO strings)
 */
async function buildQuery({ actor, q, action, targetType, targetId, createdFrom, createdTo }) {
  const query = {};
  const and = [];

  // actor
  if (actor) {
    if (isObjId(actor)) {
      query.actor = new mongoose.Types.ObjectId(actor);
    } else {
      // look up users by username/email contains (case-insensitive)
      const rx = new RegExp(esc(actor), "i");
      const candidates = await User.find(
        { $or: [{ username: rx }, { email: rx }] },
        { _id: 1 }
      )
        .limit(50)
        .lean();
      const ids = candidates.map((u) => u._id);
      if (ids.length) and.push({ actor: { $in: ids } });
      else and.push({ actorDisplay: rx }); // fallback to stored display string
    }
  }

  if (action) query.action = action;
  if (targetType) query.targetType = targetType;
  if (targetId) query.targetId = targetId;

  // date range
  if (createdFrom || createdTo) {
    query.createdAt = {};
    if (createdFrom) query.createdAt.$gte = new Date(createdFrom);
    if (createdTo) query.createdAt.$lte = new Date(createdTo);
  }

  // free text q
  if (q) {
    const rx = new RegExp(esc(q), "i");
    const or = [
      { actorDisplay: rx },
      { action: rx },
      { targetId: rx },
      { ip: rx },
      { userAgent: rx },
      // session correlation – stored either in sessionJti or under meta.{sessionId|sid|session}
      { sessionJti: rx },
      { "meta.sessionId": rx },
      { "meta.sid": rx },
      { "meta.session": rx },
    ];

    // If it looks like an ObjectId prefix, include _id prefix match via $expr
    if (/^[a-f0-9]{4,24}$/i.test(q)) {
      // $expr + $regexMatch – avoids casting failures
      or.push({
        $expr: {
          $regexMatch: {
            input: { $toString: "$_id" },
            regex: esc(q),
            options: "i",
          },
        },
      });
    }

    and.push({ $or: or });
  }

  if (and.length) query.$and = and;

  return query;
}

/**
 * GET /api/admin/audit
 * Query:
 *  - actor, q, action, targetType, targetId
 *  - createdFrom, createdTo (ISO)
 *  - page, limit
 * Returns: { items, page, limit, total, hasMore }
 */
router.get("/", protect, requireAdmin, async (req, res) => {
  try {
    const {
      actor = "",
      q = "",
      action = "",
      targetType = "",
      targetId = "",
      createdFrom = "",
      createdTo = "",
      page: pageRaw = "1",
      limit: limitRaw = "50",
    } = req.query;

    const page = Math.max(parseInt(pageRaw, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 50, 1), 200);
    const skip = (page - 1) * limit;

    const query = await buildQuery({
      actor,
      q,
      action,
      targetType,
      targetId,
      createdFrom,
      createdTo,
    });

    const [items, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "actor", select: "username email firstName lastName" })
        .lean()
        .exec(),
      AuditLog.countDocuments(query),
    ]);

    const normalized = items.map((i) => {
      const actorDisplay =
        i.actor?.username ||
        i.actor?.email ||
        i.actorDisplay ||
        "(unknown)";
      return {
        ...i,
        actorDisplay,
        actionLabel: i.action || "",
        meta: i.meta || {},
      };
    });

    const hasMore = page * limit < total;
    return res.json({ items: normalized, page, limit, total, hasMore });
  } catch (err) {
    console.error("[admin/audit] list error:", err);
    return res.status(500).json({
      message: "Failed to fetch audit logs",
      error: String(err?.message || err),
    });
  }
});

/**
 * GET /api/admin/audit/:id
 */
router.get("/:id", protect, requireAdmin, async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate({ path: "actor", select: "username email firstName lastName" })
      .lean()
      .exec();
    if (!log) return res.status(404).json({ message: "Audit log not found" });

    const actor = log.actor || {};
    const payload = {
      id: log._id,
      when: log.createdAt,
      action: log.action,
      actor: {
        id: actor._id || null,
        username: actor.username || "(unknown)",
        email: actor.email || null,
        name:
          [actor.firstName, actor.lastName].filter(Boolean).join(" ") || null,
      },
      target: { type: log.targetType || "", id: log.targetId || "" },
      network: { ip: log.ip || "", userAgent: log.userAgent || "" },
      sessionId:
        log.sessionJti ||
        log?.meta?.sessionId ||
        log?.meta?.sid ||
        log?.meta?.session ||
        "",
      meta: log.meta || {},
    };

    return res.json(payload);
  } catch (err) {
    console.error("[admin/audit] get error:", err);
    return res.status(500).json({
      message: "Failed to fetch audit entry",
      error: String(err?.message || err),
    });
  }
});

/**
 * DELETE /api/admin/audit
 */
router.delete("/", protect, requireAdmin, async (_req, res) => {
  try {
    await AuditLog.deleteMany({});
    return res.status(204).end();
  } catch (err) {
    console.error("[admin/audit] clear error:", err);
    return res.status(500).json({
      message: "Failed to clear audit logs",
      error: String(err?.message || err),
    });
  }
});

export default router;
