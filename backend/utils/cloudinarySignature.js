import crypto from "crypto";

/**
 * Generate a Cloudinary SHA-1 signature given params (excluding file & api_key & signature).
 * params should be an object of upload parameters (folder, public_id, eager, timestamp, etc.)
 */
export function generateCloudinarySignature(params, apiSecret) {
  // Cloudinary requires params sorted alphabetically, joined as key=value&... then apiSecret appended.
  const sortedKeys = Object.keys(params).sort();
  const toSign = sortedKeys
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const signature = crypto
    .createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");
  return { signature, toSign };
}
