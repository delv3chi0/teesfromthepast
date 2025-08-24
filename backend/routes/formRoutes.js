// backend/routes/formRoutes.js
import express from 'express';
import { handleContactForm } from '../controllers/formController.js';

const router = express.Router();

// Public JSON endpoint
router.post('/contact', handleContactForm);

export default router;
