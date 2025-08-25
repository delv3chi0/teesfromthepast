import { Router } from "express";
import {
  EFFECTIVE_PRINTFILE_LIMIT_MB,
  MAX_PRINTFILE_DECODED_MB,
  CLOUDINARY_MAX_IMAGE_MB,
  PRINTFILE_WARNING_PCT,
  ACCEPTED_IMAGE_MIME_TYPES
} from "../config/constants.js";

/**
 * Route providing configuration limits and settings.
 * GET /api/config/limits
 */
const router = Router();

router.get("/limits", (req, res) => {
  return res.json({
    ok: true,
    data: {
      effectiveLimitMB: EFFECTIVE_PRINTFILE_LIMIT_MB,
      configuredLimitMB: MAX_PRINTFILE_DECODED_MB,
      providerLimitMB: CLOUDINARY_MAX_IMAGE_MB,
      warningThresholdPct: PRINTFILE_WARNING_PCT,
      acceptedMimeTypes: ACCEPTED_IMAGE_MIME_TYPES
    },
    requestId: req.id
  });
});

export default router;