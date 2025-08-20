// backend/routes/admin.js
import express from "express";
import { protect, admin as adminOnly } from "../middleware/authMiddleware.js";
import {
  getAllUsersAdmin,
  getAllOrdersAdmin,
  getOrderByIdAdmin,
  updateOrderStatusAdmin,
  deleteOrderAdmin,
  getAllDesignsAdmin,
  deleteDesignAdmin,
  getProductsAdmin,
} from "../controllers/adminController.js";
import {
  getDashboardSummary,   // returns the UI-friendly summary shape
  listAuditLogs,         // paginated audit list
} from "../controllers/adminAuditController.js";

const router = express.Router();

// Everything here: protected + admin-only
router.use(protect, adminOnly);

// --- Dashboard summary (what your frontend calls) ---
router.get("/orders/summary", getDashboardSummary);

// --- Audit logs (AdminAuditLogs.jsx) ---
router.get("/audit", listAuditLogs);

// --- Users ---
router.get("/users", getAllUsersAdmin);

// --- Orders ---
router.get("/orders", getAllOrdersAdmin);
router.get("/orders/:id", getOrderByIdAdmin);
router.put("/orders/:id/status", updateOrderStatusAdmin);
router.delete("/orders/:id", deleteOrderAdmin);

// --- Designs ---
router.get("/designs", getAllDesignsAdmin);
router.delete("/designs/:id", deleteDesignAdmin);

// --- Products (InventoryPanel.jsx) ---
router.get("/products", getProductsAdmin);

// --- Sessions / Devices ---
// NOTE: Stub endpoints so the tab renders without CORS/404 noise.
// Replace with your real session store later.
router.get("/sessions", async (req, res) => {
  res.json({
    items: [], // [] until you track sessions (JWT jti + UA + IP)
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 100,
    total: 0,
  });
});

router.delete("/sessions/:jti", async (req, res) => {
  // TODO: revoke this jti if you add a token blacklist or DB store
  res.status(204).send();
});

router.delete("/sessions/user/:userId", async (req, res) => {
  // TODO: revoke all sessions for a user if you add a session store
  res.status(204).send();
});

export default router;
