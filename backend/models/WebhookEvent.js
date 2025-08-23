// backend/models/WebhookEvent.js
// Stores Stripe event IDs for webhook idempotency protection.
import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // Stripe event.id
    type: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("WebhookEvent", schema);
