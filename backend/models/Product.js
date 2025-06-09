// backend/models/Product.js
import mongoose from 'mongoose';
import slugify from 'slugify';

const sizeVariantSchema = new mongoose.Schema({
  size: { type: String, required: true, trim: true },
  sku: { type: String, required: true, trim: true },
  inStock: { type: Boolean, default: true },
  priceModifier: { type: Number, default: 0 },
  podVariantId: { type: String, trim: true },
}, { _id: false });

// === MODIFIED: The schema for a color variant is now upgraded ===
const colorVariantSchema = new mongoose.Schema({
  colorName: { type: String, required: true, trim: true },
  colorHex: { type: String, trim: true },
  podProductId: { type: String, trim: true },
  isDefaultDisplay: { type: Boolean, default: false }, // To mark the product's default color
  
  // This new array replaces imageMockupFront and imageMockupBack
  imageSet: [{
    url: { type: String, required: true },
    altText: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false } // To mark the color's primary image
  }],
  
  sizes: [sizeVariantSchema],
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // === NEW: slug field for user-friendly URLs ===
    slug: { type: String, unique: true, sparse: true },
    productType: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductType', required: true },
    description: { type: String, required: true, trim: true },
    basePrice: { type: Number, required: true, min: 0 },
    tags: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
    variants: [colorVariantSchema],
  },
  {
    timestamps: true,
  }
);

// === NEW: Mongoose middleware to auto-generate the slug before saving ===
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

productSchema.index({ name: 'text', description: 'text', tags: 'text' });

const Product = mongoose.model('Product', productSchema);

export default Product;
