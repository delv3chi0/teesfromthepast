import { Router } from "express";
import { listMyDesigns } from "../controllers/designController.js";
import { protect } from "../middleware/authMiddleware.js"; // adjust to your middleware name

const router = Router();
router.get("/mydesigns", protect, listMyDesigns);
export default router;
