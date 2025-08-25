/**
 * Upload controller with:
 *  - Support for either body.imageData (raw base64) OR body.dataUrl (data: URI)
 *  - Preflight decoded size estimation & 413 structured response if exceeded
 *  - Structured error responses via sendError utility (if present)
 *  - Cloudinary upload + thumbnail URL
 *  - TODO comment for future streaming endpoint
 *
 * NOTE: This version fixes a deployment crash caused by an overly escaped RegExp.
 */
import cloudinary from "cloudinary";
import { MAX_PRINTFILE_DECODED_MB } from "../config/constants.js";
import { sendError } from "../utils/sendError.js";

const FOLDER_ROOT = "tees_from_the_past/print_files";

/**
 * Estimate decoded size (bytes) from a base64 string (no data: prefix).
 * Uses standard 3/4 rule minus padding.
 */
function estimateDecodedSizeBytes(base64) {
  const cleaned = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  const padding = (cleaned.match(/=+$/) || [""])[0].length;
  return Math.ceil((cleaned.length * 3) / 4) - padding;
}

function toMB(bytes) {
  return bytes / (1024 * 1024);
}

/**
 * Extract pure base64 (no data: prefix) from body.imageData or body.dataUrl.
 * Safer than a single large RegExp that is prone to escaping issues.
 *
 * Accepts:
 *   - imageData: raw base64 (preferred)
 *   - dataUrl: data:image/<subtype>[+suffix];base64,<payload>
 */
function extractBase64(body) {
  if (!body) return null;

  if (body.imageData && typeof body.imageData === "string") {
    // Trim whitespace just in case
    return body.imageData.trim();
  }

  if (body.dataUrl && typeof body.dataUrl === "string") {
    const dataUrl = body.dataUrl.trim();

    // Fast path: find the first comma separator in a data URL
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex !== -1) {
      const header = dataUrl.slice(0, commaIndex);
      const payload = dataUrl.slice(commaIndex + 1);

      // Validate header shape (case-insensitive), e.g. data:image/png;base64
      // Subtype allows letters, digits, plus, dot, or dash.
      if (/^data:image\/[a-z0-9.+-]+;base64$/i.test(header)) {
        return payload;
      }
    }

    // Fallback: if not a well-formed data URL, attempt a generic strip
    return dataUrl.replace(/^data:.*;base64,/, "");
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
      return sendError(
        res,
        "MISSING_PRODUCT_SLUG",
        400,
        "productSlug is required for organizing uploads."
      );
    }

    const decodedBytes = estimateDecodedSizeBytes(base64);
    const decodedMB = toMB(decodedBytes);

    if (decodedMB > MAX_PRINTFILE_DECODED_MB) {
      return sendError(res, "UPLOAD_TOO_LARGE", 413, "Print file exceeds maximum allowed size.", {
        maxMB: MAX_PRINTFILE_DECODED_MB,
        estimatedMB: Number(decodedMB.toFixed(2)),
        recommendation:
          "Reduce resolution or compress the image (optimize dimensions or use a more efficient format) and try again."
      });
    }

    const timestamp = Date.now();
    const publicId = `${FOLDER_ROOT}/${productSlug}/${productSlug}_${timestamp}`;

    // Assume PNG; if you support multiple formats, detect MIME from header portion before stripping.
    // Prepend required data URL header for Cloudinary when uploading base64 directly.
    const uploadResult = await cloudinary.v2.uploader.upload(
      `data:image/png;base64,${base64}`,
      {
        public_id: publicId,
        overwrite: false,
        resource_type: "image"
      }
    );

    // Generate thumbnail (idempotent transformation)
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
 * TODO: Future optimization:
 *  Implement streaming multipart endpoint: POST /api/upload/printfile-stream
 *  to avoid base64 inflation for large files and reduce memory footprint.
 */

export default uploadPrintFile;
