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

// ---- Log helpers ----
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

// ---- SDXL image-to-image (optional) ----
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
// Preferred v2beta: returns raw image bytes IF we send output_format=png
async function upscale2x_v2beta(pngBuffer) {
  const form = new FormData();
  form.append("image", pngBuffer, { filename: "in.png", contentType: "image/png" });
  form.append("scale", "2");
  form.append("output_format", "png"); // IMPORTANT

  const url = `${HOST}/v2beta/stable-image/upscale`;
  const resp = await axios.post(url, form, {
    headers: { Authorization: `Bearer ${STABILITY_API_KEY}`, ...form.getHeaders(), Accept: "image/png" },
    responseType: "arraybuffer",
    maxBodyLength: Infinity,
  });
  return Buffer.from(resp.data);
}

// Legacy ESRGAN v1: returns JSON with artifacts[0].base64 (NOT bytes)
async function upscale2x_v1_esrgan(pngBuffer) {
  const form = new FormData();
  form.append("image", pngBuffer, { filename: "in.png", contentType: "image/png" });
  form.append("scale", "2");

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

// Try v2beta, then ESRGAN
async function upscale2x(pngBuffer) {
  try {
    const out = await upscale2x_v2beta(pngBuffer);
    log("Upscale v2beta OK", pngDims(out));
    return { buf: out, upscaler: "v2beta" };
  } catch (e1) {
    logErr("v2beta upscale failed → try ESRGAN", e1?.response?.status || e1?.message);
    const out = await upscale2x_v1_esrgan(pngBuffer);
    log("Upscale ESRGAN OK", pngDims(out));
    return { buf: out, upscaler: "v1-esrgan" };
  }
}

// Upscale until target met; on any failure, return best-so-far
async function upscaleToTarget(buf, targetLong) {
  const hops = [];
  let out = buf;
  while (targetLong > 0 && longEdgeOf(out) < targetLong) {
    const before = longEdgeOf(out);
    try {
      const { buf: next, upscaler } = await upscale2x(out);
      const after = longEdgeOf(next);
      hops.push({ upscaler, from: before, to: after });
      out = next;
      if (after <= before) break; // safety
    } catch (e) {
      logErr("Upscale step failed; returning current image", e?.message || e);
      break;
    }
  }
  return { buf: out, hops };
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
    let hops = [];

    if (TARGET_LONG > 0 && longEdgeOf(base) < TARGET_LONG) {
      const up = await upscaleToTarget(base, TARGET_LONG);
      finalBuf = up.buf;
      hops = up.hops;
    }

    const finalDims = pngDims(finalBuf);
    log("Result meta", { baseDims, finalDims, targetLong: TARGET_LONG, hops });

    res.json({
      message: "ok",
      imageDataUrl: toDataUrl(finalBuf),
      meta: {
        baseWidth: baseDims.width,
        baseHeight: baseDims.height,
        finalWidth: finalDims.width,
        finalHeight: finalDims.height,
        targetLong: TARGET_LONG,
        hops,
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
