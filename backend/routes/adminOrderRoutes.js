// backend/routes/adminOrderRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { admin } from "../middleware/adminMiddleware.js";
import {
  getDashboardSummary,
  getAllOrdersAdmin,
  deleteOrderAdmin,
  getOrderByIdAdmin,
  updateOrderStatusAdmin,
} from "../controllers/adminController.js";

const router = express.Router();

// Dashboard summary
router.get("/summary", protect, admin, getDashboardSummary);

// Orders CRUD-ish
router.get("/", protect, admin, getAllOrdersAdmin);
router.get("/:id", protect, admin, getOrderByIdAdmin);
router.delete("/:id", protect, admin, deleteOrderAdmin);
router.put("/:id/status", protect, admin, updateOrderStatusAdmin);

export default router;
