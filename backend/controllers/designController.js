// backend/controllers/designController.js
import 'dotenv/config';
import axios from 'axios';
import FormData from 'form-data';

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const STABILITY_BASE = 'https://api.stability.ai';

// Pick your target long edge. 4096–4800 is typical for DTG print areas.
// You can tweak via .env: GEN_TARGET_LONG_EDGE=4096 (or 4800)
const TARGET_LONG_EDGE = parseInt(process.env.GEN_TARGET_LONG_EDGE || '4096', 10);

// --- Optional Cloudinary upload ---
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

// ---------- helpers ----------
function dataUrlToBuffer(dataUrl) {
  const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return Buffer.from(b64, 'base64');
}
function bufferToDataUrl(buf, mime = 'image/png') {
  return `data:${mime};base64,${buf.toString('base64')}`;
}
function getPngDims(buf) {
  // PNG IHDR: width @ byte 16, height @ byte 20 (big-endian)
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
  form.append('aspect_ratio', aspectRatio);          // e.g., '1:1', '3:4', '4:3'
  form.append('output_format', 'png');               // keep transparency
  if (initImageBuf) {
    form.append('image', initImageBuf, { filename: 'init.png', contentType: 'image/png' });
  }

  const { data } = await axios.post(
    `${STABILITY_BASE}/v2beta/stable-image/generate/ultra`,
    form,
    {
      headers: { Authorization: `Bearer ${STABILITY_API_KEY}`, ...form.getHeaders() },
      responseType: 'arraybuffer',
      timeout: 60000,
    }
  );
  return Buffer.from(data);
}

async function stabilityUpscale2x(pngBuffer) {
  // If you have Stability’s upscale endpoint/model; otherwise skip or swap to Cloudinary Eager transforms.
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
      timeout: 60000,
    }
  );
  return Buffer.from(data);
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

  // Delivery transforms via URL (no extra storage)
  const previewUrl = cloudinary.url(publicId, { width: 1200, crop: 'fit', format: 'jpg', quality: 'auto:good', secure: true });
  const thumbUrl   = cloudinary.url(publicId, { width: 400,  crop: 'fit', format: 'jpg', quality: 'auto:eco',  secure: true });

  return { masterUrl, previewUrl, thumbUrl, publicId };
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

    // 2) Upscale as needed to reach TARGET_LONG_EDGE (2× or 4×)
    const { width, height } = getPngDims(basePng);
    const scale = decideScale(width, height);

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

    // 4) Also return a dataURL (useful for previewing immediately)
    const imageDataUrl = bufferToDataUrl(master, 'image/png');

    res.json({
      imageDataUrl,       // big base64 (for immediate UI preview)
      masterUrl,          // full-size PNG on Cloudinary (for Printify & “Download Full”)
      previewUrl,         // w=1200 jpg (modal preview)
      thumbUrl,           // w=400  jpg (grid)
      publicId,
      meta: {
        sourceWidth: width,
        sourceHeight: height,
        targetLongEdge: TARGET_LONG_EDGE,
        scaleApplied: scale,
        uploadedToCloudinary: !!masterUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}
