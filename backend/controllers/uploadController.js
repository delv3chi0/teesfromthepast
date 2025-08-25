/**
 * Enhanced upload controller:
 *  - Dual input: imageData (raw base64) OR dataUrl (data:*;base64,<payload>)
 *  - Preflight size guard using EFFECTIVE_PRINTFILE_LIMIT_MB
 *  - Provider (Cloudinary) aware error handling (parses "File size too large" message)
 *  - MIME type detection (prefers original type; falls back to image/png)
 *  - Structured error responses via sendError
 *  - Optimization recommendations
 *
 * NOTE: For very large assets consider a future direct browser -> Cloudinary signed upload
 *       or a streaming multipart endpoint to avoid base64 overhead.
 */
import cloudinary from "cloudinary";
import {
  EFFECTIVE_PRINTFILE_LIMIT_MB,
  MAX_PRINTFILE_DECODED_MB,
  CLOUDINARY_MAX_IMAGE_MB
} from "../config/constants.js";
import { sendError } from "../utils/sendError.js";

// Folder policy (public_id will nest under this)
const FOLDER_ROOT = "tees_from_the_past/print_files";

/* ----------------------- Helper Functions ----------------------- */

/**
 * Estimate decoded bytes from a base64 string (no data: prefix).
 */
function estimateDecodedSizeBytes(base64) {
  const cleaned = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  const padding = (cleaned.match(/=+$/) || [""])[0].length;
  return Math.ceil((cleaned.length * 3) / 4) - padding;
}

function bytesToMB(bytes) {
  return bytes / (1024 * 1024);
}

/**
 * Extract base64 payload + MIME if given a data URL; otherwise treat imageData as raw base64.
 * Returns { base64, mime } or null if missing.
 */
function extractPayload(body) {
  if (!body) return null;

  if (body.imageData && typeof body.imageData === "string") {
    // Caller may optionally provide mimeType separately
    const mime = typeof body.mimeType === "string" ? body.mimeType : "image/png";
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
    const header = dataUrl.slice(0, commaIdx); // e.g. data:image/png;base64
    const payload = dataUrl.slice(commaIdx + 1);

    const headerMatch = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64$/i.exec(header);
    const mime = headerMatch ? headerMatch[1].toLowerCase() : "image/png";
    return { base64: payload.trim(), mime };
  }

  return null;
}

/**
 * Build optimization recommendation string based on size and MIME.
 */
function buildRecommendation(mime, decodedMB, limitMB) {
  const tips = [];
  tips.push(
    `Current decoded size is ${decodedMB.toFixed(
      2
    )} MB; maximum allowed is ${limitMB} MB.`
  );

  if (mime === "image/png") {
    tips.push(
      "If artwork is photographic or continuous tone, convert to JPEG (quality 80-90) or WebP to reduce size."
    );
  }
  tips.push(
    "Reduce dimensions to the minimum needed for print (e.g., 300 DPI at printed size)."
  );
  tips.push("Flatten layers and remove transparency if not required.");
  tips.push("Run through an optimizer (e.g., squoosh.app, ImageOptim).");

  return tips.join(" ");
}

/**
 * Wrap Cloudinary upload call.
 */
async function performUpload(base64, mime, productSlug) {
  const timestamp = Date.now();
  // Keep extension inference consistent: derive simple extension from mime
  let ext = "png";
  if (mime === "image/jpeg" || mime === "image/jpg") ext = "jpg";
  else if (mime === "image/webp") ext = "webp";
  else if (mime === "image/svg+xml") ext = "svg";
  else if (mime === "image/heic") ext = "heic";
  else if (mime === "image/heif") ext = "heif";

  const publicId = `${FOLDER_ROOT}/${productSlug}/${productSlug}_${timestamp}`;

  const uploadResult = await cloudinary.v2.uploader.upload(
    `data:${mime};base64,${base64}`,
    {
      public_id: publicId,
      overwrite: false,
      resource_type: "image",
      format: ext // hint
    }
  );

  const thumbUrl = cloudinary.v2.url(uploadResult.public_id, {
    width: 400,
    height: 400,
    crop: "fit",
    format: ext === "svg" ? "png" : ext, // ensure raster for thumb if vector
    secure: true
  });

  return { uploadResult, thumbUrl, publicId: uploadResult.public_id };
}

/* ----------------------- Controller ----------------------- */

export async function uploadPrintFile(req, res) {
  try {
    const { productSlug } = req.body || {};
    const payload = extractPayload(req.body);

    if (!payload || !payload.base64) {
      return sendError(res, "NO_IMAGE_DATA", 400, "No image data provided.");
    }
    if (!productSlug) {
      return sendError(
        res,
        "MISSING_PRODUCT_SLUG",
        400,
        "productSlug is required for organizing uploads."
      );
    }

    const { base64, mime } = payload;
    const decodedBytes = estimateDecodedSizeBytes(base64);
    const decodedMB = bytesToMB(decodedBytes);

    // Preflight size guard (use provider aware effective limit)
    if (decodedMB > EFFECTIVE_PRINTFILE_LIMIT_MB) {
      return sendError(
        res,
        "UPLOAD_TOO_LARGE",
        413,
        "Print file exceeds maximum allowed size.",
        {
          maxMB: EFFECTIVE_PRINTFILE_LIMIT_MB,
          configuredMB: MAX_PRINTFILE_DECODED_MB,
          providerMB: CLOUDINARY_MAX_IMAGE_MB,
          estimatedMB: Number(decodedMB.toFixed(2)),
          recommendation: buildRecommendation(
            mime,
            decodedMB,
            EFFECTIVE_PRINTFILE_LIMIT_MB
          )
        }
      );
    }

    // Upload
    const { uploadResult, thumbUrl, publicId } = await performUpload(
      base64,
      mime,
      productSlug
    );

    return res.status(201).json({
      ok: true,
      message: "Print file uploaded successfully.",
      publicUrl: uploadResult.secure_url,
      thumbUrl,
      publicId,
      mime,
      bytesDecoded: decodedBytes,
      sizeMB: Number(decodedMB.toFixed(2)),
      providerLimits: {
        effectiveLimitMB: EFFECTIVE_PRINTFILE_LIMIT_MB,
        configuredLimitMB: MAX_PRINTFILE_DECODED_MB,
        providerLimitMB: CLOUDINARY_MAX_IMAGE_MB
      }
    });
  } catch (error) {
    // Detect Cloudinary size rejection
    // Example message: "File size too large. Got 17934871. Maximum is 10485760."
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
          provider: "cloudinary",
            providerMaxMB: Number(maxMB.toFixed(2)),
          estimatedMB: Number(gotMB.toFixed(2)),
          recommendation: buildRecommendation("image/*", gotMB, maxMB)
        }
      );
    }

    console.error("Cloudinary Upload Error:", error);
    return sendError(res, "UPLOAD_FAILED", 500, "Failed to upload print file.", {
      reason: error.message
    });
  }
}

/**
 * TODO: Future optimization:
 *  Implement direct signed uploads from client (browser -> Cloudinary) or
 *  streaming multipart endpoint (POST /api/upload/printfile-stream) to avoid
 *  base64 expansion & large JSON payload overhead.
 */

export default uploadPrintFile;
