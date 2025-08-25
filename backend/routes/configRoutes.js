import { Router } from "express";
import {
  EFFECTIVE_PRINTFILE_LIMIT_MB,
  MAX_PRINTFILE_DECODED_MB,
  CLOUDINARY_MAX_IMAGE_MB,
  PRINTFILE_WARNING_PCT,
  ACCEPTED_IMAGE_MIME_TYPES
} from "../config/constants.js";
import { validate, commonSchemas } from "../middleware/validate.js";
import { z } from "zod";

/**
 * Route providing configuration limits and settings.
 * GET /api/config/limits
 * TODO: NEXT_10_BACKEND_TASKS Task 5 - Example validation middleware usage
 */
const router = Router();

// Example validation middleware usage - validate query parameters
const limitsValidation = validate({
  query: z.object({
    format: z.enum(['json', 'xml']).optional().default('json'),
    include: z.string().optional(),
  }),
});

router.get("/limits", limitsValidation, (req, res) => {
  // Access validated query parameters
  const { format, include } = req.validated.query;
  
  const data = {
    effectiveLimitMB: EFFECTIVE_PRINTFILE_LIMIT_MB,
    configuredLimitMB: MAX_PRINTFILE_DECODED_MB,
    providerLimitMB: CLOUDINARY_MAX_IMAGE_MB,
    warningThresholdPct: PRINTFILE_WARNING_PCT,
    acceptedMimeTypes: ACCEPTED_IMAGE_MIME_TYPES
  };

  // Example of using validated query parameters
  if (include) {
    const includeFields = include.split(',').map(field => field.trim());
    // Filter data based on include parameter (demo only)
    // In real implementation, you might filter the response based on this
  }

  // Format is validated and defaults to 'json'
  if (format === 'xml') {
    // For demonstration - in real app you might return XML
    return res.type('application/xml').send(`
      <config>
        <effectiveLimitMB>${data.effectiveLimitMB}</effectiveLimitMB>
        <configuredLimitMB>${data.configuredLimitMB}</configuredLimitMB>
        <providerLimitMB>${data.providerLimitMB}</providerLimitMB>
        <warningThresholdPct>${data.warningThresholdPct}</warningThresholdPct>
      </config>
    `);
  }

  return res.json({
    ok: true,
    data,
    requestId: req.id
  });
});

export default router;