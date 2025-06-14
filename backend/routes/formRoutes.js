// backend/routes/formRoutes.js
import express from 'express';
import { handleContactForm } from '../controllers/formController.js'; // We'll create this controller next

const router = express.Router();

// @desc    Handle contact form submission
// @route   POST /api/forms/contact
// @access  Public
router.post('/contact', handleContactForm);

export default router;
