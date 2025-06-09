// backend/models/Design.js
import mongoose from 'mongoose';

const designSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        ref: 'User' 
    },
    prompt: { 
        type: String,
        required: true
    },
    imageDataUrl: { 
        type: String,
        required: true
    },
    // --- NEW CONTEST FIELDS ---
    isSubmittedForContest: {
        type: Boolean,
        default: false
    },
    contestSubmissionMonth: { // To store 'YYYY-MM' e.g., '2025-06'
        type: String, 
        index: true // Good to index if we query by this often
    },
    votes: {
        type: Number,
        default: 0
    }
    // --- END NEW CONTEST FIELDS ---
}, {
    timestamps: true 
});

// Make sure a user can only submit one design per month (if desired by unique index)
// This is an advanced index. For now, we'll handle the logic in the route.
// designSchema.index({ user: 1, contestSubmissionMonth: 1 }, { unique: true, partialFilterExpression: { isSubmittedForContest: true } });

const Design = mongoose.model('Design', designSchema);
export default Design;
