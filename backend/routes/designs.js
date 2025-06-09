// backend/routes/designs.js

import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; // Our bouncer to make sure user is logged in
import Design from '../models/Design.js'; // Our blueprint for saving designs
import mongoose from 'mongoose'; // Import mongoose to check for valid ObjectId

const router = express.Router();

// --- Recipe 1: Save a New Picture Design ---
// This will be reached at POST /api/mydesigns/ (Note: index.js mounts this router at /api/mydesigns)
router.post('/', protect, async (req, res) => {
    console.log("[Save Design Route] Attempting to save a new design.");
    const { prompt, imageDataUrl } = req.body; 

    if (!prompt || !imageDataUrl) {
        return res.status(400).json({ message: 'Prompt and image data are required.' });
    }

    try {
        const newDesign = new Design({
            prompt: prompt,
            imageDataUrl: imageDataUrl,
            user: req.user.id 
        });

        const savedDesign = await newDesign.save();
        console.log("[Save Design Route] Design saved successfully:", savedDesign._id);
        res.status(201).json(savedDesign); 
    } catch (error) {
        console.error("[Save Design Route] Error saving design:", error);
        res.status(500).json({ message: 'Server error while saving design.', error: error.message });
    }
});

// --- Recipe 2: Show Me All My Saved Pictures ---
// This will be reached at GET /api/mydesigns/
router.get('/', protect, async (req, res) => {
    console.log("[Get My Designs Route] Attempting to fetch designs for user:", req.user.id);
    try {
        const designs = await Design.find({ user: req.user.id }).sort({ createdAt: -1 }); 

        console.log(`[Get My Designs Route] Found ${designs.length} designs.`);
        res.status(200).json(designs); 
    } catch (error) {
        console.error("[Get My Designs Route] Error fetching designs:", error);
        res.status(500).json({ message: 'Server error while fetching designs.', error: error.message });
    }
});

// --- NEW: Recipe 3: Delete a Specific Design ---
// This will be reached at DELETE /api/mydesigns/:designId
router.delete('/:designId', protect, async (req, res) => {
    const { designId } = req.params;
    const userId = req.user.id;

    console.log(`[Delete Design Route] Attempting to delete design ID: ${designId} for user ID: ${userId}`);

    // Validate if designId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(designId)) {
        console.log("[Delete Design Route] Invalid design ID format.");
        return res.status(400).json({ message: 'Invalid design ID format.' });
    }

    try {
        const design = await Design.findOne({ _id: designId, user: userId });

        if (!design) {
            console.log("[Delete Design Route] Design not found or user not authorized to delete.");
            return res.status(404).json({ message: 'Design not found or you are not authorized to delete this design.' });
        }

        // Mongoose v6+ `deleteOne` or `findByIdAndDelete` are good.
        // `findByIdAndDelete` is slightly more concise if you only need the ID.
        // Using `deleteOne` on the found document instance is also fine.
        await design.deleteOne(); 
        // Alternatively: await Design.findByIdAndDelete(designId); 
        // (but the findOne above already confirms ownership)


        console.log(`[Delete Design Route] Design ID: ${designId} deleted successfully.`);
        res.status(200).json({ message: 'Design deleted successfully.' });

    } catch (error) {
        console.error("[Delete Design Route] Error deleting design:", error);
        res.status(500).json({ message: 'Server error while deleting design.', error: error.message });
    }
});


export default router;
