import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: String,
  lastName: String,
  instagramHandle: String,
  tiktokHandle: String
});

const User = mongoose.model('User', UserSchema);
export default User;
