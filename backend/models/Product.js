// backend/models/Product.js
import mongoose from 'mongoose';

// NEW: Blueprint for a specific size within a color (e.g., "S", "M", "L")
const sizeVariantSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
    trim: true,
  },
  sku: { // Must be unique across the entire store. Checked in the controller.
    type: String,
    required: true,
    trim: true,
  },
  inStock: { // Replaces the old 'stock' field. True if available, false if not.
    type: Boolean,
    default: true,
  },
  priceModifier: { // Amount to add/subtract from the product's base price for this specific size.
    type: Number,
    default: 0,
  },
  podVariantId: { // The specific ID for this size/color combo from the POD provider.
    type: String,
    trim: true,
  },
}, { _id: false });

// NEW: Blueprint for a color, which holds all its size information.
const colorVariantSchema = new mongoose.Schema({
  colorName: {
    type: String,
    required: true,
    trim: true,
  },
  colorHex: {
    type: String,
    trim: true,
  },
  imageMockupFront: { // URL for the front mockup image for this color.
    type: String,
    required: true,
  },
  imageMockupBack: { // Optional URL for the back mockup image for this color.
    type: String,
  },
  podProductId: { // The general product ID from the POD provider for this color.
    type: String,
    trim: true,
  },
  sizes: [sizeVariantSchema], // An array of all available sizes for this color.
});


const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    productType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductType',
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    tags: [{ type: String, trim: true }],
    isActive: {
      type: Boolean,
      default: true,
    },
    // This now uses the new nested colorVariantSchema
    variants: [colorVariantSchema],
  },
  {
    timestamps: true,
  }
);

productSchema.index({ name: 'text', description: 'text', tags: 'text' });

const Product = mongoose.model('Product', productSchema);

export default Product;
