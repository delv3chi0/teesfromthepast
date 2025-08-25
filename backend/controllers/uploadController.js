/**
 * Upload controller supporting:
 * 1. Direct finalization (client already performed signed direct upload) via cloudinaryPublicId
 * 2. Legacy base64 path (imageData or dataUrl) — still supported temporarily
 *
 * Recommended frontend path:
 *   a. POST /api/cloudinary/sign -> get signature
 *   b. multipart/form-data upload directly to Cloudinary
 *   c. POST /api/upload/printfile with { productSlug, cloudinaryPublicId, mime }
 */
import cloudinary from "../config/cloudinary.js";
import {
  EFFECTIVE_PRINTFILE_LIMIT_MB,
  MAX_PRINTFILE_DECODED_MB,
  CLOUDINARY_MAX_IMAGE_MB,
  ACCEPTED_IMAGE_MIME_TYPES
} from "../config/constants.js";
import { sendError } from "../utils/sendError.js";

const FOLDER_ROOT = "tees_from_the_past/print_files";

/* ---------- Helpers ---------- */

function estimateDecodedSizeBytes(base64) {
  const cleaned = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  const padding = (cleaned.match(/=+$/) || [""])[0].length;
  return Math.ceil((cleaned.length * 3) / 4) - padding;
}
const bytesToMB = (b) => b / (1024 * 1024);

function parseLegacyInput(body) {
  if (!body) return null;

  if (body.imageData && typeof body.imageData === "string") {
    const mime = typeof body.mimeType === "string" ? body.mimeType.toLowerCase() : "image/png";
    return { base64: body.imageData.trim(), mime };
  }
  if (body.dataUrl && typeof body.dataUrl === "string") {
    const dataUrl = body.dataUrl.trim();
    const commaIdx = dataUrl.indexOf(",");
    if (commaIdx === -1) {
      return {
        base64: dataUrl.replace(/^data:.*;base64,/, ""),
        mime: "image/png"
      };
    }
    const header = dataUrl.slice(0, commaIdx);
    const payload = dataUrl.slice(commaIdx + 1);
    const m = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64$/i.exec(header);
    const mime = (m ? m[1] : "image/png").toLowerCase();
    return { base64: payload.trim(), mime };
  }
  return null;
}

function chooseExt(mime) {
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/svg+xml") return "svg";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";
  return "png";
}

function buildRecommendation(mime, sizeMB, limitMB) {
  const tips = [];
  tips.push(`Decoded size ${sizeMB.toFixed(2)} MB vs limit ${limitMB} MB.`);
  if (mime === "image/png") {
    tips.push("Convert to JPEG/WebP if photographic or gradient-heavy.");
  }
  tips.push("Resize to print dimensions (300 DPI target).");
  tips.push("Flatten layers & remove unused alpha.");
  tips.push("Use an optimizer (ImageOptim, Squoosh, TinyPNG).");
  return tips.join(" ");
}

async function uploadLegacy(base64, mime, productSlug) {
  const ext = chooseExt(mime);
  const ts = Date.now();
  const publicId = `${FOLDER_ROOT}/${productSlug}/${productSlug}_${ts}`;
  const result = await cloudinary.v2.uploader.upload(`data:${mime};base64,${base64}`, {
    public_id: publicId,
    overwrite: false,
    resource_type: "image",
    format: ext
  });
  return { result, publicId: result.public_id, ext };
}

/* ---------- Controller ---------- */

export async function uploadPrintFile(req, res) {
  try {
    const {
      productSlug,
      cloudinaryPublicId,
      mime: providedMime // for finalize path
    } = req.body || {};

    if (!productSlug) {
      return sendError(
        res,
        "MISSING_PRODUCT_SLUG",
        400,
        "productSlug is required for organizing uploads."
      );
    }

    // MODE A: Direct finalized (cloudinaryPublicId provided)
    if (cloudinaryPublicId && typeof cloudinaryPublicId === "string") {
      let mime = (providedMime || "image/png").toLowerCase();
      if (!ACCEPTED_IMAGE_MIME_TYPES.includes(mime)) {
        return sendError(
          res,
          "UNSUPPORTED_MIME",
          415,
          `Unsupported image type '${mime}'.`,
          { accepted: ACCEPTED_IMAGE_MIME_TYPES }
        );
      }

      // Optional verification call (disabled to save quota):
      // const details = await cloudinary.v2.api.resource(cloudinaryPublicId);

      const thumbUrl = cloudinary.v2.url(cloudinaryPublicId, {
        width: 400,
        height: 400,
        crop: "fit",
        format: mime === "image/svg+xml" ? "png" : undefined,
        secure: true
      });

      return res.status(200).json({
        ok: true,
        message: "Cloudinary asset recorded.",
        publicId: cloudinaryPublicId,
        publicUrl: cloudinary.v2.url(cloudinaryPublicId, { secure: true }),
        thumbUrl,
        mime,
        mode: "direct-finalize"
      });
    }

    // MODE B: Legacy base64 path
    const payload = parseLegacyInput(req.body);
    if (!payload || !payload.base64) {
      return sendError(res, "NO_IMAGE_DATA", 400, "No image data provided.");
    }
    if (!ACCEPTED_IMAGE_MIME_TYPES.includes(payload.mime)) {
      return sendError(
        res,
        "UNSUPPORTED_MIME",
        415,
        `Unsupported image type '${payload.mime}'.`,
        { accepted: ACCEPTED_IMAGE_MIME_TYPES }
      );
    }

    const decodedBytes = estimateDecodedSizeBytes(payload.base64);
    const decodedMB = bytesToMB(decodedBytes);

    if (decodedMB > EFFECTIVE_PRINTFILE_LIMIT_MB) {
      return sendError(res, "UPLOAD_TOO_LARGE", 413, "Print file exceeds maximum allowed size.", {
        estimatedMB: +decodedMB.toFixed(2),
        effectiveLimitMB: EFFECTIVE_PRINTFILE_LIMIT_MB,
        configuredLimitMB: MAX_PRINTFILE_DECODED_MB,
        providerLimitMB: CLOUDINARY_MAX_IMAGE_MB,
        recommendation: buildRecommendation(
          payload.mime,
            decodedMB,
          EFFECTIVE_PRINTFILE_LIMIT_MB
        )
      });
    }

    const { result, publicId, ext } = await uploadLegacy(
      payload.base64,
      payload.mime,
      productSlug
    );

    const thumbUrl = cloudinary.v2.url(publicId, {
      width: 400,
      height: 400,
      crop: "fit",
      format: ext === "svg" ? "png" : ext,
      secure: true
    });

    return res.status(201).json({
      ok: true,
      message: "Print file uploaded (legacy path).",
      publicUrl: result.secure_url,
      thumbUrl,
      publicId,
      mime: payload.mime,
      ext,
      bytesDecoded: decodedBytes,
      sizeMB: +decodedMB.toFixed(2),
      mode: "server-base64"
    });
  } catch (error) {
    const sizeMatch = /File size too large\. Got (\d+)\. Maximum is (\d+)/i.exec(
      error.message || ""
    );
    if (sizeMatch) {
      const gotBytes = parseInt(sizeMatch[1], 10);
      const maxBytes = parseInt(sizeMatch[2], 10);
      const gotMB = bytesToMB(gotBytes);
      const maxMB = bytesToMB(maxBytes);
      return sendError(
        res,
        "PROVIDER_LIMIT_EXCEEDED",
        413,
        "Cloudinary rejected the upload due to size.",
        {
          providerMaxMB: +maxMB.toFixed(2),
          attemptedMB: +gotMB.toFixed(2),
          recommendation: buildRecommendation("image/*", gotMB, maxMB)
        }
      );
    }
    console.error("[UploadController] Cloudinary Upload Error:", error);
    return sendError(res, "UPLOAD_FAILED", 500, "Failed to process print file.", {
      reason: error.message
    });
  }
}

export default uploadPrintFile;
