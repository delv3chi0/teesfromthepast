import { Router } from "express";
import { generateCloudinarySignature } from "../utils/cloudinarySignature.js";
import { sendError } from "../utils/sendError.js";

const {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET
} = process.env;

/**
 * Route providing signed parameters for direct browser -> Cloudinary uploads.
 * POST /api/cloudinary/sign
 * Body (optional): { folder?: string, publicId?: string, eager?: string, tags?: string, invalidate?: boolean }
 */
const router = Router();

router.post("/sign", (req, res) => {
  if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET || !CLOUDINARY_CLOUD_NAME) {
    return sendError(
      res,
      "CLOUDINARY_NOT_CONFIGURED",
      500,
      "Cloudinary environment variables are not fully configured."
    );
  }

  const {
    folder = "tees_from_the_past/print_files",
    publicId,
    eager,
    tags,
    invalidate
  } = req.body || {};

  const timestamp = Math.floor(Date.now() / 1000);

  const params = {
    timestamp,
    folder
  };

  if (publicId) params.public_id = publicId;
  if (eager) params.eager = eager;
  if (tags) params.tags = tags;
  if (invalidate) params.invalidate = true;
  if (CLOUDINARY_UPLOAD_PRESET) params.upload_preset = CLOUDINARY_UPLOAD_PRESET;

  const { signature } = generateCloudinarySignature(params, CLOUDINARY_API_SECRET);

  return res.json({
    ok: true,
    data: {
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey: CLOUDINARY_API_KEY,
      signature,
      timestamp,
      folder,
      publicId: publicId || null,
      preset: CLOUDINARY_UPLOAD_PRESET || null,
      rawParams: params
    },
    requestId: req.id
  });
});

export default router;
