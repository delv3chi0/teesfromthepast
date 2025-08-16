// backend/models/Design.js
import mongoose from 'mongoose';

const designSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    prompt: { type: String, required: true },

    // Inline preview (legacy). Now optional because we may rely on Cloudinary master.
    imageDataUrl: { type: String },

    // Cloudinary fields (new)
    publicUrl:  { type: String }, // full-size PNG (a.k.a. masterUrl)
    thumbUrl:   { type: String }, // small jpg for grids
    publicId:   { type: String }, // cloudinary public_id (handy for deletes)

    // Contest
    isSubmittedForContest: { type: Boolean, default: false },
    contestSubmissionMonth: { type: String, index: true }, // 'YYYY-MM'
    votes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Fast per-user recency queries
designSchema.index({ user: 1, createdAt: -1 });

const Design = mongoose.model('Design', designSchema);
export default Design;
