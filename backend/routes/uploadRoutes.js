import express from 'express';
import { uploadPrintFile } from '../controllers/uploadController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/upload/printfile — Upload print-ready + thumbnail
router.post('/upload/printfile', protect, uploadPrintFile);

export default router;
