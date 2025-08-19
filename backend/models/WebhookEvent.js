// backend/models/WebhookEvent.js
import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // Stripe event.id
    type: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("WebhookEvent", schema);
