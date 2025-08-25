import { Router } from "express";
import { uploadPrintFile } from "../controllers/uploadController.js";

const router = Router();

router.post("/printfile", uploadPrintFile);

export default router;
