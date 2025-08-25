/**
 * Checkout routes.
 * Adds alias POST / (i.e., /api/checkout) that maps to existing createPaymentIntent handler.
 */
import { Router } from "express";
import { sendError } from "../utils/sendError.js";
import { createPaymentIntent } from "../controllers/checkoutController.js"; // Assumes you have this

const router = Router();

// Legacy route: /api/checkout/create-payment-intent
router.post("/create-payment-intent", createPaymentIntent);

// New alias: /api/checkout
router.post("/", async (req, res, next) => {
  // Example validation—adjust to your real required fields
  if (!req.body || !req.body.amount) {
    return sendError(
      res,
      "MISSING_FIELDS",
      400,
      "Required payment fields are missing.",
      { required: ["amount"] }
    );
  }
  return createPaymentIntent(req, res, next);
});

export default router;
