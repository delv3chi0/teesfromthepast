// backend/models/Design.js
import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  mode: { type: String, enum: ['t2i','i2i'], index: true },
  cfgScale: { type: Number },
  steps: { type: Number },
  aspectRatio: { type: String },
  imageStrength: { type: Number },
  // from generation meta
  sourceWidth: { type: Number },
  sourceHeight: { type: Number },
  targetLongEdge: { type: Number },
  scaleApplied: { type: Number },
}, { _id: false });

const designSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    prompt: { type: String, required: true },
    negativePrompt: { type: String },

    // Inline preview (legacy). Optional; we usually rely on Cloudinary master/preview.
    imageDataUrl: { type: String },

    // Cloudinary fields (new)
    publicUrl:  { type: String }, // full-size PNG (a.k.a. masterUrl)
    thumbUrl:   { type: String }, // small jpg for grids
    publicId:   { type: String }, // cloudinary public_id (for deletes)

    settings: settingsSchema,

    // Contest
    isSubmittedForContest: { type: Boolean, default: false },
    contestSubmissionMonth: { type: String, index: true }, // 'YYYY-MM'
    votes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Fast per-user recency queries
designSchema.index({ user: 1, createdAt: -1 });
designSchema.index({ createdAt: -1 });

const Design = mongoose.model('Design', designSchema);
export default Design;
