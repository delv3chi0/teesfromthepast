import asyncHandler from 'express-async-handler';
import ProductCategory from '../models/ProductCategory.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

// NEW FUNCTION: Gets a simple list of all active products (Already exists, but good for reference)
const getAllActiveProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({ isActive: true, 'variants.0': { $exists: true } })
        .select('name variants description basePrice category slug')
        .populate('category', 'name')
        .lean();
    res.json(products);
});

// This function now gets products by a CATEGORY ID (No change needed here for now)
const getActiveProductsByCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        res.status(400);
        throw new Error('Invalid Category ID.');
    }
    const products = await Product.find({
        category: categoryId,
        isActive: true,
        'variants.0': { $exists: true }
    }).select('name description basePrice variants category slug').lean();

    if (!products.length) {
        return res.json([]);
    }

    const productsWithCleanedVariants = products.map(product => {
        if (!product.variants || product.variants.length === 0) {
            return { ...product, variants: [] };
        }
        const isNewFormat = product.variants[0].sizes !== undefined;

        if (isNewFormat) {
            const newFormatVariants = product.variants.map(colorVariant => {
                const availableSizes = (colorVariant.sizes || []).filter(size => size.inStock).map(size => ({
                    size: size.size,
                    sku: size.sku,
                    priceModifier: size.priceModifier
                }));
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
        } else {
            const oldFormatVariants = product.variants
                .filter(variant => variant.stock > 0)
                .map(variant => ({
                    sku: variant.sku,
                    colorName: variant.colorName,
                    colorHex: variant.colorHex,
                    size: variant.size,
                    priceModifier: variant.priceModifier,
                    imageMockupFront: variant.imageMockupFront,
                    imageSet: [{ url: variant.imageMockupFront, isPrimary: true }]
                }));

            return { ...product, variants: oldFormatVariants };
        }
    });
    res.json(productsWithCleanedVariants);
});

// --- MODIFIED FUNCTION: getShopData ---
// This function now gets ALL active products and returns them in a flat array,
// extracting basePrice and defaultImage for direct display on the shop page.
const getShopData = asyncHandler(async (req, res) => {
    // Find all active products that have at least one in-stock variant
    const allProducts = await Product.find({
        isActive: true,
        'variants.sizes.inStock': true // Assuming this correctly identifies products with in-stock variants
    }).select('name slug description variants basePrice').lean(); // Select necessary fields including 'variants' to process

    const productsForShop = allProducts.map(product => {
        // Ensure product.variants exists and is an array before trying to find
        if (!product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
            return null; // Skip products without variants
        }

        // Use the existing logic to determine the display variant and primary image
        const displayVariant = product.variants.find(v => v.isDefaultDisplay === true) || product.variants[0];
        if (!displayVariant) return null; // Should not happen if product.variants is checked above

        const primaryImage = displayVariant.imageSet?.find(img => img.isPrimary === true) || displayVariant.imageSet?.[0];
        // Ensure primaryImage and its URL exist
        if (!primaryImage?.url) return null; // Skip products without a primary image

        return {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            basePrice: product.basePrice, // Use basePrice from the product (as per your current product data)
            defaultImage: primaryImage.url // Use the extracted primary image URL
        };
    }).filter(p => p !== null); // Filter out any nulls if products were skipped

    res.json(productsForShop); // Send the flat array of processed products
});


/*
// --- OLD getShopData (for reference, if you want to keep it commented) ---
// This now builds the shop page data based on Categories
const getShopData_OLD = asyncHandler(async (req, res) => {
    const activeCategories = await ProductCategory.find({ isActive: true }).sort('name').lean();
    const shopData = [];

    for (const category of activeCategories) {
        const products = await Product.find({
            category: category._id,
            isActive: true,
            'variants.sizes.inStock': true
        }).select('name slug description basePrice variants').lean();

        if (products.length > 0) {
            const productsForShop = products.map(product => {
                const displayVariant = product.variants.find(v => v.isDefaultDisplay === true) || product.variants[0];
                if (!displayVariant) return null;

                const primaryImage = displayVariant.imageSet?.find(img => img.isPrimary === true) || displayVariant.imageSet?.[0];
                if (!primaryImage?.url) return null;

                return {
                    _id: product._id,
                    name: product.name,
                    slug: product.slug,
                    description: product.description,
                    basePrice: product.basePrice,
                    defaultImage: primaryImage.url
                };
            }).filter(p => p !== null);

            if (productsForShop.length > 0) {
                shopData.push({
                    categoryId: category._id,
                    categoryName: category.name,
                    products: productsForShop
                });
            }
        }
    }
    res.json(shopData);
});
*/
// --- END MODIFIED FUNCTION ---

const getProductBySlug = asyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!product) {
        res.status(404);
        throw new new Error('Product not found'); // Corrected typo here: `new Error`
    }

    product.variants.forEach(colorVariant => {
        if (colorVariant.sizes && Array.isArray(colorVariant.sizes)) {
            colorVariant.sizes = colorVariant.sizes.filter(size => size.inStock);
        }
    });
    product.variants = product.variants.filter(colorVariant => colorVariant.sizes && colorVariant.sizes.length > 0);

    res.json(product);
});

export {
    getAllActiveProducts,
    getActiveProductsByCategory,
    getShopData, // Export the modified function
    getProductBySlug,
};
