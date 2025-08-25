/**
 * Route wiring for print file upload.
 * Ensure this is mounted in app.js, e.g.:
 *   import uploadRoutes from "./routes/uploadRoutes.js";
 *   app.use("/api/upload", uploadRoutes);
 */
import { Router } from "express";
import { uploadPrintFile } from "../controllers/uploadController.js";

const router = Router();

router.post("/printfile", uploadPrintFile);

export default router;
