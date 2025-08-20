// backend/routes/admin.js
import express from "express";
import { protect, admin as adminOnly } from "../middleware/authMiddleware.js";
// If you already have real controllers, import and wire them here.
// For now we provide safe, minimal handlers so the UI works end-to-end.

const router = express.Router();

/**
 * GET /api/admin/orders/summary
 * Safe, always-structured response for the dashboard.
 */
router.get("/orders/summary", protect, adminOnly, async (req, res) => {
  // You can replace this with a real aggregation later.
  res.json({
    totalRevenueCents: 0,
    totalOrders: 0,
    newUsers7d: 0,
    designs7d: 0,
    recentOrders: [], // array of { _id, user, createdAt, totalAmount, paymentStatus, orderStatus }
  });
});

/**
 * GET /api/admin/users
 */
router.get("/users", protect, adminOnly, async (req, res) => {
  // Replace with real data. Shape matches your AdminPage table.
  res.json([]);
});

/**
 * PUT /api/admin/users/:id
 */
router.put("/users/:id", protect, adminOnly, async (req, res) => {
  // Echo back a minimal updated user; replace with real update logic.
  res.json({
    _id: req.params.id,
    username: req.body.username || "user",
    email: req.body.email || "user@example.com",
    firstName: req.body.firstName || "",
    lastName: req.body.lastName || "",
    isAdmin: !!req.body.isAdmin,
    createdAt: new Date().toISOString(),
  });
});

/**
 * DELETE /api/admin/users/:id
 */
router.delete("/users/:id", protect, adminOnly, async (req, res) => {
  res.json({ ok: true });
});

/**
 * GET /api/admin/orders
 */
router.get("/orders", protect, adminOnly, async (req, res) => {
  res.json([]); // Replace with real orders
});

/**
 * GET /api/admin/orders/:id
 */
router.get("/orders/:id", protect, adminOnly, async (req, res) => {
  // Minimal, UI-safe shape for the Order Details modal
  res.json({
    _id: req.params.id,
    createdAt: new Date().toISOString(),
    totalAmount: 0,
    paymentStatus: "Pending",
    orderStatus: "Processing",
    user: { username: "user", email: "user@example.com" },
    shippingAddress: {
      recipientName: "",
      street1: "",
      street2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    orderItems: [],
  });
});

/**
 * PUT /api/admin/orders/:id/status
 */
router.put("/orders/:id/status", protect, adminOnly, async (req, res) => {
  res.json({ ok: true, status: req.body.status || "Processing" });
});

/**
 * DELETE /api/admin/orders/:id
 */
router.delete("/orders/:id", protect, adminOnly, async (req, res) => {
  res.json({ ok: true });
});

/**
 * GET /api/admin/designs
 */
router.get("/designs", protect, adminOnly, async (req, res) => {
  res.json([]); // Replace with real designs
});

/**
 * DELETE /api/admin/designs/:id
 */
router.delete("/designs/:id", protect, adminOnly, async (req, res) => {
  res.json({ ok: true });
});

/**
 * GET /api/admin/sessions
 * Return list in { items: [...] } so Devices panel renders.
 */
router.get("/sessions", protect, adminOnly, async (req, res) => {
  res.json({ items: [] });
});

/**
 * DELETE /api/admin/sessions/:jti
 */
router.delete("/sessions/:jti", protect, adminOnly, async (req, res) => {
  res.json({ ok: true });
});

/**
 * DELETE /api/admin/sessions/user/:userId
 */
router.delete("/sessions/user/:userId", protect, adminOnly, async (req, res) => {
  res.json({ ok: true });
});

/**
 * GET /api/admin/audit
 * Return list in { items: [...] } so Audit panel renders.
 */
router.get("/audit", protect, adminOnly, async (req, res) => {
  res.json({ items: [] });
});

export default router;
