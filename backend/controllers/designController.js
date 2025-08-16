// backend/controllers/designController.js
import 'dotenv/config';
import axios from 'axios';
import FormData from 'form-data';

const STABILITY_API_KEY =
  process.env.STABILITY_API_KEY || process.env.STABILITY_AI_API_KEY;
const STABILITY_BASE = 'https://api.stability.ai';

// Long-edge target for print-ready art (DTG safe: 4096–4800 typical)
const TARGET_LONG_EDGE = parseInt(process.env.GEN_TARGET_LONG_EDGE || '4096', 10);

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

// ---------- Stability: Ultra generate (T2I or I2I) ----------
async function stableGenerateUltra({ prompt, aspectRatio = '1:1', initImageBuf = null, imageStrength }) {
  if (!STABILITY_API_KEY) {
    const err = new Error('STABILITY_API_KEY is not set');
    err.status = 500; throw err;
  }

  const form = new FormData();

  if (initImageBuf) {
    // I2I: do NOT send width/height/aspect; output matches init image
    form.append('image', initImageBuf, { filename: 'init.png', contentType: 'image/png' });
    form.append('prompt', prompt);
    form.append('output_format', 'png');
    if (typeof imageStrength !== 'undefined' && imageStrength !== null) {
      const s = Math.max(0, Math.min(1, Number(imageStrength)));
      form.append('strength', String(Number.isFinite(s) ? s : 0.35));
    }
  } else {
    // T2I
    form.append('prompt', prompt);
    form.append('aspect_ratio', aspectRatio);
    form.append('output_format', 'png');
  }

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
}

// ---------- Stability: v2beta upscale ×2 ----------
async function stabilityUpscale2x(pngBuffer) {
  const form = new FormData();
  form.append('image', pngBuffer, { filename: 'in.png', contentType: 'image/png' });
  form.append('scale', '2');
  form.append('output_format', 'png');

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
}

// ---------- Optional Cloudinary upload ----------
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

    // 1) Generate base
    const basePng = await stableGenerateUltra({
      prompt,
      aspectRatio: initBuf ? undefined : (aspectRatio || '1:1'),
      initImageBuf: initBuf || null,
      imageStrength,
    });

    // 2) Upscale to target
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

    // 3) Upload (optional)
    const { masterUrl, previewUrl, thumbUrl, publicId } =
      await uploadPngToCloudinary(master, { userId: req.user?._id?.toString() });

    // 4) Return preview + URLs
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
