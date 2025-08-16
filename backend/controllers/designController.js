// backend/controllers/designController.js
import 'dotenv/config';
import axios from 'axios';
import FormData from 'form-data';

// ---------- Config ----------
const STABILITY_API_KEY =
  process.env.STABILITY_API_KEY || process.env.STABILITY_AI_API_KEY;
const STABILITY_BASE = 'https://api.stability.ai';

// Long-edge target for print-ready art (DTG safe: 4096–4800 typical)
const TARGET_LONG_EDGE = parseInt(process.env.GEN_TARGET_LONG_EDGE || '4096', 10);

// Optional Cloudinary upload
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
  cloudinary = v2; // use cloudinary.url(...) below
}

// ---------- Helpers ----------
function dataUrlToBuffer(dataUrl) {
  if (!dataUrl) return null;
  const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  try { return Buffer.from(b64, 'base64'); } catch { return null; }
}
function bufferToDataUrl(buf, mime = 'image/png') {
  return `data:${mime};base64,${buf.toString('base64')}`;
}
function getPngDims(buf) {
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return { width: w, height: h };
}
function decideScale(longEdge) {
  if (longEdge >= TARGET_LONG_EDGE) return 1;
  if (longEdge * 4 <= TARGET_LONG_EDGE) return 4;
  if (longEdge * 2 <= TARGET_LONG_EDGE) return 2;
  return 1;
}

// ---------- Stability calls ----------
// v2beta Ultra — text-to-image AND image-to-image
// IMPORTANT: For i2i, DO NOT send width/height/aspect ratio. Output = init image size.
async function stableGenerateUltra({ prompt, aspectRatio = '1:1', initImageBuf = null, imageStrength }) {
  if (!STABILITY_API_KEY) {
    const err = new Error('STABILITY_API_KEY is not set');
    err.status = 500;
    throw err;
  }

  const form = new FormData();

  if (initImageBuf) {
    // IMAGE-TO-IMAGE
    form.append('image', initImageBuf, { filename: 'init.png', contentType: 'image/png' });
    form.append('prompt', prompt);
    form.append('output_format', 'png');

    // REQUIRED by /ultra i2i: strength 0..1
    const sRaw = (imageStrength ?? 0.35);
    const s = Math.min(1, Math.max(0, Number(sRaw)));
    form.append('strength', String(Number.isFinite(s) ? s : 0.35));
  } else {
    // TEXT-TO-IMAGE
    form.append('prompt', prompt);
    form.append('aspect_ratio', aspectRatio); // e.g. '1:1', '3:4', '4:3'
    form.append('output_format', 'png');
  }

  try {
    const { data } = await axios.post(
      `${STABILITY_BASE}/v2beta/stable-image/generate/ultra`,
      form,
      {
        headers: { Authorization: `Bearer ${STABILITY_API_KEY}`, ...form.getHeaders() },
        responseType: 'arraybuffer',
        timeout: 90000,
      }
    );
    return Buffer.from(data);
  } catch (e) {
    const status = e.response?.status;
    const body = e.response?.data;
    console.error('[Generate][ERROR] Ultra request failed', status || '', body?.toString?.() || e.message);
    throw e;
  }
}

// v2beta upscale 2× (preferred over old v1 ESRGAN)
async function stabilityUpscale2x(pngBuffer) {
  const form = new FormData();
  form.append('image', pngBuffer, { filename: 'in.png', contentType: 'image/png' });
  form.append('scale', '2');
  form.append('output_format', 'png');

  try {
    const { data } = await axios.post(
      `${STABILITY_BASE}/v2beta/stable-image/upscale/factor`,
      form,
      {
        headers: { Authorization: `Bearer ${STABILITY_API_KEY}`, ...form.getHeaders() },
        responseType: 'arraybuffer',
        timeout: 90000,
      }
    );
    return Buffer.from(data);
  } catch (e) {
    const status = e.response?.status;
    const body = e.response?.data;
    console.error('[Upscale][ERROR] 2x failed', status || '', body?.toString?.() || e.message);
    throw e;
  }
}

// ---------- Optional Cloudinary upload ----------
async function uploadPngToCloudinary(buf, { userId }) {
  if (!cloudinary) return { masterUrl: null, previewUrl: null, thumbUrl: null, publicId: null };

  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `tees_from_the_past/designs/master/${userId || 'anon'}`,
        resource_type: 'image',
        overwrite: true,
        format: 'png',
        quality: 'auto:best',
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buf);
  });

  const masterUrl = uploadResult?.secure_url || null;
  const publicId = uploadResult?.public_id || null;
  if (!masterUrl || !publicId) return { masterUrl: null, previewUrl: null, thumbUrl: null, publicId: null };

  const previewUrl = cloudinary.url(publicId, { width: 1200, crop: 'fit', format: 'jpg', quality: 'auto:good', secure: true });
  const thumbUrl   = cloudinary.url(publicId, { width: 400,  crop: 'fit', format: 'jpg', quality: 'auto:eco',  secure: true });

  return { masterUrl, previewUrl, thumbUrl, publicId };
}

// ---------- PUBLIC HANDLER ----------
export async function createDesign(req, res) {
  try {
    const { prompt, initImageBase64, aspectRatio, imageStrength } = req.body || {};
    if (!prompt && !initImageBase64) {
      return res.status(400).json({ message: 'Either a prompt or an init image is required.' });
    }

    const initBuf = initImageBase64 ? dataUrlToBuffer(initImageBase64) : null;
    if (initImageBase64 && !initBuf) {
      return res.status(400).json({ message: 'initImageBase64 is not a valid base64 data URL.' });
    }

    // 1) Generate base PNG (Ultra)
    const basePng = await stableGenerateUltra({
      prompt,
      aspectRatio: initBuf ? undefined : (aspectRatio || '1:1'),
      initImageBuf: initBuf || null,
      imageStrength, // 0..1 (required for i2i)
    });

    // 2) Upscale in 2× passes until target long edge
    const { width, height } = getPngDims(basePng);
    const longEdge = Math.max(width, height);
    const scale = decideScale(longEdge);

    let master = basePng;
    if (scale === 2) {
      master = await stabilityUpscale2x(basePng);
    } else if (scale === 4) {
      const p1 = await stabilityUpscale2x(basePng);
      master = await stabilityUpscale2x(p1);
    }

    // 3) Upload to Cloudinary (if configured)
    const { masterUrl, previewUrl, thumbUrl, publicId } =
      await uploadPngToCloudinary(master, { userId: req.user?._id?.toString() });

    // 4) Also return dataURL for instant on-page preview
    const imageDataUrl = bufferToDataUrl(master, 'image/png');

    res.json({
      imageDataUrl,
      masterUrl,
      previewUrl,
      thumbUrl,
      publicId,
      meta: {
        mode: initBuf ? 'i2i' : 't2i',
        sourceWidth: width,
        sourceHeight: height,
        targetLongEdge: TARGET_LONG_EDGE,
        scaleApplied: scale,
        uploadedToCloudinary: !!masterUrl,
      },
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const details = err.response?.data || err.message || 'Unknown error';
    console.error('[createDesign][ERROR]', status, details);
    res.status(500).json({ message: 'Failed to generate image.', error: details });
  }
}
