/**
 * Cloudinary configuration module.
 * Import this ONCE early in server startup (e.g. in index.js before routes that use cloudinary).
 *
 * DO NOT hardcode secrets. Provide:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *   (optional) CLOUDINARY_UPLOAD_PRESET
 */
import cloudinary from "cloudinary";
import logger from "../utils/logger.js";

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET
} = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  logger.warn("[Cloudinary Config] Missing one or more required environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET");
} else {
  cloudinary.v2.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });
  // Minimal confirmation (avoid logging secrets)
  logger.info("[Cloudinary Config] Cloudinary initialized (secure mode).");
}

export default cloudinary;
