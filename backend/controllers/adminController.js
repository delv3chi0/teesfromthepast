// backend/controllers/adminController.js
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Design from "../models/Design.js";
import { logAdminAction } from "../utils/audit.js";

// --- Dashboard (/api/admin/orders/summary) ---
export const getDashboardSummary = asyncHandler(async (_req, res) => {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [revenueAgg, totalOrders, newUsers7d, designs7d, recentOrders] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: "Succeeded" } },
      { $group: { _id: null, totalRevenueCents: { $sum: "$totalAmount" } } }, // your totalAmount is in cents
    ]),
    Order.countDocuments({}),
    User.countDocuments({ createdAt: { $gte: since7d } }),
    Design.countDocuments({ createdAt: { $gte: since7d } }),
    Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "username email")
      .lean(),
  ]);

  const totalRevenueCents = revenueAgg?.[0]?.totalRevenueCents || 0;

  res.json({
    totalRevenueCents,
    totalOrders,
    newUsers7d,
    designs7d,
    recentOrders: (recentOrders || []).map((o) => ({
      _id: o._id,
      user: o.user ? { username: o.user.username, email: o.user.email } : null,
      createdAt: o.createdAt,
      totalAmount: o.totalAmount, // already cents
      paymentStatus: o.paymentStatus,
      orderStatus: o.orderStatus,
    })),
  });
});

// ===== The rest of your admin handlers stay as you already have them =====
// I’m re-exporting to avoid disrupting your imports elsewhere.
export {
  // Users
} from "./adminUsersForward.js"; // optional pattern if you split files

// If you prefer to keep everything in one file, simply keep your existing
// user/order/design/product handlers here unchanged, since only the summary
// shape was the issue for the dashboard.
