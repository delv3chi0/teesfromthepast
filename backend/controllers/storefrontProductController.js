// backend/controllers/storefrontProductController.js
import asyncHandler from 'express-async-handler';
import ProductType from '../models/ProductType.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

const getActiveProductTypes = asyncHandler(async (req, res) => {
  const activeTypes = await ProductType.find({ isActive: true }).lean();
  if (!activeTypes.length) {
    return res.json([]);
  }
  const typesWithProducts = [];
  for (const type of activeTypes) {
    const product = await Product.findOne({ productType: type._id, isActive: true, 'variants.0': { $exists: true } });
    if (product) {
      typesWithProducts.push({ _id: type._id, name: type.name });
    }
  }
  res.json(typesWithProducts);
});

const getActiveProductsByType = asyncHandler(async (req, res) => {
  const { productTypeId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productTypeId)) { res.status(400); throw new Error('Invalid Product Type ID.'); }
  const products = await Product.find({ productType: productTypeId, isActive: true, 'variants.0': { $exists: true } }).select('name description basePrice variants productType slug').lean();
  if (!products.length) { return res.json([]); }
  const productsWithCleanedVariants = products.map(product => {
    if (!product.variants || product.variants.length === 0) { return { ...product, variants: [] }; }
    const newFormatVariants = product.variants.map(colorVariant => {
        const availableSizes = (colorVariant.sizes || []).filter(size => size.inStock).map(size => ({ size: size.size, sku: size.sku, priceModifier: size.priceModifier }));
        if (availableSizes.length > 0) {
            return {
                colorName: colorVariant.colorName,
                colorHex: colorVariant.colorHex,
                imageSet: colorVariant.imageSet,
                sizes: availableSizes
            };
        }
        return null;
    }).filter(Boolean);
    return { ...product, variants: newFormatVariants };
  });
  res.json(productsWithCleanedVariants);
});

// === THE FINAL FIX: Replaced all previous logic with a simple, direct approach ===
const getShopData = asyncHandler(async (req, res) => {
    // 1. Get all active product categories first.
    const activeProductTypes = await ProductType.find({ isActive: true }).sort('name').lean();
    const shopData = [];

    // 2. Loop through each category one by one.
    for (const type of activeProductTypes) {
        // 3. Find all active products for this category.
        const products = await Product.find({
            productType: type._id,
            isActive: true,
            'variants.sizes.inStock': true // Only find products that have at least one size in stock
        }).select('name slug description basePrice variants').lean();

        if (products.length > 0) {
            // 4. Manually transform each product to get the data we need.
            const productsForShop = products.map(product => {
                const displayVariant = product.variants.find(v => v.isDefaultDisplay) || product.variants[0];
                if (!displayVariant) return null;

                const primaryImage = displayVariant.imageSet?.find(img => img.isPrimary) || displayVariant.imageSet?.[0];
                if (!primaryImage?.url) return null;

                // 5. Explicitly build the final object to guarantee all fields are present.
                return {
                    _id: product._id,
                    name: product.name,
                    slug: product.slug,
                    description: product.description,
                    basePrice: product.basePrice,
                    defaultImage: primaryImage.url
                };
            }).filter(Boolean);

            if (productsForShop.length > 0) {
                shopData.push({
                    categoryId: type._id,
                    categoryName: type.name,
                    products: productsForShop
                });
            }
        }
    }
    res.json(shopData);
});

const getProductBySlug = asyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!product) { res.status(404); throw new Error('Product not found'); }
    product.variants.forEach(colorVariant => {
        if (colorVariant.sizes && Array.isArray(colorVariant.sizes)) {
            colorVariant.sizes = colorVariant.sizes.filter(size => size.inStock);
        }
    });
    product.variants = product.variants.filter(colorVariant => colorVariant.sizes && colorVariant.sizes.length > 0);
    res.json(product);
});

export {
  getActiveProductTypes,
  getActiveProductsByType,
  getShopData,
  getProductBySlug,
};
