// backend/routes/generateImage.js
import express from 'express';
import axios from 'axios';
import FormData from 'form-data';
import 'dotenv/config';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const STABILITY_API_KEY =
  process.env.STABILITY_API_KEY || process.env.STABILITY_AI_API_KEY;
const STABILITY_HOST = 'https://api.stability.ai';

/**
 * IMPORTANT:
 * - Text-to-image: can set width/height (or use the v2beta "ultra" aspect ratio).
 * - Image-to-image: DO NOT send width/height. Output size = init image size.
 *   If you send w/h you'll get: “as of v1, this cannot be set for image-to-image…”
 *
 * This route returns only a preview dataURL + meta. You still save to DB via /api/designs (unchanged).
 */
router.post('/designs/create', protect, async (req, res) => {
  try {
    if (!STABILITY_API_KEY) {
      return res.status(500).json({ message: 'Stability API key not set on server.' });
    }

    const {
      prompt = '',
      // If present we do image-to-image; value should be a dataURL "data:image/png;base64,..."
      initImageBase64,
      // 0–1.0 (how much the init image influences)
      imageStrength = 0.35,
      // For text-to-image only. Keep 1:1 for now (you’re upscaling later).
      aspectRatio = '1:1',
      // Classic Art | Stencil Art | Embroidery Style (already handled in your UI prompt builder)
      // extra fields ignored here intentionally
    } = req.body || {};

    if (!prompt && !initImageBase64) {
      return res.status(400).json({ message: 'Provide a text prompt or an initial image.' });
    }

    const endpoint = `${STABILITY_HOST}/v2beta/stable-image/generate/ultra`;

    // Build FormData correctly for both modes.
    const form = new FormData();
    form.append('prompt', prompt || '');
    form.append('output_format', 'png');

    // Image-to-Image
    if (initImageBase64) {
      const b64 = initImageBase64.includes(',')
        ? initImageBase64.split(',')[1]
        : initImageBase64;
      const buf = Buffer.from(b64, 'base64');

      // i2i: DO NOT add width/height or aspect ratio. That causes the 400 you’re seeing.
      form.append('image', buf, { filename: 'init.png', contentType: 'image/png' });
      // The new v2beta endpoint honors this param:
      form.append('image_strength', String(Math.max(0, Math.min(1, Number(imageStrength) || 0.35))));
    } else {
      // Text-to-Image: this endpoint accepts aspect_ratio like "1:1", "3:4", etc.
      form.append('aspect_ratio', aspectRatio || '1:1');
      // (No explicit width/height here, v2beta/ultra will size appropriately for the ratio)
    }

    const { data } = await axios.post(endpoint, form, {
      headers: {
        Authorization: `Bearer ${STABILITY_API_KEY}`,
        ...form.getHeaders(),
      },
      responseType: 'arraybuffer', // we want the raw PNG
      timeout: 60000,
    });

    const pngBuffer = Buffer.from(data);
    const dataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;

    // Very small IHDR read for dimensions (optional)
    const width = pngBuffer.readUInt32BE(16);
    const height = pngBuffer.readUInt32BE(20);

    return res.json({
      imageDataUrl: dataUrl,
      meta: {
        mode: initImageBase64 ? 'image-to-image' : 'text-to-image',
        width,
        height,
        imageStrength: initImageBase64 ? Number(imageStrength) : undefined,
      },
    });
  } catch (err) {
    const apiErr = err.response?.data;
    return res.status(500).json({
      message: 'Failed to generate image.',
      error: apiErr || { name: err.name, message: err.message },
    });
  }
});

export default router;
