// backend/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // Make sure you have 'bcryptjs' installed (npm install bcryptjs)

// Define a reusable address sub-schema
const addressSchemaDefinition = {
  recipientName: { type: String, trim: true, default: '' },
  street1: { type: String, trim: true, default: '' },
  street2: { type: String, trim: true, default: '' }, // Optional
  city: { type: String, trim: true, default: '' },
  state: { type: String, trim: true, default: '' }, // Or province
  zipCode: { type: String, trim: true, default: '' },
  country: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },    // Optional, but often useful
};

const addressSchema = new mongoose.Schema(addressSchemaDefinition, { _id: false });

// Define the schema for a user's monthly vote record
const monthlyVoteRecordSchema = new mongoose.Schema({
  month: { type: String, required: true }, // 'YYYY-MM' format
  designsVotedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Design' }],
}, { _id: false }); // Don't need an _id for subdocuments in this array

const UserSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true, trim: true },
  email:     { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:  { type: String, required: true },
  firstName: { type: String, default: '', trim: true },
  lastName:  { type: String, default: '', trim: true },
  isAdmin:   { type: Boolean, required: true, default: false },

  // --- CONTEST FIELDS ---
  lastContestSubmissionMonth: { type: String }, // 'YYYY-MM'
  monthlyVoteRecord: [monthlyVoteRecordSchema],

  shippingAddress: addressSchema,
  billingAddress:  addressSchema,

  // ---- PASSWORD RESET ----
  passwordResetToken:   { type: String, select: false },
  passwordResetExpires: { type: Date,   select: false },

  // ---- EMAIL VERIFICATION ----
  emailVerifiedAt: { type: Date, default: null },
  emailVerification: {
    tokenHash: { type: String },    // sha256(token)
    expiresAt: { type: Date },
    attempts:  { type: Number, default: 0 },
    lastSentAt:{ type: Date },
  },
}, { timestamps: true });

// Hash password before save (if modified)
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare entered vs stored password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

UserSchema.set('toJSON',  { virtuals: true });
UserSchema.set('toObject',{ virtuals: true });

const User = mongoose.model('User', UserSchema);
export default User;
