// backend/models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },

    lastContestSubmissionMonth: { 
        type: String 
    },
    // --- NEW FIELD FOR TRACKING VOTES ---
    monthlyVoteRecord: [{
        month: String, // 'YYYY-MM'
        designsVotedFor: [{ // Array of Design ObjectIds the user voted for in that month
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Design'
        }]
    }]
    // --- END NEW FIELD ---
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
export default User;
