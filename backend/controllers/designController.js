// backend/controllers/designController.js
import 'dotenv/config';
import axios from 'axios';
import FormData from 'form-data';

const STABILITY_API_KEY =
  process.env.STABILITY_API_KEY || process.env.STABILITY_AI_API_KEY;
const STABILITY_BASE = 'https://api.stability.ai';

// Long-edge target for print-ready art
const TARGET_LONG_EDGE = parseInt(process.env.GEN_TARGET_LONG_EDGE || '4096', 10);

// ---------- helpers ----------
function parseDataUrl(dataUrl) {
  // returns { buffer, mime, ext } or null
  if (!dataUrl) return null;
  try {
    const parts = String(dataUrl).split(',');
    const meta = parts[0];
    const b64 = parts[1];
    if (!meta || !b64) return null;
    const m = /^data:([^;]+);base64$/i.exec(meta.trim());
    const mime = (m && m[1]) || 'application/octet-stream';
    const ext = (() => {
      if (mime.includes('png')) return 'png';
      if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
      if (mime.includes('webp')) return 'webp';
      if (mime.includes('gif')) return 'gif';
      return 'bin';
    })();
    const buffer = Buffer.from(b64, 'base64');
    return { buffer, mime, ext };
  } catch {
    return null;
  }
}

function bufferToDataUrl(buf, mime = 'image/png') {
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function getPngDims(buf) {
  // Stability returns PNG here; guard just in case
  try {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    return { width: w, height: h };
  } catch {
    return { width: undefined, height: undefined };
  }
}

function decideScale(longEdge) {
  if (!Number.isFinite(longEdge)) return 1;
  if (longEdge >= TARGET_LONG_EDGE) return 1;
  if (longEdge * 4 <= TARGET_LONG_EDGE) return 4;
  if (longEdge * 2 <= TARGET_LONG_EDGE) return 2;
  return 1;
}

// Turn axios error/arraybuffer into readable text
function decodeNonImageBody(data) {
  if (!data) return '';
  try {
    const str = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
    try {
      const j = JSON.parse(str);
      return j.message || j.error || str;
    } catch {
      return str;
    }
  } catch {
    return '(binary response)';
  }
}

// ---------- Stability: Ultra generate (T2I / I2I) ----------
async function stableGenerateUltra({
  prompt,
  negativePrompt,
  aspectRatio = '1:1',
  initImage, // { buffer, mime, ext } | null
  imageStrength,
  cfgScale,
  steps,
}) {
  if (!STABILITY_API_KEY) {
    const err = new Error('STABILITY_API_KEY is not set on the server');
    err.status = 500;
    throw err;
  }

  const form = new FormData();

  // Shared
  form.append('prompt', String(prompt || '').slice(0, 2000));
  if (negativePrompt) form.append('negative_prompt', String(negativePrompt).slice(0, 2000));
  if (Number.isFinite(cfgScale)) form.append('cfg_scale', String(Math.max(1, Math.min(20, Math.round(cfgScale)))));
  if (Number.isFinite(steps)) form.append('steps', String(Math.max(10, Math.min(50, Math.round(steps)))));

  if (initImage?.buffer) {
    // I2I — use correct MIME + filename
    const filename = `init.${initImage.ext || 'png'}`;
    form.append('image', initImage.buffer, { filename, contentType: initImage.mime || 'image/png' });
    form.append('output_format', 'png');
    if (imageStrength !== undefined && imageStrength !== null) {
      const s = Math.max(0, Math.min(1, Number(imageStrength)));
      form.append('strength', String(Number.isFinite(s) ? s : 0.35));
    }
  } else {
    // T2I
    form.append('aspect_ratio', aspectRatio);
    form.append('output_format', 'png');
  }

  const cfg = {
    headers: {
      Authorization: `Bearer ${STABILITY_API_KEY}`,
      Accept: 'image/*,application/octet-stream,application/json',
      ...form.getHeaders(),
    },
    responseType: 'arraybuffer',
    timeout: 120000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    validateStatus: () => true, // we’ll handle non-2xx
  };

  const { data, headers, status } = await axios.post(
    `${STABILITY_BASE}/v2beta/stable-image/generate/ultra`,
    form,
    cfg
  );

  const contentType = String(headers['content-type'] || '');
  if (status < 200 || status >= 300 || !contentType.startsWith('image/')) {
    const text = decodeNonImageBody(data);
    const err = new Error(text || `Stability returned ${contentType || 'non-image'} response`);
    err.status = status || 502;
    throw err;
  }

  return Buffer.from(data);
}

// ---------- Stability: Upscale ×2 (v2beta) ----------
async function stabilityUpscale2x(pngBuffer) {
  const form = new FormData();
  form.append('image', pngBuffer, { filename: 'in.png', contentType: 'image/png' });
  form.append('scale', '2');
  form.append('output_format', 'png');

  const cfg = {
    headers: {
      Authorization: `Bearer ${STABILITY_API_KEY}`,
      Accept: 'image/*,application/octet-stream,application/json',
      ...form.getHeaders(),
    },
    responseType: 'arraybuffer',
    timeout: 120000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    validateStatus: () => true,
  };

  const { data, headers, status } = await axios.post(
    `${STABILITY_BASE}/v2beta/stable-image/upscale/factor`,
    form,
    cfg
  );

  const contentType = String(headers['content-type'] || '');
  if (status < 200 || status >= 300 || !contentType.startsWith('image/')) {
    const text = decodeNonImageBody(data);
    const err = new Error(text || 'Upscale failed with non-image response');
    err.status = status || 502;
    throw err;
  }
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
  const thumbUrl = cloudinary.url(publicId, { width: 400, crop: 'fit', format: 'jpg', quality: 'auto:eco', secure: true });

  return { masterUrl, previewUrl, thumbUrl, publicId };
}

// ---------- PUBLIC HANDLER ----------
export async function createDesign(req, res) {
  const {
    prompt,
    negativePrompt,
    initImageBase64,
    aspectRatio,
    imageStrength,
    cfgScale,
    steps,
  } = req.body || {};

  try {
    const init = initImageBase64 ? parseDataUrl(initImageBase64) : null;
    if (!prompt && !init?.buffer) {
      return res.status(400).json({ message: 'Either a prompt or an init image is required.' });
    }

    console.log(
      '[Generate] mode=%s, hasKey=%s, initMime=%s',
      init?.buffer ? 'i2i' : 't2i',
      !!STABILITY_API_KEY,
      init?.mime || '-'
    );

    // 1) generate
    const basePng = await stableGenerateUltra({
      prompt,
      negativePrompt,
      aspectRatio: init?.buffer ? undefined : (aspectRatio || '1:1'),
      initImage: init || null,
      imageStrength,
      cfgScale,
      steps,
    });

    // 2) upscale to target long edge
    const { width, height } = getPngDims(basePng);
    const longEdge = Math.max(width || 0, height || 0);
    const scale = decideScale(longEdge);

    let master = basePng;
    if (scale === 2) {
      master = await stabilityUpscale2x(basePng);
    } else if (scale === 4) {
      const p1 = await stabilityUpscale2x(basePng);
      master = await stabilityUpscale2x(p1);
    }

    // 3) upload (optional)
    const { masterUrl, previewUrl, thumbUrl, publicId } =
      await uploadPngToCloudinary(master, { userId: req.user?._id?.toString() });

    // 4) respond
    const imageDataUrl = bufferToDataUrl(master, 'image/png');
    res.json({
      imageDataUrl,
      masterUrl,
      previewUrl,
      thumbUrl,
      publicId,
      meta: {
        mode: init?.buffer ? 'i2i' : 't2i',
        sourceWidth: width,
        sourceHeight: height,
        targetLongEdge: TARGET_LONG_EDGE,
        scaleApplied: scale,
        uploadedToCloudinary: !!masterUrl,
        cfgScale: Number.isFinite(cfgScale) ? Math.max(1, Math.min(20, Math.round(cfgScale))) : undefined,
        steps: Number.isFinite(steps) ? Math.max(10, Math.min(50, Math.round(steps))) : undefined,
        aspectRatio: init?.buffer ? undefined : (aspectRatio || '1:1'),
        imageStrength: init?.buffer ? Math.max(0, Math.min(1, Number(imageStrength))) : undefined,
        negativePrompt: negativePrompt || undefined,
      },
    });
  } catch (err) {
    const status = err.status || err.response?.status || 500;
    const details =
      (err.response?.data && decodeNonImageBody(err.response.data)) ||
      err.details ||
      err.message ||
      'Unknown error';
    console.error('[createDesign][ERROR]', status, details);
    res.status(status >= 400 && status < 600 ? status : 500).json({
      message: 'Failed to generate image.',
      error: details,
    });
  }
}
