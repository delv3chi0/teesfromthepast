// backend/routes/generateImage.js
import express from "express";
import axios from "axios";
import FormData from "form-data";
import "dotenv/config";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ---- Env & constants --------------------------------------------------------
const STABILITY_API_HOST = process.env.STABILITY_API_HOST || "https://api.stability.ai";
const STABILITY_API_KEY = process.env.STABILITY_AI_API_KEY || process.env.STABILITY_API_KEY; // support either var name
const ENGINE_ID = process.env.STABILITY_API_ENGINE_ID || "stable-diffusion-xl-1024-v1-0";
const TARGET_LONG_EDGE = parseInt(process.env.GEN_TARGET_LONG_EDGE || "4096", 10);

// Optional Cloudinary (upload full-res for CDN + Printify)
let cloudinary = null;
const cloudEnabled =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (cloudEnabled) {
  const { v2 } = await import("cloudinary");
  v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  cloudinary = v2;
}

// ---- Helpers ----------------------------------------------------------------
function dataUrlToBuffer(dataUrl) {
  const b64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  return Buffer.from(b64, "base64");
}

function bufferToDataUrl(buf, mime = "image/png") {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function getPngDims(buf) {
  // IHDR width/height at byte offsets 16/20 (big endian)
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return { width: w, height: h };
}

function longEdgeOf(buf) {
  const { width, height } = getPngDims(buf);
  return Math.max(width, height);
}

async function stabilityTextToImage({ prompt, width = 1024, height = 1024, steps = 30, cfg_scale = 7 }) {
  const body = {
    text_prompts: [{ text: prompt }],
    width,
    height,
    steps,
    cfg_scale,
    samples: 1,
    // tip: if you want style presets etc., add here
  };
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
  if (!art?.base64) throw new Error("No image returned from text-to-image.");
  return Buffer.from(art.base64, "base64");
}

async function stabilityImageToImage({ initBuf, prompt, width = 1024, height = 1024, steps = 30, cfg_scale = 7, image_strength = 0.35 }) {
  const form = new FormData();
  form.append("init_image", initBuf, { filename: "init.png", contentType: "image/png" });
  form.append("text_prompts[0][text]", prompt);
  form.append("text_prompts[0][weight]", "1");
  form.append("init_image_mode", "IMAGE_STRENGTH");
  form.append("image_strength", String(image_strength));
  form.append("cfg_scale", String(cfg_scale));
  form.append("width", String(width));
  form.append("height", String(height));
  form.append("steps", String(steps));
  form.append("samples", "1");

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
  if (!art?.base64) throw new Error("No image returned from image-to-image.");
  return Buffer.from(art.base64, "base64");
}

// Stability ESRGAN 2× upscaler
async function stabilityUpscale2x(pngBuffer) {
  const form = new FormData();
  form.append("image", pngBuffer, { filename: "in.png", contentType: "image/png" });
  form.append("scale", "2");

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
}

// Upscale in 2× hops until reaching TARGET_LONG_EDGE (or first hop that passes it)
async function upscaleToTarget(buf, targetLong = TARGET_LONG_EDGE) {
  let out = buf;
  while (longEdgeOf(out) < targetLong) {
    const next = await stabilityUpscale2x(out);
    // guard: if no growth (rare), stop
    if (longEdgeOf(next) <= longEdgeOf(out)) break;
    out = next;
    // Usually 1024 -> 2048 -> 4096 and done
  }
  return out;
}

async function uploadBufferToCloudinary(buf, { userId, prompt }) {
  if (!cloudinary) return { masterUrl: null, previewUrl: null, thumbUrl: null, publicId: null };

  const publicIdBase =
    `tees_from_the_past/designs/master/${userId || "anon"}/` +
    `${Date.now()}-${(prompt || "design").slice(0, 48).replace(/[^\w-]+/g, "_")}`;

  const masterUrl = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicIdBase,
        overwrite: false,
        resource_type: "image",
        format: "png", // keep transparency
        folder: undefined, // included in public_id
        tags: ["stability", "ai", userId ? `user-${userId}` : "anon"],
      },
      (err, result) => (err ? reject(err) : resolve(result?.secure_url))
    );
    stream.end(buf);
  });

  if (!masterUrl) return { masterUrl: null, previewUrl: null, thumbUrl: null, publicId: null };

  // Derived delivery transforms via CDN (no extra upload)
  const previewUrl = masterUrl.replace("/upload/", "/upload/w_1200,q_auto:good,f_jpg/");
  const thumbUrl = masterUrl.replace("/upload/", "/upload/w_400,q_auto:eco,f_jpg/");

  // Extract public_id from result url – Cloudinary gives it on upload, but we didn’t capture result object.
  // For convenience, we can reconstruct from URL pathname parts:
  const publicId = (() => {
    try {
      const u = new URL(masterUrl);
      const parts = u.pathname.split("/");
      const uploadIdx = parts.findIndex((p) => p === "upload");
      const afterUpload = parts.slice(uploadIdx + 1);
      const first = afterUpload[0];
      const keyParts = /^v\d+$/i.test(first) ? afterUpload.slice(1) : afterUpload;
      const file = keyParts.pop() || "";
      const base = file.replace(/\.[a-z0-9]+$/i, "");
      return [...keyParts, base].join("/");
    } catch {
      return null;
    }
  })();

  return { masterUrl, previewUrl, thumbUrl, publicId };
}

// ---- Route: POST /designs/create -------------------------------------------
router.post("/designs/create", protect, async (req, res) => {
  if (!STABILITY_API_KEY) {
    return res.status(500).json({ message: "Stability AI key is not configured on the server." });
  }

  const { prompt, initImageBase64, width, height, steps, cfg_scale, image_strength } = req.body || {};
  if (!prompt && !initImageBase64) {
    return res.status(400).json({ message: "Either a text prompt or an initial image is required." });
  }

  try {
    // 1) Generate base image (1024x1024 default for SDXL; allow overrides)
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

    // 2) Upscale to your target long edge (2× hops)
    const master = await upscaleToTarget(base, TARGET_LONG_EDGE);

    // 3) Optional: Upload master to Cloudinary and derive preview/thumb
    let masterUrl = null;
    let previewUrl = null;
    let thumbUrl = null;
    let publicId = null;

    if (cloudEnabled) {
      const uploaded = await uploadBufferToCloudinary(master, {
        userId: req.user?._id?.toString(),
        prompt,
      });
      masterUrl = uploaded.masterUrl;
      previewUrl = uploaded.previewUrl;
      thumbUrl = uploaded.thumbUrl;
      publicId = uploaded.publicId;
    }

    // 4) Also return a data URL (handy for immediate preview)
    const imageDataUrl = bufferToDataUrl(master, "image/png");
    const { width: w, height: h } = getPngDims(master);

    res.json({
      message: "Image generated successfully",
      imageDataUrl,
      masterUrl,         // Full-resolution PNG (good for Product Studio & Print provider)
      previewUrl,        // 1200px JPG (modal/web preview)
      thumbUrl,          // 400px JPG (grids)
      publicId,          // Cloudinary public_id (if uploaded)
      meta: {
        engine: ENGINE_ID,
        baseWidth: baseW,
        baseHeight: baseH,
        finalWidth: w,
        finalHeight: h,
        targetLongEdge: TARGET_LONG_EDGE,
        uploadedToCloudinary: !!masterUrl,
      },
    });
  } catch (err) {
    console.error("[GenerateImage] Error:", err?.response?.data || err.message);
    res.status(500).json({
      message: "Failed to generate image.",
      error: err?.response?.data || err.message,
    });
  }
});

export default router;
