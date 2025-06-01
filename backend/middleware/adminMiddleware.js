// backend/models/User.js
import mongoose from 'mongoose';

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

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    firstName: { type: String, default: '', trim: true },
    lastName: { type: String, default: '', trim: true },

    // --- NEW isAdmin FIELD ---
    isAdmin: {
        type: Boolean,
        required: true,
        default: false,
    },
    // --- END isAdmin FIELD ---

    lastContestSubmissionMonth: {
        type: String
    },
    monthlyVoteRecord: [{
        month: String, // 'YYYY-MM'
        designsVotedFor: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Design'
        }]
    }],

    shippingAddress: addressSchema,
    billingAddress: addressSchema,

}, { timestamps: true });

// Ensure virtuals are included when converting to JSON (e.g. for 'id')
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });


const User = mongoose.model('User', UserSchema);
export default User;
