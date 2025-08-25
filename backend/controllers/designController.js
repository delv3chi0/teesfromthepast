import 'dotenv/config';
import axios from 'axios';
import FormData from 'form-data';

const STABILITY_API_KEY =
  process.env.STABILITY_API_KEY || process.env.STABILITY_AI_API_KEY;
const STABILITY_BASE = 'https://api.stability.ai';

// Long-edge target for print-ready art
const TARGET_LONG_EDGE = parseInt(process.env.GEN_TARGET_LONG_EDGE || '4096', 10);
const DISABLE_UPSCALE = String(process.env.GEN_DISABLE_UPSCALE || '').trim() === '1';

// ---------- helpers ----------
function parseDataUrl(dataUrl) {
  // returns { buffer, mime, ext } or null
  if (!dataUrl) return null;
  try {
    const [meta, b64] = dataUrl.split(',');
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
  // Only call this on PNGs returned by Stability
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

// Build form for T2I or I2I
function buildStabilityForm({ prompt, negativePrompt, aspectRatio, initImage, imageStrength, cfgScale, steps }) {
  const form = new FormData();
  form.append('prompt', String(prompt || '').slice(0, 2000));
  if (negativePrompt) form.append('negative_prompt', String(negativePrompt).slice(0, 2000));
  if (Number.isFinite(cfgScale)) form.append('cfg_scale', String(Math.max(1, Math.min(20, Math.round(cfgScale)))));
  if (Number.isFinite(steps))    form.append('steps', String(Math.max(10, Math.min(50, Math.round(steps)))));

  if (initImage?.buffer) {
    const filename = `init.${initImage.ext || 'png'}`;
    form.append('image', initImage.buffer, { filename, contentType: initImage.mime || 'image/png' });
    form.append('output_format', 'png');
    if (imageStrength !== undefined && imageStrength !== null) {
      const s = Math.max(0, Math.min(1, Number(imageStrength)));
      form.append('strength', String(Number.isFinite(s) ? s : 0.35));
    }
  } else {
    form.append('aspect_ratio', aspectRatio || '1:1');
    form.append('output_format', 'png');
  }
  return form;
}

async function postStability({ endpointPath, form }) {
  if (!STABILITY_API_KEY) {
    const err = new Error('STABILITY_API_KEY is not set on the server');
    err.status = 500; throw err;
  }

  const url = `${STABILITY_BASE}${endpointPath}`;
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

  const { data, headers, status } = await axios.post(url, form, cfg);
  const contentType = String(headers['content-type'] || '');

  if (status >= 200 && status < 300 && contentType.startsWith('image/')) {
    return Buffer.from(data);
  }

  // decode for logs / error
  let bodyText = '';
  try { bodyText = Buffer.from(data).toString('utf8'); } catch {}
  const msg = `${status} ${contentType || ''} ${bodyText.slice(0, 800)}`.trim();
  const err = new Error(msg || `Stability error (${status})`);
  err.status = status;
  err._stabilityDetails = { status, contentType, body: bodyText };
  throw err;
}

// Generate with Ultra → Core fallback
async function stableGenerateWithFallback(payload) {
  const form = buildStabilityForm(payload);
  const paths = [
    '/v2beta/stable-image/generate/ultra',
    '/v2beta/stable-image/generate/core',
  ];
  let lastErr = null;
  for (const p of paths) {
    try {
      console.log(`[Stability] Trying ${p} (${payload?.initImage?.buffer ? 'i2i' : 't2i'})`);
      return await postStability({ endpointPath: p, form });
    } catch (e) {
      lastErr = e;
      console.warn(`[Stability] ${p} failed:`, e?.message);
      continue;
    }
  }
  throw lastErr || new Error('All Stability generate endpoints failed');
}

// Upscale ×2 (v2beta)
async function stabilityUpscale2x(pngBuffer) {
  const form = new FormData();
  form.append('image', pngBuffer, { filename: 'in.png', contentType: 'image/png' });
  form.append('scale', '2');
  form.append('output_format', 'png');

  const { data, headers, status } = await axios.post(
    `${STABILITY_BASE}/v2beta/stable-image/upscale/factor`,
    form,
    {
      headers: { Authorization: `Bearer ${STABILITY_API_KEY}`, ...form.getHeaders() },
      responseType: 'arraybuffer',
      timeout: 120000,
      validateStatus: () => true,
    }
  );

  const contentType = String(headers['content-type'] || '');
  if (status >= 200 && status < 300 && contentType.startsWith('image/')) {
    return Buffer.from(data);
  }

  let errText = '';
  try { errText = Buffer.from(data).toString('utf8'); } catch {}
  const err = new Error(`Upscale failed: ${status} ${contentType} ${errText.slice(0, 400)}`.trim());
  err.status = status;
  err._stabilityDetails = { status, contentType, body: errText };
  throw err;
}

// ---------- Optional Cloudinary upload ----------
let cloudinary = null;
const useCloudinary =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

// Initialize Cloudinary asynchronously
let cloudinaryInitialized = false;
const initCloudinary = async () => {
  if (useCloudinary && !cloudinaryInitialized) {
    const { v2 } = await import('cloudinary');
    v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    cloudinary = v2;
    cloudinaryInitialized = true;
  }
};

async function uploadPngToCloudinary(buf, { userId }) {
  await initCloudinary();
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

    const mode = init?.buffer ? 'i2i' : 't2i';
    console.log('[Generate] mode=%s, keyPresent=%s', mode, !!STABILITY_API_KEY);

    // 1) generate (Ultra→Core fallback)
    const basePng = await stableGenerateWithFallback({
      prompt,
      negativePrompt,
      aspectRatio: mode === 't2i' ? (aspectRatio || '1:1') : undefined,
      initImage: init || null,
      imageStrength,
      cfgScale,
      steps,
    });

    // 2) optional upscale to target long edge
    const { width, height } = getPngDims(basePng);
    const longEdge = Math.max(width, height);
    const scale = DISABLE_UPSCALE ? 1 : decideScale(longEdge);

    let master = basePng;
    let upscaleAttempted = false;
    let upscaleError = undefined;

    if (scale === 2 || scale === 4) {
      upscaleAttempted = true;
      try {
        if (scale === 2) {
          master = await stabilityUpscale2x(basePng);
        } else if (scale === 4) {
          const p1 = await stabilityUpscale2x(basePng);
          master = await stabilityUpscale2x(p1);
        }
      } catch (e) {
        // IMPORTANT: Do not fail the whole request if upscale endpoint is unavailable.
        upscaleError = e?.message || 'Upscale failed';
        console.warn('[Upscale] Skipping upscale due to error:', upscaleError);
        master = basePng; // fall back to base image
      }
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
        mode,
        sourceWidth: width,
        sourceHeight: height,
        targetLongEdge: TARGET_LONG_EDGE,
        scaleApplied: scale,
        uploadedToCloudinary: !!masterUrl,
        cfgScale: Number.isFinite(cfgScale) ? Math.max(1, Math.min(20, Math.round(cfgScale))) : undefined,
        steps: Number.isFinite(steps) ? Math.max(10, Math.min(50, Math.round(steps))) : undefined,
        aspectRatio: mode === 't2i' ? (aspectRatio || '1:1') : undefined,
        imageStrength: mode === 'i2i' ? Math.max(0, Math.min(1, Number(imageStrength))) : undefined,
        negativePrompt: negativePrompt || undefined,
        upscaleAttempted,
        upscaleError, // present if we skipped due to a failure (e.g., 404)
        upscaleDisabledByEnv: DISABLE_UPSCALE || undefined,
      },
    });
  } catch (err) {
    const status = err.status || err.response?.status || 500;
    const details =
      err._stabilityDetails?.body ||
      err.details ||
      (err.response?.data && err.response.data.toString?.('utf8')) ||
      err.message ||
      'Unknown error';
    console.error('[createDesign][ERROR]', status, details);
    res.status(status >= 400 && status < 600 ? status : 500).json({
      message: 'Failed to generate image.',
      error: details,
    });
  }
}
