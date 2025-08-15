// backend/routes/generateImage.js
import express from "express";
import axios from "axios";
import FormData from "form-data";
import "dotenv/config";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ---- ENV ----
const STABILITY_API_KEY = process.env.STABILITY_API_KEY || process.env.STABILITY_AI_API_KEY;
const ENGINE_ID = process.env.STABILITY_API_ENGINE_ID || "stable-diffusion-xl-1024-v1-0";
const TARGET_LONG = parseInt(process.env.GEN_TARGET_LONG_EDGE || "2048", 10);
const HOST = process.env.STABILITY_API_HOST || "https://api.stability.ai";

// ---- log helpers ----
const log = (...a) => console.log("[GenerateImage]", ...a);
const logErr = (...a) => console.error("[GenerateImage][ERROR]", ...a);

// ---- PNG helpers ----
function pngDims(buf) {
  try {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    return { width: w, height: h };
  } catch {
    return { width: 0, height: 0 };
  }
}
const longEdgeOf = (buf) => Math.max(...Object.values(pngDims(buf)));
const toDataUrl = (buf, mime = "image/png") => `data:${mime};base64,${buf.toString("base64")}`;

// ---- SDXL text-to-image ----
async function sdxlTextToImage({ prompt, width = 1024, height = 1024, steps = 30, cfg_scale = 7 }) {
  if (!STABILITY_API_KEY) throw Object.assign(new Error("STABILITY_API_KEY missing"), { status: 500 });
  const body = {
    text_prompts: [{ text: prompt }],
    cfg_scale,
    height,
    width,
    steps,
    samples: 1,
  };
  const url = `${HOST}/v1/generation/${ENGINE_ID}/text-to-image`;
  const { data } = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${STABILITY_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    maxBodyLength: Infinity,
  });
  const art = data?.artifacts?.[0];
  if (!art?.base64) throw new Error("No image data in SDXL response");
  return Buffer.from(art.base64, "base64");
}

// ---- SDXL image-to-image ----
async function sdxlImageToImage({ prompt, initImageBase64 }) {
  if (!STABILITY_API_KEY) throw Object.assign(new Error("STABILITY_API_KEY missing"), { status: 500 });
  const form = new FormData();
  const b64 = (initImageBase64 || "").split(",").pop();
  form.append("init_image", Buffer.from(b64, "base64"), { filename: "init.png", contentType: "image/png" });
  form.append("text_prompts[0][text]", prompt);
  form.append("text_prompts[0][weight]", "1");
  form.append("init_image_mode", "IMAGE_STRENGTH");
  form.append("image_strength", "0.35");
  form.append("cfg_scale", "7");
  form.append("height", "1024");
  form.append("width", "1024");
  form.append("steps", "30");
  form.append("samples", "1");

  const url = `${HOST}/v1/generation/${ENGINE_ID}/image-to-image`;
  const { data } = await axios.post(url, form, {
    headers: { Authorization: `Bearer ${STABILITY_API_KEY}`, ...form.getHeaders(), Accept: "application/json" },
    maxBodyLength: Infinity,
  });
  const art = data?.artifacts?.[0];
  if (!art?.base64) throw new Error("No image data in image-to-image response");
  return Buffer.from(art.base64, "base64");
}

// ---- Upscalers ----

// v2beta – accepts `image` + either scale or explicit width/height.
// We’ll support both styles.
async function upscale_v2beta({ buf, scale = 2, width, height }) {
  const form = new FormData();
  form.append("image", buf, { filename: "in.png", contentType: "image/png" });
  if (scale) form.append("scale", String(scale));
  if (width) form.append("width", String(width));
  if (height) form.append("height", String(height));
  form.append("output_format", "png"); // MUST for bytes

  const url = `${HOST}/v2beta/stable-image/upscale`;
  const resp = await axios.post(url, form, {
    headers: { Authorization: `Bearer ${STABILITY_API_KEY}`, ...form.getHeaders(), Accept: "image/png" },
    responseType: "arraybuffer",
    maxBodyLength: Infinity,
  });
  return Buffer.from(resp.data);
}

// ESRGAN v1 – returns JSON with artifacts[0].base64
async function upscale_esrgan_v1({ buf, scale = 2 }) {
  const form = new FormData();
  form.append("image", buf, { filename: "in.png", contentType: "image/png" });
  form.append("scale", String(scale));

  const url = `${HOST}/v1/generation/esrgan-v1-x2plus/image-to-image/upscale`;
  const { data } = await axios.post(url, form, {
    headers: { Authorization: `Bearer ${STABILITY_API_KEY}`, ...form.getHeaders(), Accept: "application/json" },
    responseType: "json",
    maxBodyLength: Infinity,
  });

  const art = data?.artifacts?.[0];
  if (!art?.base64) throw new Error("ESRGAN response missing artifacts[0].base64");
  return Buffer.from(art.base64, "base64");
}

// Try multiple strategies; record each attempt.
async function upscaleOnce(buf) {
  const attempts = [];

  // 1) v2beta with explicit scale
  try {
    const out = await upscale_v2beta({ buf, scale: 2 });
    const before = pngDims(buf), after = pngDims(out);
    attempts.push({ step: "v2beta-scale", from: before, to: after, ok: true });
    if (longEdgeOf(out) > longEdgeOf(buf)) return { out, attempts };
    // fall through if no growth
  } catch (e) {
    attempts.push({ step: "v2beta-scale", error: e?.response?.status || e?.message || "err" });
  }

  // 2) v2beta with explicit width/height (double)
  try {
    const { width: w, height: h } = pngDims(buf);
    const out = await upscale_v2beta({ buf, width: w * 2, height: h * 2 });
    const before = pngDims(buf), after = pngDims(out);
    attempts.push({ step: "v2beta-width-height", from: before, to: after, ok: true });
    if (longEdgeOf(out) > longEdgeOf(buf)) return { out, attempts };
  } catch (e) {
    attempts.push({ step: "v2beta-width-height", error: e?.response?.status || e?.message || "err" });
  }

  // 3) ESRGAN v1
  try {
    const out = await upscale_esrgan_v1({ buf, scale: 2 });
    const before = pngDims(buf), after = pngDims(out);
    attempts.push({ step: "esrgan-v1", from: before, to: after, ok: true });
    if (longEdgeOf(out) > longEdgeOf(buf)) return { out, attempts };
  } catch (e) {
    attempts.push({ step: "esrgan-v1", error: e?.response?.status || e?.message || "err" });
  }

  // No growth → return original, but include attempts for debugging
  return { out: buf, attempts };
}

async function upscaleToTarget(buf, targetLong) {
  const attemptsAll = [];
  let out = buf;
  while (targetLong > 0 && longEdgeOf(out) < targetLong) {
    const res = await upscaleOnce(out);
    attemptsAll.push(...res.attempts);
    if (longEdgeOf(res.out) <= longEdgeOf(out)) break; // safety (no improvement)
    out = res.out;
  }
  return { buf: out, attempts: attemptsAll };
}

// ---- Routes ----
router.get("/designs/health", protect, (req, res) => {
  res.json({
    ok: true,
    stabilityKeyPresent: !!STABILITY_API_KEY,
    engineId: ENGINE_ID,
    targetLong: TARGET_LONG,
  });
});

router.post("/designs/create", protect, async (req, res) => {
  const { prompt, initImageBase64 } = req.body || {};
  if (!prompt && !initImageBase64) return res.status(400).json({ message: "Prompt or init image required." });
  if (!STABILITY_API_KEY) return res.status(500).json({ message: "STABILITY_API_KEY is not configured." });

  try {
    let base;
    if (initImageBase64) {
      log("Image-to-image");
      base = await sdxlImageToImage({ prompt, initImageBase64 });
    } else {
      log("Text-to-image", { ENGINE_ID, width: 1024, height: 1024, steps: 30, cfg_scale: 7 });
      base = await sdxlTextToImage({ prompt });
    }

    const baseDims = pngDims(base);
    let finalBuf = base;
    let attempts = [];

    if (TARGET_LONG > 0 && longEdgeOf(base) < TARGET_LONG) {
      const up = await upscaleToTarget(base, TARGET_LONG);
      finalBuf = up.buf;
      attempts = up.attempts;
    }

    const finalDims = pngDims(finalBuf);
    log("Result meta", { baseDims, finalDims, targetLong: TARGET_LONG, attempts });

    res.json({
      message: "ok",
      imageDataUrl: toDataUrl(finalBuf),
      meta: {
        baseWidth: baseDims.width,
        baseHeight: baseDims.height,
        finalWidth: finalDims.width,
        finalHeight: finalDims.height,
        targetLong: TARGET_LONG,
        attempts,
      },
    });
  } catch (err) {
    logErr("Create failed", err?.response?.status || err.status || 500, err?.message || err);
    const payload = (() => {
      if (Buffer.isBuffer(err?.response?.data)) {
        const t = err.response.data.toString("utf8");
        try { return JSON.parse(t); } catch { return t; }
      }
      return err?.response?.data || err.message || "unknown";
    })();
    res.status(err?.response?.status || err.status || 500).json({ message: "Failed to generate image.", error: payload });
  }
});

export default router;
