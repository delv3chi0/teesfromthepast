// backend/routes/generateImage.js
import express from "express";
import axios from "axios";
import FormData from "form-data";
import "dotenv/config";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ---------- Config ----------
const STABILITY_API_HOST =
  process.env.STABILITY_API_HOST || "https://api.stability.ai";
const STABILITY_API_KEY =
  process.env.STABILITY_AI_API_KEY || process.env.STABILITY_API_KEY; // supports either name
const ENGINE_ID =
  process.env.STABILITY_API_ENGINE_ID || "stable-diffusion-xl-1024-v1-0";
const TARGET_LONG_EDGE = parseInt(process.env.GEN_TARGET_LONG_EDGE || "4096", 10);

// Cloudinary flag only (no top-level import here)
const CLOUDINARY_ENABLED =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

// ---------- Small utils ----------
const log = (...a) => console.log("[GenerateImage]", ...a);
const logErr = (...a) => console.error("[GenerateImage][ERROR]", ...a);

function dataUrlToBuffer(dataUrl) {
  const b64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  return Buffer.from(b64, "base64");
}
function bufferToDataUrl(buf, mime = "image/png") {
  return `data:${mime};base64,${buf.toString("base64")}`;
}
function getPngDims(buf) {
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return { width: w, height: h };
}
function longEdgeOf(buf) {
  const { width, height } = getPngDims(buf);
  return Math.max(width, height);
}

// ---------- Stability calls ----------
async function stabilityTextToImage({ prompt, width, height, steps, cfg_scale }) {
  log("Text-to-image", { ENGINE_ID, width, height, steps, cfg_scale });
  const body = {
    text_prompts: [{ text: prompt }],
    width,
    height,
    steps,
    cfg_scale,
    samples: 1,
  };

  try {
    const { data } = await axios.post(
      `${STABILITY_API_HOST}/v1/generation/${ENGINE_ID}/text-to-image`,
      body,
      {
        headers: {
          Authorization: `Bearer ${STABILITY_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        responseType: "json",
      }
    );
    const art = data?.artifacts?.[0];
    if (!art?.base64) throw new Error("No image returned (text-to-image).");
    return Buffer.from(art.base64, "base64");
  } catch (e) {
    logErr("text-to-image failed", e?.response?.status, e?.response?.data || e.message);
    throw e;
  }
}

async function stabilityImageToImage({
  initBuf,
  prompt,
  width,
  height,
  steps,
  cfg_scale,
  image_strength,
}) {
  log("Image-to-image", {
    ENGINE_ID,
    width,
    height,
    steps,
    cfg_scale,
    image_strength,
  });

  const form = new FormData();
  form.append("init_image", initBuf, {
    filename: "init.png",
    contentType: "image/png",
  });
  form.append("text_prompts[0][text]", prompt);
  form.append("text_prompts[0][weight]", "1");
  form.append("init_image_mode", "IMAGE_STRENGTH");
  form.append("image_strength", String(image_strength));
  form.append("cfg_scale", String(cfg_scale));
  form.append("width", String(width));
  form.append("height", String(height));
  form.append("steps", String(steps));
  form.append("samples", "1");

  try {
    const { data } = await axios.post(
      `${STABILITY_API_HOST}/v1/generation/${ENGINE_ID}/image-to-image`,
      form,
      {
        headers: {
          Authorization: `Bearer ${STABILITY_API_KEY}`,
          ...form.getHeaders(),
          Accept: "application/json",
        },
        maxBodyLength: Infinity,
      }
    );

    const art = data?.artifacts?.[0];
    if (!art?.base64) throw new Error("No image returned (image-to-image).");
    return Buffer.from(art.base64, "base64");
  } catch (e) {
    logErr("image-to-image failed", e?.response?.status, e?.response?.data || e.message);
    throw e;
  }
}

async function stabilityUpscale2x(pngBuffer) {
  const form = new FormData();
  form.append("image", pngBuffer, {
    filename: "in.png",
    contentType: "image/png",
  });
  form.append("scale", "2");

  try {
    const { data } = await axios.post(
      `${STABILITY_API_HOST}/v1/generation/esrgan-v1-x2plus/image-to-image/upscale`,
      form,
      {
        headers: {
          Authorization: `Bearer ${STABILITY_API_KEY}`,
          ...form.getHeaders(),
        },
        responseType: "arraybuffer",
        maxBodyLength: Infinity,
      }
    );
    return Buffer.from(data);
  } catch (e) {
    logErr("upscale 2x failed", e?.response?.status, e?.response?.data || e.message);
    throw e;
  }
}

async function upscaleToTarget(buf, targetLong) {
  let out = buf;
  while (longEdgeOf(out) < targetLong) {
    const before = longEdgeOf(out);
    out = await stabilityUpscale2x(out);
    const after = longEdgeOf(out);
    log(`Upscaled ${before} -> ${after}`);
    if (after <= before) break; // guard
  }
  return out;
}

// ---------- Cloudinary upload (dynamic import) ----------
async function uploadBufferToCloudinary(buf, { userId, prompt }) {
  if (!CLOUDINARY_ENABLED) return { masterUrl: null, previewUrl: null, thumbUrl: null, publicId: null };
  // dynamic import to avoid top-level await issues
  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const publicIdBase =
    `tees_from_the_past/designs/master/${userId || "anon"}/` +
    `${Date.now()}-${(prompt || "design").slice(0, 48).replace(/[^\w-]+/g, "_")}`;

  const masterUrl = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicIdBase,
        overwrite: false,
        resource_type: "image",
        format: "png",
        tags: ["stability", "ai", userId ? `user-${userId}` : "anon"],
      },
      (err, result) => (err ? reject(err) : resolve(result?.secure_url))
    );
    stream.end(buf);
  });

  if (!masterUrl) {
    return { masterUrl: null, previewUrl: null, thumbUrl: null, publicId: null };
  }

  const previewUrl = masterUrl.replace("/upload/", "/upload/w_1200,q_auto:good,f_jpg/");
  const thumbUrl = masterUrl.replace("/upload/", "/upload/w_400,q_auto:eco,f_jpg/");

  // reconstruct public_id from URL (for deletes later)
  let publicId = null;
  try {
    const u = new URL(masterUrl);
    const parts = u.pathname.split("/");
    const idx = parts.findIndex((p) => p === "upload");
    const after = parts.slice(idx + 1);
    const first = after[0];
    const bits = /^v\d+$/i.test(first) ? after.slice(1) : after;
    const file = bits.pop() || "";
    const base = file.replace(/\.[a-z0-9]+$/i, "");
    publicId = [...bits, base].join("/");
  } catch {}

  return { masterUrl, previewUrl, thumbUrl, publicId };
}

// ---------- Health (quick, non-secret) ----------
router.get("/designs/health", (req, res) => {
  res.json({
    ok: true,
    ENGINE_ID,
    TARGET_LONG_EDGE,
    stabilityKeyPresent: !!STABILITY_API_KEY,
    cloudinaryEnabled: CLOUDINARY_ENABLED,
  });
});

// ---------- Main generate endpoint ----------
router.post("/designs/create", protect, async (req, res) => {
  if (!STABILITY_API_KEY) {
    logErr("Missing STABILITY_API_KEY");
    return res
      .status(500)
      .json({ message: "Stability AI key is not configured on the server." });
  }

  const {
    prompt,
    initImageBase64,
    width,
    height,
    steps,
    cfg_scale,
    image_strength,
  } = req.body || {};

  if (!prompt && !initImageBase64) {
    return res
      .status(400)
      .json({ message: "Either a text prompt or an initial image is required." });
  }

  try {
    const baseW = Math.max(256, Math.min(1536, parseInt(width || "1024", 10)));
    const baseH = Math.max(256, Math.min(1536, parseInt(height || "1024", 10)));
    const genSteps = Math.max(10, Math.min(60, parseInt(steps || "30", 10)));
    const genCfg = Math.max(1, Math.min(20, parseInt(cfg_scale || "7", 10)));

    let base;
    if (initImageBase64) {
      const initBuf = dataUrlToBuffer(initImageBase64);
      base = await stabilityImageToImage({
        initBuf,
        prompt,
        width: baseW,
        height: baseH,
        steps: genSteps,
        cfg_scale: genCfg,
        image_strength: image_strength ?? 0.35,
      });
    } else {
      base = await stabilityTextToImage({
        prompt,
        width: baseW,
        height: baseH,
        steps: genSteps,
        cfg_scale: genCfg,
      });
    }

    const master = await upscaleToTarget(base, TARGET_LONG_EDGE);

    let masterUrl = null,
      previewUrl = null,
      thumbUrl = null,
      publicId = null;

    if (CLOUDINARY_ENABLED) {
      try {
        const uploaded = await uploadBufferToCloudinary(master, {
          userId: req.user?._id?.toString(),
          prompt,
        });
        masterUrl = uploaded.masterUrl;
        previewUrl = uploaded.previewUrl;
        thumbUrl = uploaded.thumbUrl;
        publicId = uploaded.publicId;
      } catch (cldErr) {
        logErr("Cloudinary upload failed", cldErr?.message || cldErr);
        // continue; we still return base64 to the client
      }
    }

    const imageDataUrl = bufferToDataUrl(master, "image/png");
    const { width: finalW, height: finalH } = getPngDims(master);

    res.json({
      message: "Image generated successfully",
      imageDataUrl,
      masterUrl,
      previewUrl,
      thumbUrl,
      publicId,
      meta: {
        engine: ENGINE_ID,
        baseWidth: baseW,
        baseHeight: baseH,
        finalWidth: finalW,
        finalHeight: finalH,
        targetLongEdge: TARGET_LONG_EDGE,
        uploadedToCloudinary: !!masterUrl,
      },
    });
  } catch (err) {
    const status = err?.response?.status || 500;
    const payload = err?.response?.data || { message: err.message };
    logErr("Create failed", status, payload);
    res.status(500).json({
      message: "Failed to generate image.",
      upstreamStatus: status,
      upstream: payload,
    });
  }
});

export default router;
