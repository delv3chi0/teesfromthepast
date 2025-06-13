// backend/routes/formRoutes.js
import express from 'express';
// Corrected import: Changed handleContactForm to submitContactForm
import { submitContactForm } from '../controllers/formController.js'; 

const router = express.Router();

// @desc    Handle contact form submission
// @route   POST /api/forms/contact
// @access  Public
// Corrected usage: Changed handleContactForm to submitContactForm
router.post('/contact', submitContactForm); 

export default router;
