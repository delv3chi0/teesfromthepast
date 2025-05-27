// backend/models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    // instagramHandle and tiktokHandle were removed

    // --- NEW CONTEST FIELD ---
    lastContestSubmissionMonth: { // To store 'YYYY-MM' e.g., '2025-06'
        type: String 
    }
    // --- END NEW CONTEST FIELD ---
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
export default User;
