/**
 * Configuration routes for exposing application limits and settings.
 * GET /api/config/limits - Returns effective size limits and accepted MIME types for frontend preflight.
 */
import { Router } from "express";
import {
  EFFECTIVE_PRINTFILE_LIMIT_MB,
  CLOUDINARY_MAX_IMAGE_MB,
  ACCEPTED_IMAGE_MIME_TYPES,
  PRINTFILE_WARNING_PCT
} from "../config/constants.js";
import { sendError } from "../utils/sendError.js";

const router = Router();

/**
 * GET /api/config/limits
 * Returns configuration limits for frontend validation and user guidance.
 */
router.get("/limits", (req, res) => {
  try {
    return res.json({
      ok: true,
      data: {
        effectivePrintfileLimitMB: EFFECTIVE_PRINTFILE_LIMIT_MB,
        cloudinaryMaxImageMB: CLOUDINARY_MAX_IMAGE_MB,
        acceptedImageMimeTypes: ACCEPTED_IMAGE_MIME_TYPES,
        printfileWarningPercent: PRINTFILE_WARNING_PCT,
        recommendedMaxMB: Math.floor(EFFECTIVE_PRINTFILE_LIMIT_MB * PRINTFILE_WARNING_PCT * 100) / 100
      },
      requestId: req.id
    });
  } catch (error) {
    console.error("[Config Routes] Error fetching limits:", error);
    return sendError(
      res,
      "CONFIG_ERROR", 
      500,
      "Failed to retrieve configuration limits."
    );
  }
});

export default router;