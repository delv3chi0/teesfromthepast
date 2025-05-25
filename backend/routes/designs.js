// backend/routes/designs.js

import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; // Our bouncer to make sure user is logged in
import Design from '../models/Design.js'; // Our blueprint for saving designs

const router = express.Router();

// --- Recipe 1: Save a New Picture Design ---
// This will be reached at POST /api/designs/
router.post('/', protect, async (req, res) => {
    console.log("[Save Design Route] Attempting to save a new design.");
    const { prompt, imageDataUrl } = req.body; // Get the idea and picture data from the frontend

    if (!prompt || !imageDataUrl) {
        return res.status(400).json({ message: 'Prompt and image data are required.' });
    }

    try {
        const newDesign = new Design({
            prompt: prompt,
            imageDataUrl: imageDataUrl,
            user: req.user.id // req.user.id comes from our 'protect' bouncer
        });

        const savedDesign = await newDesign.save();
        console.log("[Save Design Route] Design saved successfully:", savedDesign._id);
        res.status(201).json(savedDesign); // Send back the saved design with a "Created" status
    } catch (error) {
        console.error("[Save Design Route] Error saving design:", error);
        res.status(500).json({ message: 'Server error while saving design.', error: error.message });
    }
});

// --- Recipe 2: Show Me All My Saved Pictures ---
// This will be reached at GET /api/designs/
router.get('/', protect, async (req, res) => {
    console.log("[Get My Designs Route] Attempting to fetch designs for user:", req.user.id);
    try {
        // Find all designs in the database that belong to the currently logged-in user
        const designs = await Design.find({ user: req.user.id }).sort({ createdAt: -1 }); // Show newest first

        console.log(`[Get My Designs Route] Found ${designs.length} designs.`);
        res.status(200).json(designs); // Send the list of designs back
    } catch (error) {
        console.error("[Get My Designs Route] Error fetching designs:", error);
        res.status(500).json({ message: 'Server error while fetching designs.', error: error.message });
    }
});

// We can add more recipes later, like "Delete a picture" or "Update a picture's details"

export default router; // Make all these recipes available
