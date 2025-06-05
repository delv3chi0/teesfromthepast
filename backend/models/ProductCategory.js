// backend/models/ProductCategory.js
import mongoose from 'mongoose';

const productCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: { // To allow hiding a category without deleting it
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const ProductCategory = mongoose.model('ProductCategory', productCategorySchema);

export default ProductCategory;
