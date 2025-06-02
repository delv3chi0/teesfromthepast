// backend/models/Order.js
import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, // Assuming you have a Product model
  designId: { type: mongoose.Schema.Types.ObjectId, ref: 'Design' }, // Optional, if the item has a custom design
  name: { type: String, required: true }, // Product name at the time of order
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true }, // Price per item at the time of order
  size: { type: String },
  color: { type: String },
  customImageURL: { type: String }, // URL to the customized image on the product
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    orderItems: [orderItemSchema],
    shippingAddress: {
      recipientName: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    // Add billingAddress if different from shipping
    paymentIntentId: { type: String, required: true }, // From Stripe
    paymentStatus: { type: String, required: true, default: 'Pending' }, // e.g., Pending, Succeeded, Failed
    totalAmount: { type: Number, required: true, default: 0.0 },
    orderStatus: {
      type: String,
      required: true,
      default: 'Pending', // e.g., Pending, Processing, Shipped, Delivered, Cancelled
    },
    deliveredAt: { type: Date },
    shippedAt: { type: Date },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
