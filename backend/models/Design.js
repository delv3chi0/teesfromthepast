import mongoose from 'mongoose';

const designSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    ref: 'User',
    index: true,           // keep quick filter by user
  },
  prompt: { 
    type: String,
    required: true
  },
  imageDataUrl: { 
    type: String,
    required: true
  },
  // --- CONTEST FIELDS (yours) ---
  isSubmittedForContest: {
    type: Boolean,
    default: false
  },
  contestSubmissionMonth: { // 'YYYY-MM' e.g., '2025-06'
    type: String,
    index: true
  },
  votes: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// 🔑 KEY FIX: supports .sort({ createdAt: -1 }) per user without memory overflow
designSchema.index({ user: 1, createdAt: -1 });

const Design = mongoose.model('Design', designSchema);
export default Design;
