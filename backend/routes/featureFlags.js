// backend/routes/featureFlags.js
// Feature flags management routes (Task 8)
import express from "express";
import { body, param, query } from "express-validator";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import * as flags from "../controllers/featureFlagsController.js";

const router = express.Router();

// Validation middleware
const vFlagKey = [
  param("key").isString().isLength({ min: 1, max: 100 }).withMessage("Flag key must be 1-100 characters")
];

const vSetFlag = [
  ...vFlagKey,
  body("value").exists().withMessage("Flag value is required")
];

const vGetFlags = [
  query("category").optional().isString().withMessage("Category must be a string")
];

const safe = (name) => (typeof flags[name] === "function" ? flags[name] : (_req, res) => res.status(501).json({ message: `Missing ${name}` }));

// Public flag access (for authenticated users to see what features are available)
router.get("/", protect, vGetFlags, safe("getFeatureFlags"));
router.get("/:key", protect, vFlagKey, safe("getFeatureFlag"));

// Admin-only flag management
router.post("/:key", protect, requireAdmin, vSetFlag, safe("setFeatureFlag"));
router.post("/reload", protect, requireAdmin, safe("reloadFeatureFlags"));

// TODO: Task 8 - Additional routes to implement later:
// TODO: router.post("/validate", protect, requireAdmin, safe("validateFlags"));
// TODO: router.get("/history", protect, requireAdmin, safe("getFlagHistory"));
// TODO: router.post("/rollback", protect, requireAdmin, safe("rollbackFlags"));
// TODO: router.get("/categories", protect, safe("getFlagCategories"));
// TODO: router.put("/bulk", protect, requireAdmin, safe("bulkUpdateFlags"));

export default router;