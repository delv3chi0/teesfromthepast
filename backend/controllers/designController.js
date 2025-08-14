// backend/controllers/designController.js
import 'dotenv/config';
import axios from 'axios';
import FormData from 'form-data';

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const STABILITY_BASE = 'https://api.stability.ai';

// Aim for ~3K long edge (good for tees). Bump to 3840 if you prefer.
const TARGET_LONG_EDGE = parseInt(process.env.GEN_TARGET_LONG_EDGE || '3072', 10);

// --- Optional Cloudinary upload ---
let cloudinary = null;
const useCloudinary =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (useCloudinary) {
  // Lazy import to avoid requiring if you don't use it
  const { v2 } = await import('cloudinary');
  v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  cloudinary = v2;
}

// ---------- helpers ----------
function dataUrlToBuffer(dataUrl) {
  const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return Buffer.from(b64, 'base64');
}
function bufferToDataUrl(buf, mime = 'image/png') {
  return `data:${mime};base64,${buf.toString('base64')}`;
}
// Quick IHDR width/height read
function getPngDims(buf) {
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return { width: w, height: h };
}
function decideScale(w, h) {
  const longEdge = Math.max(w, h);
  if (longEdge >= TARGET_LONG_EDGE) return 1;
  if (longEdge * 4 <= TARGET_LONG_EDGE) return 4;
  if (longEdge * 2 <= TARGET_LONG_EDGE) return 2;
  return 1;
}

// ---------- Stability core calls ----------
async function stableGenerateUltra({ prompt, aspectRatio = '1:1', initImageBuf = null }) {
  if (!STABILITY_API_KEY) {
    const err = new Error('STABILITY_API_KEY is not set');
    err.status = 500;
    throw err;
  }
  const form = new FormData();
  form.append('prompt', prompt);
  form.append('aspect_ratio', aspectRatio); // e.g. "1:1", "3:4", "16:9"
  form.append('output_format', 'png');

  if (initImageBuf) {
    form.append('image', initImageBuf, { filename: 'init.png', contentType: 'image/png' });
  }

  const { data } = await axios.post(
    `${STABILITY_BASE}/v2beta/stable-image/generate/ultra`,
    form,
    {
      headers: { Authorization: `Bearer ${STABILITY_API_KEY}`, ...form.getHeaders() },
      responseType: 'arraybuffer',
    }
  );
  return Buffer.from(data);
}

// Reliable 2× ESRGAN. For 4× we chain two passes.
async function stabilityUpscale2x(pngBuffer) {
  // Using v1 ESRGAN x2 endpoint for robustness
  const model = 'esrgan-v1-x2plus';
  const form = new FormData();
  form.append('image', pngBuffer, { filename: 'in.png', contentType: 'image/png' });
  form.append('scale', '2');

  const { data } = await axios.post(
    `${STABILITY_BASE}/v1/generation/${model}/image-to-image/upscale`,
    form,
    {
      headers: { Authorization: `Bearer ${STABILITY_API_KEY}`, ...form.getHeaders() },
      responseType: 'arraybuffer',
    }
  );
  return Buffer.from(data);
}

// ---------- Optional Cloudinary upload ----------
async function uploadPngToCloudinary(buf, { userId }) {
  if (!cloudinary) return { masterUrl: null, previewUrl: null };

  // master: original upscaled PNG
  const masterUpload = await cloudinary.uploader.upload_stream({
    folder: `designs/master/${userId || 'anon'}`,
    resource_type: 'image',
    overwrite: true,
    format: 'png',
    type: 'upload',
  });

  const masterUrl = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `designs/master/${userId || 'anon'}`,
        resource_type: 'image',
        overwrite: true,
        format: 'png',
      },
      (err, result) => (err ? reject(err) : resolve(result?.secure_url))
    );
    stream.end(buf);
  });

  // preview: transform (server-side) to 1200px JPG quality ~85
  // (Don’t re-upload bytes—use delivery transformation)
  // Build preview URL from master public_id if you prefer; here we just request a derived preview.
  let previewUrl = masterUrl;
  if (masterUrl) {
    // crude transform injection for delivery URLs
    previewUrl = masterUrl.replace('/upload/', '/upload/w_1200,q_auto:good,f_jpg/');
  }

  return { masterUrl, previewUrl };
}

// ---------- PUBLIC HANDLER ----------
export async function createDesign(req, res, next) {
  try {
    const { prompt, initImageBase64, aspectRatio } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

    const initBuf = initImageBase64 ? dataUrlToBuffer(initImageBase64) : null;

    // 1) Generate base PNG
    const basePng = await stableGenerateUltra({
      prompt,
      aspectRatio: aspectRatio || '1:1',
      initImageBuf: initBuf,
    });

    // 2) Upscale
    const { width, height } = getPngDims(basePng);
    const scale = decideScale(width, height);

    let master = basePng;
    if (scale === 2) {
      master = await stabilityUpscale2x(basePng);
    } else if (scale === 4) {
      const pass1 = await stabilityUpscale2x(basePng);
      master = await stabilityUpscale2x(pass1);
    }

    // 3) Optional upload to Cloudinary
    let masterUrl = null;
    let previewUrl = null;
    if (useCloudinary) {
      ({ masterUrl, previewUrl } = await uploadPngToCloudinary(master, { userId: req.user?._id?.toString() }));
    }

    // 4) Always return a data URL so your Generate page keeps working right now
    const imageDataUrl = bufferToDataUrl(master, 'image/png');

    res.json({
      imageDataUrl,       // for immediate preview (your current UI)
      masterUrl,          // null if Cloudinary isn’t configured
      previewUrl,         // null if Cloudinary isn’t configured
      meta: {
        baseWidth: width,
        baseHeight: height,
        scaleApplied: scale,
        targetLongEdge: TARGET_LONG_EDGE,
        uploadedToCloudinary: !!masterUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}
