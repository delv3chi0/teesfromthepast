// backend/routes/generateImage.js
import express from "express";
import axios from "axios";
import FormData from "form-data";
import "dotenv/config";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ---- Config / ENV ----
const STABILITY_API_KEY = process.env.STABILITY_API_KEY || process.env.STABILITY_AI_API_KEY; // support either var name
const ENGINE_ID = process.env.STABILITY_API_ENGINE_ID || "stable-diffusion-xl-1024-v1-0";
const TARGET_LONG = parseInt(process.env.GEN_TARGET_LONG_EDGE || "2048", 10);
const HOST = process.env.STABILITY_API_HOST || "https://api.stability.ai";

// ---- Small logger helpers ----
const log = (...a) => console.log("[GenerateImage]", ...a);
const logErr = (...a) => console.error("[GenerateImage][ERROR]", ...a);

// ---- PNG helpers ----
function pngDims(buf) {
  try {
    // IHDR width @ 16..19, height @ 20..23 (big-endian)
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    return { width: w, height: h };
  } catch {
    return { width: 0, height: 0 };
  }
}
const longEdgeOf = (buf) => {
  const { width, height } = pngDims(buf);
  return Math.max(width, height);
};
const toDataUrl = (buf, mime = "image/png") => `data:${mime};base64,${buf.toString("base64")}`;

// ---- SDXL text-to-image ----
async function sdxlTextToImage({ prompt, width = 1024, height = 1024, steps = 30, cfg_scale = 7 }) {
  if (!STABILITY_API_KEY) {
    const e = new Error("STABILITY_API_KEY missing");
    e.status = 500;
    throw e;
  }
  const body = {
    text_prompts: [{ text: prompt }],
    cfg_scale,
    height,
    width,
    steps,
    samples: 1
  };
  const url = `${HOST}/v1/generation/${ENGINE_ID}/text-to-image`;
  const { data } = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${STABILITY_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    maxBodyLength: Infinity
  });
  const art = data?.artifacts?.[0];
  if (!art?.base64) throw new Error("No image data in SDXL response");
  return Buffer.from(art.base64, "base64");
}

// ---- SDXL image-to-image (optional VCR init) ----
async function sdxlImageToImage({ prompt, initImageBase64 }) {
  if (!STABILITY_API_KEY) {
    const e = new Error("STABILITY_API_KEY missing");
    e.status = 500;
    throw e;
  }
  const form = new FormData();
  // init image
  const b64 = (initImageBase64 || "").split(",").pop();
  form.append("init_image", Buffer.from(b64, "base64"), {
    filename: "init.png",
    contentType: "image/png"
  });
  // text prompt
  form.append("text_prompts[0][text]", prompt);
  form.append("text_prompts[0][weight]", "1");
  // tuning
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
    maxBodyLength: Infinity
  });
  const art = data?.artifacts?.[0];
  if (!art?.base64) throw new Error("No image data in image-to-image response");
  return Buffer.from(art.base64, "base64");
}

// ---- Upscalers: v2beta (preferred) then v1 ESRGAN fallback ----
async function upscale2x_v2beta(pngBuffer) {
  const form = new FormData();
  form.append("image", pngBuffer, { filename: "in.png", contentType: "image/png" });
  form.append("scale", "2"); // 2x

  const url = `${HOST}/v2beta/stable-image/upscale`;
  const resp = await axios.post(url, form, {
    headers: { Authorization: `Bearer ${STABILITY_API_KEY}`, ...form.getHeaders(), Accept: "image/png" },
    responseType: "arraybuffer",
    maxBodyLength: Infinity
  });
  return Buffer.from(resp.data);
}

async function upscale2x_v1_esrgan(pngBuffer) {
  const form = new FormData();
  form.append("image", pngBuffer, { filename: "in.png", contentType: "image/png" });
  form.append("scale", "2");

  const url = `${HOST}/v1/generation/esrgan-v1-x2plus/image-to-image/upscale`;
  try {
    const resp = await axios.post(url, form, {
      headers: { Authorization: `Bearer ${STABILITY_API_KEY}`, ...form.getHeaders() },
      responseType: "arraybuffer",
      maxBodyLength: Infinity
    });
    return Buffer.from(resp.data);
  } catch (e) {
    // decode JSON error if provided as buffer
    try {
      const asText = Buffer.isBuffer(e?.response?.data) ? e.response.data.toString("utf8") : "";
      const parsed = asText ? JSON.parse(asText) : null;
      logErr("ESRGAN 2x failed", e?.response?.status, parsed || asText || e.message);
    } catch {
      logErr("ESRGAN 2x failed (non-JSON)", e?.response?.status, e?.message);
    }
    throw e;
  }
}

// try v2beta → fall back to v1
async function upscale2x(pngBuffer) {
  try {
    const out = await upscale2x_v2beta(pngBuffer);
    log("Upscale v2beta OK");
    return { buf: out, upscaler: "v2beta" };
  } catch (e1) {
    logErr("v2beta upscale failed, falling back to ESRGAN", e1?.response?.status || e1?.message);
    const out = await upscale2x_v1_esrgan(pngBuffer); // may throw
    return { buf: out, upscaler: "v1-esrgan" };
  }
}

// upscale until reaching target; if any step fails, return best current
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
      if (after <= before) break;
    } catch (e) {
      log("[Upscale] stopping on error; returning current image");
      break;
    }
  }
  return { buf: out, hops };
}

// ---- Route ----
router.get("/designs/health", protect, (req, res) => {
  res.json({
    ok: true,
    stabilityKeyPresent: !!STABILITY_API_KEY,
    engineId: ENGINE_ID,
    targetLong: TARGET_LONG
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

    // Only attempt upscale if target > base long edge
    if (TARGET_LONG > 0 && longEdgeOf(base) < TARGET_LONG) {
      const up = await upscaleToTarget(base, TARGET_LONG);
      finalBuf = up.buf;
      hops = up.hops;
    }

    const finalDims = pngDims(finalBuf);

    // Return dataURL; your client can optionally upload to Cloudinary after save
    res.json({
      message: "ok",
      imageDataUrl: toDataUrl(finalBuf),
      meta: {
        baseWidth: baseDims.width,
        baseHeight: baseDims.height,
        finalWidth: finalDims.width,
        finalHeight: finalDims.height,
        targetLong: TARGET_LONG,
        hops
      }
    });
  } catch (err) {
    logErr("Create failed", err?.response?.status || err.status || 500, err?.message || err);
    // bubble Stability JSON if available
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
