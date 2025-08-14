// backend/routes/designs.js
import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/authMiddleware.js';
import Design from '../models/Design.js';

// NEW: high-quality generator
import { createDesign } from '../controllers/designController.js';

const router = express.Router();

// ---------- NEW: Generate PNG + upscale + optional upload ----------
router.post('/create', protect, createDesign);

// ---------- Save a Design (unchanged) ----------
router.post('/', protect, async (req, res) => {
  console.log('[Save Design Route] Attempting to save a new design.');
  const { prompt, imageDataUrl, masterUrl, previewUrl } = req.body;

  if (!prompt || (!imageDataUrl && !masterUrl)) {
    return res.status(400).json({ message: 'Prompt and an image are required.' });
  }

  try {
    const newDesign = new Design({
      prompt,
      imageDataUrl: imageDataUrl || undefined, // keep compatibility
      publicUrl: masterUrl || undefined,       // if you decide to store Cloudinary URL
      thumbUrl: previewUrl || undefined,       // optional small/preview
      user: req.user.id,
    });

    const saved = await newDesign.save();
    console.log('[Save Design Route] Design saved successfully:', saved._id);
    res.status(201).json(saved);
  } catch (error) {
    console.error('[Save Design Route] Error saving design:', error);
    res.status(500).json({ message: 'Server error while saving design.', error: error.message });
  }
});

// ---------- Get My Designs (unchanged) ----------
router.get('/', protect, async (req, res) => {
  console.log('[Get My Designs Route] Attempting to fetch designs for user:', req.user.id);
  try {
    const designs = await Design.find({ user: req.user.id }).sort({ createdAt: -1 });
    console.log(`[Get My Designs Route] Found ${designs.length} designs.`);
    res.status(200).json(designs);
  } catch (error) {
    console.error('[Get My Designs Route] Error fetching designs:', error);
    res.status(500).json({ message: 'Server error while fetching designs.', error: error.message });
  }
});

// ---------- Delete a Design (unchanged) ----------
router.delete('/:designId', protect, async (req, res) => {
  const { designId } = req.params;
  const userId = req.user.id;

  console.log(`[Delete Design Route] Attempting to delete design ID: ${designId} for user ID: ${userId}`);

  if (!mongoose.Types.ObjectId.isValid(designId)) {
    console.log('[Delete Design Route] Invalid design ID format.');
    return res.status(400).json({ message: 'Invalid design ID format.' });
  }

  try {
    const design = await Design.findOne({ _id: designId, user: userId });
    if (!design) {
      console.log('[Delete Design Route] Design not found or user not authorized to delete.');
      return res.status(404).json({ message: 'Design not found or you are not authorized to delete this design.' });
    }
    await design.deleteOne();
    console.log(`[Delete Design Route] Design ID: ${designId} deleted successfully.`);
    res.status(200).json({ message: 'Design deleted successfully.' });
  } catch (error) {
    console.error('[Delete Design Route] Error deleting design:', error);
    res.status(500).json({ message: 'Server error while deleting design.', error: error.message });
  }
});

export default router;
