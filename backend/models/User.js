// backend/models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true }, // ADDED
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, default: '' },         // ADDED default
    lastName: { type: String, default: '' },          // ADDED default
    instagramHandle: { type: String, default: '' },   // ADDED default
    tiktokHandle: { type: String, default: '' }       // ADDED default
}, { timestamps: true });                             // ADDED timestamps

const User = mongoose.model('User', UserSchema);
export default User;
