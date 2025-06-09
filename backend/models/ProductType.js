// backend/models/ProductType.js
import mongoose from 'mongoose';

const productTypeSchema = new mongoose.Schema(
  {
    name: { // e.g., "T-Shirt", "Hoodie", "Tank Top", "Sweatshirt", "Long-sleeve T-shirt", "Polo Shirt", "Baby Onesie", "Hat"
      type: String,
      required: true,
      unique: true, // Usually a product type name is unique
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductCategory',
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: { // To allow hiding a product type without deleting it
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const ProductType = mongoose.model('ProductType', productTypeSchema);

export default ProductType;
