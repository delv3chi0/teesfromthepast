import cloudinary from "cloudinary";
import { MAX_PRINTFILE_DECODED_MB } from "../config/constants.js";
import { sendError } from "../utils/sendError.js";

const FOLDER_ROOT = "tees_from_the_past/print_files";

function estimateDecodedSizeBytes(base64) {
  const cleaned = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  const padding = (cleaned.match(/=+$/) || [""])[0].length;
  return Math.ceil((cleaned.length * 3) / 4) - padding;
}

function toMB(bytes) {
  return bytes / (1024 * 1024);
}

function extractBase64(body) {
  if (!body) return null;
  if (body.imageData && typeof body.imageData === "string") return body.imageData;
  if (body.dataUrl && typeof body.dataUrl === "string") {
    const match = body.dataUrl.match(/^data:(?:image\\/[a-zA-Z+.-]+);base64,(.+)$/);
    return match ? match[1] : body.dataUrl;
  }
  return null;
}

export async function uploadPrintFile(req, res) {
  try {
    const { productSlug } = req.body || {};
    const base64 = extractBase64(req.body);

    if (!base64) {
      return sendError(res, "NO_IMAGE_DATA", 400, "No image data provided.");
    }
    if (!productSlug) {
      return sendError(res, "MISSING_PRODUCT_SLUG", 400, "productSlug is required.");
    }

    const decodedBytes = estimateDecodedSizeBytes(base64);
    const decodedMB = toMB(decodedBytes);

    if (decodedMB > MAX_PRINTFILE_DECODED_MB) {
      return sendError(res, "UPLOAD_TOO_LARGE", 413, "Print file exceeds maximum allowed size.", {
        maxMB: MAX_PRINTFILE_DECODED_MB,
        estimatedMB: Number(decodedMB.toFixed(2)),
        recommendation:
          "Reduce resolution or compress (optimize PNG / high-quality JPEG) and retry."
      });
    }

    const timestamp = Date.now();
    const publicId = `${FOLDER_ROOT}/${productSlug}/${productSlug}_${timestamp}`;

    const uploadResult = await cloudinary.v2.uploader.upload(
      `data:image/png;base64,${base64}`,
      {
        public_id: publicId,
        overwrite: false,
        resource_type: "image"
      }
    );

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
  } catch (err) {
    console.error("Cloudinary Upload Error:", err);
    return sendError(res, "UPLOAD_FAILED", 500, "Failed to upload print file.", {
      reason: err.message
    });
  }
}

/**
 * TODO: Potential streaming endpoint: POST /api/upload/printfile-stream (multipart/form-data)
 * for very large files (bypass base64 inflation).
 */

export default uploadPrintFile;
