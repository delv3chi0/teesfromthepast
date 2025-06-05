// backend/controllers/storefrontProductController.js
import asyncHandler from 'express-async-handler';
import ProductType from '../models/ProductType.js';
import Product from '../models/Product.js';
import ProductCategory from '../models/ProductCategory.js'; // May not be directly needed by ProductStudio but good for context
import mongoose from 'mongoose';


// @desc    Get all active product types that have active products
// @route   GET /api/storefront/product-types
// @access  Public
const getActiveProductTypes = asyncHandler(async (req, res) => {
  console.log('[StorefrontProductCtrl] GET /product-types - Fetching active product types with active products.');

  // Find active product types
  const activeTypes = await ProductType.find({ isActive: true }).lean(); // .lean() for plain JS objects

  if (!activeTypes.length) {
    console.log('[StorefrontProductCtrl] No active product types found.');
    return res.json([]);
  }

  // For each active type, check if it has any active products with active variants
  const typesWithProducts = [];
  for (const type of activeTypes) {
    const count = await Product.countDocuments({
      productType: type._id,
      isActive: true,
      'variants.0': { $exists: true } // Ensures there's at least one variant
      // Optionally: add 'variants.stock': { $gt: 0 } if you only want to show types with in-stock variants
    });
    if (count > 0) {
      typesWithProducts.push({ _id: type._id, name: type.name }); // Send only necessary fields
    }
  }

  console.log(`[StorefrontProductCtrl] Found ${typesWithProducts.length} active product types with products.`);
  res.json(typesWithProducts);
});


// @desc    Get active products for a given product type ID, with their active variants
// @route   GET /api/storefront/products/type/:productTypeId
// @access  Public
const getActiveProductsByType = asyncHandler(async (req, res) => {
  const { productTypeId } = req.params;
  console.log(`[StorefrontProductCtrl] GET /products/type/${productTypeId} - Fetching active products for type.`);

  if (!mongoose.Types.ObjectId.isValid(productTypeId)) {
    res.status(400);
    throw new Error('Invalid Product Type ID.');
  }

  // Find active products of the given type that have at least one variant.
  // We only select fields needed by Product Studio to keep payload small.
  const products = await Product.find({
    productType: productTypeId,
    isActive: true,
    'variants.0': { $exists: true } // Ensure product has variants defined
  })
  .select('name description basePrice variants productType') // Select necessary fields
  .lean(); // Use .lean() for performance if not modifying docs

  if (!products.length) {
    console.log(`[StorefrontProductCtrl] No active products found for type ${productTypeId}.`);
    return res.json([]);
  }
  
  // Further filter variants: e.g., only return variants that are considered "active" or in stock if needed.
  // For now, we return all variants of active products. ProductStudio will handle UI based on stock if that field is available.
  // Ensure variants have the necessary fields for ProductStudio (sku, colorName, size, imageMockupFront, priceModifier, stock if used by frontend)
  
  const productsWithFilteredVariants = products.map(product => {
    return {
      ...product,
      variants: product.variants.map(variant => ({ // Explicitly select variant fields
        sku: variant.sku,
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        size: variant.size,
        stock: variant.stock, // ProductStudio might use this
        priceModifier: variant.priceModifier,
        imageMockupFront: variant.imageMockupFront,
        imageMockupBack: variant.imageMockupBack,
        // Do NOT send POD info to the frontend here
      }))
    };
  });


  console.log(`[StorefrontProductCtrl] Found ${productsWithFilteredVariants.length} active products for type ${productTypeId}.`);
  res.json(productsWithFilteredVariants);
});

export {
  getActiveProductTypes,
  getActiveProductsByType,
};
