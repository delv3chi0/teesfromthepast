// backend/controllers/storefrontProductController.js
import asyncHandler from 'express-async-handler';
import ProductType from '../models/ProductType.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';


// @desc    Get all active product types that have active products
// @route   GET /api/storefront/product-types
// @access  Public
const getActiveProductTypes = asyncHandler(async (req, res) => {
  // This function is fine, no changes needed.
  const activeTypes = await ProductType.find({ isActive: true }).lean();
  if (!activeTypes.length) {
    return res.json([]);
  }
  const typesWithProducts = [];
  for (const type of activeTypes) {
    const count = await Product.countDocuments({
      productType: type._id,
      isActive: true,
      'variants.0': { $exists: true }
    });
    if (count > 0) {
      typesWithProducts.push({ _id: type._id, name: type.name });
    }
  }
  res.json(typesWithProducts);
});


// @desc    Get active products for a given product type ID, with their active variants
// @route   GET /api/storefront/products/type/:productTypeId
// @access  Public
const getActiveProductsByType = asyncHandler(async (req, res) => {
  const { productTypeId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productTypeId)) {
    res.status(400);
    throw new Error('Invalid Product Type ID.');
  }

  // The initial query is fine.
  const products = await Product.find({
    productType: productTypeId,
    isActive: true,
    'variants.0': { $exists: true }
  })
  .select('name description basePrice variants productType')
  .lean();

  if (!products.length) {
    return res.json([]);
  }
  
  // ==================== MODIFICATION START ====================
  // This block is now updated to handle both NEW and OLD variant structures.

  const productsWithCleanedVariants = products.map(product => {
    if (!product.variants || product.variants.length === 0) {
      return { ...product, variants: [] };
    }

    // Check the format of the FIRST variant to decide which logic to use.
    const isNewFormat = product.variants[0].sizes !== undefined;

    if (isNewFormat) {
      // NEW FORMAT: Process nested variants
      const newFormatVariants = product.variants.map(colorVariant => {
        // For each color, only include sizes that are marked as inStock.
        const availableSizes = colorVariant.sizes
          .filter(size => size.inStock)
          .map(size => ({ // Select only the fields safe to send to the public
            size: size.size,
            sku: size.sku,
            priceModifier: size.priceModifier,
          }));
        
        // Only include this color if it has at least one size available
        if (availableSizes.length > 0) {
          return {
            colorName: colorVariant.colorName,
            colorHex: colorVariant.colorHex,
            imageMockupFront: colorVariant.imageMockupFront,
            imageMockupBack: colorVariant.imageMockupBack,
            sizes: availableSizes // Send the filtered, nested sizes array
          };
        }
        return null; // Return null for colors with no available sizes
      }).filter(Boolean); // Filter out any null entries

      return { ...product, variants: newFormatVariants };

    } else {
      // OLD FORMAT: Gracefully handle flat variants, only sending what's in stock.
      const oldFormatVariants = product.variants
        .filter(variant => variant.stock > 0) // Only send variants with stock > 0
        .map(variant => ({ // Selectively map the fields to ensure consistency
          sku: variant.sku,
          colorName: variant.colorName,
          colorHex: variant.colorHex,
          size: variant.size,
          priceModifier: variant.priceModifier,
          imageMockupFront: variant.imageMockupFront,
          imageMockupBack: variant.imageMockupBack,
        }));
      
      return { ...product, variants: oldFormatVariants };
    }
  });
  // ==================== MODIFICATION END ====================

  res.json(productsWithCleanedVariants);
});

export {
  getActiveProductTypes,
  getActiveProductsByType,
};
