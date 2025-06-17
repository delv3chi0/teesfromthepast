import asyncHandler from 'express-async-handler';
// REMOVED: import ProductCategory from '../models/ProductCategory.js'; // No longer needed
import Product from '../models/Product.js';
import mongoose from 'mongoose'; // Still useful if you use mongoose.Types.ObjectId.isValid elsewhere, but not directly for products now.

// REMOVED: getAllActiveProducts function - getShopData will now serve this purpose for the frontend.

// REMOVED: getActiveProductsByCategory function - no more categories to filter by.

// MODIFIED: getShopData function
// This function now gets ALL active products and returns them in a flat array,
// extracting basePrice and defaultImage for direct display on the shop page.
const getShopData = asyncHandler(async (req, res) => {
    const allProducts = await Product.find({
        isActive: true,
        // Ensure products have at least one in-stock size variant to be displayed
        'variants.sizes.inStock': true
    })
    // Select necessary fields. 'category' is no longer a field on Product.
    .select('name slug description variants basePrice')
    .lean(); // Use .lean() for plain JavaScript objects for better performance

    const productsForShop = allProducts.map(product => {
        // Ensure product.variants exists and is an array before trying to find
        if (!product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
            return null; // Skip products without variants or empty variants array
        }

        // Use the existing logic to determine the display variant and primary image
        // Find the default display variant or fall back to the first one
        const displayVariant = product.variants.find(v => v.isDefaultDisplay === true) || product.variants[0];
        if (!displayVariant) {
            // This case should ideally not be hit if product.variants is not empty,
            // but it acts as a safeguard.
            return null;
        }

        // Find the primary image for the display variant, or fall back to the first image in the set
        const primaryImage = displayVariant.imageSet?.find(img => img.isPrimary === true) || displayVariant.imageSet?.[0];
        // Ensure primaryImage and its URL exist
        if (!primaryImage?.url) {
            // If a primary image URL is missing, skip this product from the shop display
            return null;
        }

        return {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            basePrice: product.basePrice, // This now comes directly from the product, as per your schema
            defaultImage: primaryImage.url // Use the extracted primary image URL
        };
    }).filter(p => p !== null); // Filter out any nulls if products were skipped due to missing variants/images

    res.json(productsForShop); // Send the flat array of processed products
});


const getProductBySlug = asyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!product) {
        res.status(404);
        throw new Error('Product not found'); // Corrected from 'new new Error' to 'new Error'
    }

    // Filter variants to only include those with in-stock sizes
    product.variants.forEach(colorVariant => {
        if (colorVariant.sizes && Array.isArray(colorVariant.sizes)) {
            colorVariant.sizes = colorVariant.sizes.filter(size => size.inStock);
        }
    });
    // Remove color variants that end up with no in-stock sizes after filtering
    product.variants = product.variants.filter(colorVariant => colorVariant.sizes && colorVariant.sizes.length > 0);

    res.json(product);
});

export {
    getShopData, // Export the modified function
    getProductBySlug,
};
