// backend/controllers/storefrontProductController.js
import asyncHandler from 'express-async-handler';
import ProductType from '../models/ProductType.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

// This function is unchanged and works as intended.
const getActiveProductTypes = asyncHandler(async (req, res) => {
    const activeTypes = await ProductType.find({ isActive: true }).lean();
    if (!activeTypes.length) { return res.json([]); }
    const typesWithProducts = [];
    for (const type of activeTypes) {
        const product = await Product.findOne({ productType: type._id, isActive: true, 'variants.0': { $exists: true } });
        if (product) {
            typesWithProducts.push({ _id: type._id, name: type.name });
        }
    }
    res.json(typesWithProducts);
});

// This function is for the Product Studio and is now also corrected and simplified.
const getActiveProductsByType = asyncHandler(async (req, res) => {
    const { productTypeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productTypeId)) { res.status(400); throw new Error('Invalid Product Type ID.'); }
    
    const products = await Product.find({ productType: productTypeId, isActive: true, 'variants.0': { $exists: true } })
        .select('name description slug basePrice variants productType')
        .lean();
        
    res.json(products);
});

// === THE FIX: THIS IS THE NEW, SIMPLIFIED, AND CORRECT FUNCTION ===
const getShopData = asyncHandler(async (req, res) => {
    // 1. Get all active product types first.
    const activeProductTypes = await ProductType.find({ isActive: true }).sort('name').lean();
    const shopData = [];

    // 2. Loop through each category one by one for clarity and stability.
    for (const type of activeProductTypes) {
        // 3. Find all active products for this category.
        const products = await Product.find({
            productType: type._id,
            isActive: true,
        }).select('name slug description basePrice variants').lean();

        if (products.length > 0) {
            const productsForShop = products
                .map(product => {
                    // Ensure there's at least one variant with an image and in-stock sizes
                    if (!product.variants || product.variants.length === 0) return null;

                    const displayVariant = product.variants.find(v => v.isDefaultDisplay) || product.variants[0];
                    if (!displayVariant) return null;

                    // Ensure there is at least one size in stock for the display variant
                    const hasInStockSize = displayVariant.sizes?.some(s => s.inStock);
                    if (!hasInStockSize) return null;
                    
                    const primaryImage = displayVariant.imageSet?.find(img => img.isPrimary) || displayVariant.imageSet?.[0];
                    if (!primaryImage?.url) return null;

                    // 5. Explicitly build the final object. This guarantees all fields are present.
                    return {
                        _id: product._id,
                        name: product.name,
                        slug: product.slug, // The slug is now guaranteed to be here.
                        description: product.description,
                        basePrice: product.basePrice,
                        defaultImage: primaryImage.url
                    };
                })
                .filter(Boolean); // Filter out any null products

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


// This function is unchanged and works as intended.
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
