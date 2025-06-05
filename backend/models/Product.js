// backend/models/Product.js
import mongoose from 'mongoose';

const productVariantSchema = new mongoose.Schema({
  colorName: { // e.g., "Vintage Black", "Heather Grey", "Baby Blue"
    type: String,
    required: true,
    trim: true,
  },
  colorHex: { // Optional: For UI pickers, e.g., "#333333", "#B2BEB5"
    type: String,
    trim: true,
  },
  size: { // e.g., "S", "M", "L", "XL", "One Size", "6 Months"
    type: String,
    required: true,
    trim: true,
  },
  sku: { // Your internal Stock Keeping Unit for this specific variant. MUST BE UNIQUE.
    type: String,
    required: true,
    unique: true, // Ensures no two variants (even across different products) have the same SKU.
    trim: true,
  },
  stock: { // How many you have (can be a high number if purely POD, or actual if you hold inventory)
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  priceModifier: { // Amount to add to (or subtract from) the base product's price for this variant
    type: Number,         // e.g., 0 for standard, 2 for XXL, -5 for a sale variant.
    default: 0,
  },
  imageMockupFront: { // URL to the front mockup image for this specific variant (e.g., black shirt mockup)
    type: String,
    required: true, // Essential for Product Studio
  },
  imageMockupBack: { // Optional: URL to the back mockup image for this variant
    type: String,
  },
  // --- Print-on-Demand (POD) Fields ---
  podService: { // e.g., "Printify", "Printful", "InHouse"
    type: String,
    trim: true,
  },
  podProductId: { // The ID or SKU of this blank product variant FROM the POD provider's catalog
    type: String,   // (e.g., Printify's "blueprint_id" + "provider_id" + "variant_id" might be combined or specific fields used)
    trim: true,
  },
  podVariantId: { // Some POD services have a specific variant ID for size/color combination.
    type: String,
    trim: true,
  },
  // You might add other POD-specific fields later if needed, like print area dimensions.
});

const productSchema = new mongoose.Schema(
  {
    name: { // e.g., "Men's Premium Crewneck T-Shirt", "Unisex Classic Hoodie"
      type: String,
      required: true,
      trim: true,
    },
    productType: { // Links to a "T-Shirt", "Hoodie", etc. from ProductType model
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductType',
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    basePrice: { // The starting price for this product before any variant-specific adjustments
      type: Number,
      required: true,
      min: 0,
    },
    tags: [{ type: String, trim: true }], // For searching/filtering, e.g., "retro", "summer", "cotton"
    isActive: { // Controls if this product (and its variants) are shown to customers
      type: Boolean,
      default: true,
    },
    // defaultProductImage: { // A generic image for the product before a variant is selected (less important if variants always have mockups)
    //   type: String,
    // },
    variants: [productVariantSchema], // An array of different versions (e.g., Small Red, Medium Blue)
  },
  {
    timestamps: true,
  }
);

// Optional: Index for searching products by name or tags
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Ensure that within a single product, the combination of colorName and size is unique for variants.
// This is a more complex validation, usually handled at the application level when adding/updating variants.
// Mongoose unique indexes on subdocuments work differently. The `sku` unique global index is more critical.

const Product = mongoose.model('Product', productSchema);

export default Product;
