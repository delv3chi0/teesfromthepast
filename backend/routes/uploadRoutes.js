import express from 'express';
import { uploadPrintFile } from '../controllers/uploadController.js';
import { protect } from '../middleware/authMiddleware.js'; // Assuming you have an auth middleware

const router = express.Router();

// Route to handle uploading print-ready files
router.post('/upload-print-file', protect, uploadPrintFile);

export default router;
