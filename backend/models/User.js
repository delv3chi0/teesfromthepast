// backend/models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' }
    // instagramHandle and tiktokHandle have been removed
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
export default User;
