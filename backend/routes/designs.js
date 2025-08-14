// backend/routes/designs.js
import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/authMiddleware.js';
import Design from '../models/Design.js';

import { createDesign } from '../controllers/designController.js';

// Optional Cloudinary for delete
import 'dotenv/config';
let cloudinary = null;
const useCloudinary =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (useCloudinary) {
  const { v2 } = await import('cloudinary');
  v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  cloudinary = v2;
}

// Extract public_id from a Cloudinary secure_url
// Works for nested folders and versions, e.g.
// https://res.cloudinary.com/<cloud>/image/upload/v123/folder/sub/name.png
function cloudinaryPublicIdFromUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/'); // ['', '<cloud_name>', 'image', 'upload', 'v123', 'folder', 'sub', 'name.png']
    const uploadIdx = parts.findIndex((p) => p === 'upload');
    if (uploadIdx === -1) return null;
    const afterUpload = parts.slice(uploadIdx + 1); // e.g. ['v123','folder','sub','name.png'] or ['folder','name.png']
    // strip leading version if present (v###)
    const first = afterUpload[0];
    const keyParts = (first && /^v\d+$/i.test(first)) ? afterUpload.slice(1) : afterUpload;
    if (keyParts.length === 0) return null;
    const filename = keyParts.pop(); // 'name.png'
    const basename = filename.replace(/\.[a-z0-9]+$/i, ''); // 'name'
    const folder = keyParts.join('/'); // 'folder/sub'
    return folder ? `${folder}/${basename}` : basename;
  } catch {
    return null;
  }
}

const router = express.Router();

// ---------- NEW: Generate high-quality image (no DB write) ----------
router.post('/create', protect, createDesign);

// ---------- Save a Design (unchanged; now optionally accepts master/preview/thumb) ----------
router.post('/', protect, async (req, res) => {
  console.log('[Save Design Route] Attempting to save a new design.');
  const { prompt, imageDataUrl, masterUrl, previewUrl, thumbUrl } = req.body;

  if (!prompt || (!imageDataUrl && !masterUrl)) {
    return res.status(400).json({ message: 'Prompt and an image are required.' });
  }

  try {
    const newDesign = new Design({
      prompt,
      imageDataUrl: imageDataUrl || undefined,
      publicUrl: masterUrl || undefined,  // original / master PNG
      thumbUrl: thumbUrl || previewUrl || undefined, // prefer tiny thumb if provided
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

// ---------- Delete a Design (now deletes Cloudinary master if present) ----------
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

    // Try to delete Cloudinary original (this invalidates derived variants)
    if (useCloudinary && design.publicUrl) {
      const publicId = cloudinaryPublicIdFromUrl(design.publicUrl);
      if (publicId) {
        try {
          const result = await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: 'image' });
          console.log('[Delete Design Route] Cloudinary destroy:', publicId, result?.result);
        } catch (cldErr) {
          console.warn('[Delete Design Route] Cloudinary destroy failed:', cldErr?.message || cldErr);
        }
      }
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
