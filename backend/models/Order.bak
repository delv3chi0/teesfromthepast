// backend/models/Order.js
import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { // Could be a designId or a general product ID from your system
    type: String, // Or mongoose.Schema.Types.ObjectId if linking to another collection
    required: true,
  },
  productName: { // e.g., "Custom T-Shirt with '80s Retro Design'"
    type: String,
    required: true,
  },
  productType: { // e.g., 'T-Shirt', 'Hoodie'
    type: String,
    required: true,
  },
  size: { type: String },
  color: { type: String },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  priceAtPurchase: { // Price per item at the time of purchase
    type: Number,
    required: true,
  },
  // Store the AI design image URL if applicable and available
  designImageUrl: { type: String },
  // You might also want to store the prompt or other design specifics
  designPrompt: { type: String },
});

const addressSchema = new mongoose.Schema({
  recipientName: { type: String, required: true },
  street1: { type: String, required: true },
  street2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
  phone: { type: String },
}, { _id: false }); // _id: false for subdocuments if not needed

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', // Make sure you have a User model
    },
    items: [orderItemSchema],
    totalAmount: { // Total amount in cents, matching Stripe
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'usd',
    },
    shippingAddress: {
      type: addressSchema,
      required: true,
    },
    billingAddress: { // Could be same as shipping
      type: addressSchema,
      required: true,
    },
    paymentIntentId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'requires_action'], // Based on PaymentIntent statuses
      default: 'pending',
    },
    orderStatus: {
      type: String,
      enum: ['Pending Confirmation', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'],
      default: 'Pending Confirmation', // Initial status after payment success
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
