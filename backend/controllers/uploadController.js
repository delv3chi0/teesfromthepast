/**
 * Enhanced upload controller with:
 *  - Support for either body.imageData (raw base64) OR body.dataUrl (data: URI)
 *  - Preflight decoded size estimation & 413 response if exceeded
 *  - Structured error responses via sendError utility
 *  - Thumbnail generation
 *  - TODO marker for future streaming endpoint
 */
import cloudinary from "cloudinary";
import { MAX_PRINTFILE_DECODED_MB } from "../config/constants.js";
import { sendError } from "../utils/sendError.js";

// Ensure Cloudinary is configured elsewhere (e.g., at startup) via cloudinary.v2.config({...})
const FOLDER_ROOT = "tees_from_the_past/print_files";

// Estimate decoded size (bytes) from a base64 string (no data: prefix)
function estimateDecodedSizeBytes(base64) {
  // Remove any non-base64 safe characters (just in case)
  const cleaned = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  const padding = (cleaned.match(/=+$/) || [""])[0].length;
  return Math.ceil((cleaned.length * 3) / 4) - padding;
}

function formatMB(bytes) {
  return bytes / (1024 * 1024);
}

// Extract base64 (strip data URL prefix if needed)
function extractBase64({ imageData, dataUrl }) {
  if (imageData && typeof imageData === "string") {
    return imageData;
  }
  if (dataUrl && typeof dataUrl === "string") {
    const match = dataUrl.match(/^data:(?:image\\/[a-zA-Z+.-]+);base64,(.+)$/);
    if (match) return match[1];
    // Fallback: if it doesn't match expected pattern, assume entire string is base64
    return dataUrl;
  }
  return null;
}

export async function uploadPrintFile(req, res) {
  try {
    const { productSlug } = req.body || {};
    const base64 = extractBase64(req.body || {});

    if (!base64) {
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

    const decodedBytes = estimateDecodedSizeBytes(base64);
    const decodedMB = formatMB(decodedBytes);

    if (decodedMB > MAX_PRINTFILE_DECODED_MB) {
      return sendError(res, "UPLOAD_TOO_LARGE", 413, "Print file exceeds maximum allowed size.", {
        maxMB: MAX_PRINTFILE_DECODED_MB,
        estimatedMB: Number(decodedMB.toFixed(2)),
        recommendation:
          "Reduce resolution or compress the image (e.g., lower dimensions, use optimized PNG or high-quality JPEG) and try again."
      });
    }

    // Perform upload
    const timestamp = Date.now();
    const publicId = `${FOLDER_ROOT}/${productSlug}/${productSlug}_${timestamp}`;

    const uploadResult = await cloudinary.v2.uploader.upload(
      `data:image/png;base64,${base64}`,
      {
        public_id: publicId,
        overwrite: false,
        resource_type: "image",
        folder: undefined // public_id already includes folder path
      }
    );

    // Generate a 400x400 thumbnail URL (adjust cropping as needed)
    const thumbUrl = cloudinary.v2.url(uploadResult.public_id, {
      width: 400,
      height: 400,
      crop: "fit",
      format: "png",
      secure: true
    });

    return res.status(201).json({
      ok: true,
      message: "Print file uploaded successfully.",
      publicUrl: uploadResult.secure_url,
      thumbUrl,
      publicId: uploadResult.public_id,
      bytesDecoded: decodedBytes,
      sizeMB: Number(decodedMB.toFixed(2))
    });
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    return sendError(
      res,
      "UPLOAD_FAILED",
      500,
      "Failed to upload print file.",
      { reason: error.message }
    );
  }
}

/**
 * TODO: Consider adding a streaming / multipart endpoint:
 *   POST /api/upload/printfile-stream
 * that accepts multipart/form-data and streams directly to Cloudinary
 * to eliminate large base64 JSON overhead for very large files.
 */

export default uploadPrintFile;
