// backend/routes/designs.js
import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/authMiddleware.js';
import Design from '../models/Design.js';
import { createDesign } from '../controllers/designController.js';
import 'dotenv/config';

const router = express.Router();

// ---------- Save a design (from Generate) ----------
router.post('/', protect, async (req, res) => {
  console.log('[Save Design] body:', Object.keys(req.body));
  const { prompt, imageDataUrl, masterUrl, previewUrl, thumbUrl, publicId } = req.body;

  if (!prompt || (!imageDataUrl && !masterUrl)) {
    return res.status(400).json({ message: 'Prompt and an image are required.' });
  }

  try {
    const doc = new Design({
      user: req.user.id,
      prompt,
      imageDataUrl: imageDataUrl || undefined,
      publicUrl: masterUrl || undefined,
      thumbUrl: thumbUrl || previewUrl || undefined,
      publicId: publicId || undefined,
    });

    const saved = await doc.save();
    return res.status(201).json(saved);
  } catch (error) {
    console.error('[Save Design] error:', error);
    return res.status(500).json({ message: 'Server error while saving design.', error: error.message });
  }
});

// ---------- Generate (T2I / I2I) ----------
router.post('/create', protect, createDesign);

// ---------- List (paged) ----------
router.get('/', protect, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '24', 10)));
    const skip  = (page - 1) * limit;

    const q = Design.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id prompt publicUrl thumbUrl imageDataUrl isSubmittedForContest contestSubmissionMonth votes createdAt')
      .lean();

    if (typeof q.allowDiskUse === 'function') q.allowDiskUse(true);
    const items = await q.exec();

    res.json({ items, page, hasMore: items.length === limit });
  } catch (error) {
    console.error('[Get My Designs] error:', error);
    res.status(500).json({ message: 'Server error while fetching designs.', error: error.message });
  }
});

// ---------- Delete (+ Cloudinary best-effort) ----------
let cloudinary = null;
const useCloudinary =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (useCloudinary) {
  const { v2 } = await import('cloudinary');
  v2.config({
    cloud_name: process.env.CLOUDINDARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  cloudinary = v2;
}

function cloudinaryPublicIdFromUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const uploadIdx = parts.findIndex((p) => p === 'upload');
    if (uploadIdx === -1) return null;
    const afterUpload = parts.slice(uploadIdx + 1);
    const first = afterUpload[0];
    const keyParts = first && /^v\d+$/i.test(first) ? afterUpload.slice(1) : afterUpload;
    if (!keyParts.length) return null;
    const filename = keyParts.pop() || '';
    const basename = filename.replace(/\.[a-z0-9]+$/i, '');
    const folder = keyParts.join('/');
    return folder ? `${folder}/${basename}` : basename;
  } catch {
    return null;
  }
}

router.delete('/:designId', protect, async (req, res) => {
  const { designId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(designId)) {
    return res.status(400).json({ message: 'Invalid design ID format.' });
  }

  try {
    const design = await Design.findOne({ _id: designId, user: req.user.id });
    if (!design) return res.status(404).json({ message: 'Design not found or unauthorized.' });

    if (useCloudinary && design.publicUrl) {
      const pid = design.publicId || cloudinaryPublicIdFromUrl(design.publicUrl);
      if (pid) {
        try {
          const result = await cloudinary.uploader.destroy(pid, { invalidate: true, resource_type: 'image' });
          console.log('[Delete Design] cloudinary destroy:', pid, result?.result);
        } catch (e) {
          console.warn('[Delete Design] Cloudinary destroy failed:', e?.message || e);
        }
      }
    }

    await design.deleteOne();
    res.json({ message: 'Design deleted successfully.' });
  } catch (error) {
    console.error('[Delete Design] error:', error);
    res.status(500).json({ message: 'Server error while deleting design.', error: error.message });
  }
});

export default router;
