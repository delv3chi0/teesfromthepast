import mongoose from 'mongoose';
import slugify from 'slugify';

const sizeVariantSchema = new mongoose.Schema({
  size: { type: String, required: true, trim: true },
  sku: { type: String, required: true, trim: true },
  inStock: { type: Boolean, default: true },
  priceModifier: { type: Number, default: 0 },
  podVariantId: { type: String, trim: true },
}, { _id: false });

const colorVariantSchema = new mongoose.Schema({
  colorName: { type: String, required: true, trim: true },
  colorHex: { type: String, trim: true },
  podProductId: { type: String, trim: true },
  isDefaultDisplay: { type: Boolean, default: false },
  imageSet: [{
    url: { type: String, required: true },
    altText: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false }
  }],
  sizes: [sizeVariantSchema],
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true },
    // CORRECTED: Replaced 'productType' with 'category' to match our new system
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory', required: true },
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

productSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

productSchema.index({ name: 'text', description: 'text', tags: 'text' });

const Product = mongoose.model('Product', productSchema);

export default Product;
