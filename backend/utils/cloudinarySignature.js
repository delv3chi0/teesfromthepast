import crypto from "crypto";

/**
 * Generate a Cloudinary SHA-1 signature.
 * Only include upload parameters you actually send to Cloudinary on the client.
 * Exclude: file, resource_type auto detection, api_key, signature (Cloudinary adds those).
 *
 * @param {object} params - key/value pairs for upload (folder, public_id, timestamp, etc.)
 * @param {string} apiSecret - CLOUDINARY_API_SECRET
 * @returns {{ signature: string, toSign: string }}
 */
export function generateCloudinarySignature(params, apiSecret) {
  const sortedKeys = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort();

  const toSign = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");
  const signature = crypto
    .createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");
  return { signature, toSign };
}

export default generateCloudinarySignature;
