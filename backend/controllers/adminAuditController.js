// backend/controllers/adminAuditController.js
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Design from "../models/Design.js";
import AuditLog from "../models/AuditLog.js";

// GET /api/admin/orders/summary
export const getDashboardSummary = asyncHandler(async (_req, res) => {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [revAgg, totalOrders, newUsers7d, designs7d, recentOrders] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: "Succeeded" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }, // totalAmount stored in cents in your code
    ]),
    Order.countDocuments({}),
    User.countDocuments({ createdAt: { $gte: since7d } }),
    Design.countDocuments({ createdAt: { $gte: since7d } }),
    Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "username email"),
  ]);

  const totalRevenueCents = revAgg?.[0]?.total || 0;

  res.json({
    totalRevenueCents,
    totalOrders,
    newUsers7d,
    designs7d,
    recentOrders,
  });
});

// GET /api/admin/audit?actor=&action=&targetType=&targetId=&page=1&limit=100
export const listAuditLogs = asyncHandler(async (req, res) => {
  const {
    actor = "",
    action = "",
    targetType = "",
    targetId = "",
    page = 1,
    limit = 100,
  } = req.query;

  const q = {};
  if (actor) q["actor"] = actor;           // actor is a userId string in our schema
  if (action) q["action"] = action;
  if (targetType) q["targetType"] = targetType;
  if (targetId) q["targetId"] = targetId;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 250);

  const [items, total] = await Promise.all([
    AuditLog.find(q)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * lim)
      .limit(lim)
      .populate("actor", "username email"),
    AuditLog.countDocuments(q),
  ]);

  res.json({ items, total, page: pageNum, limit: lim });
});
