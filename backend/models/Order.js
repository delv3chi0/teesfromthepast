import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, // Assuming you have a Product model
  designId: { type: mongoose.Schema.Types.ObjectId, ref: 'Design' }, // Optional, if the item has a custom design
  name: { type: String, required: true }, // Product name at the time of order (frontend uses this for productName)
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true }, // Price per item at the time of order (frontend uses this for priceAtPurchase)
  size: { type: String },
  color: { type: String },
  customImageURL: { type: String }, // URL to the customized image on the product
  // Add other variant specific fields if needed
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
      street1: { type: String, required: true }, // <--- MODIFIED: Changed from 'street' to 'street1'
      street2: { type: String }, // <--- ADDED: For optional second address line
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
      phone: { type: String }, // <--- ADDED: If you capture phone for shipping
    },
    // <--- ADDED: Billing address schema, consistent with shipping
    billingAddress: {
      recipientName: { type: String, required: true },
      street1: { type: String, required: true },
      street2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
      phone: { type: String },
    },
    paymentIntentId: { type: String, required: true }, // From Stripe
    paymentStatus: { type: String, required: true, default: 'Pending' }, // e.g., Pending, Succeeded, Failed
    totalAmount: { type: Number, required: true, default: 0.0 }, // Total price in cents (matches frontend)
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
