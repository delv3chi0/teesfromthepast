import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import mongoose from 'mongoose'; // Keep if mongoose.Types.ObjectId.isValid is used, otherwise can be removed.

// --- RE-INTRODUCED AND MODIFIED: getAllActiveProducts function ---
// This function is needed by ProductStudio to get products with full variant details.
const getAllActiveProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({
        isActive: true,
        'variants.0': { $exists: true } // Ensure product has at least one variant
    })
    // Crucially, select 'variants' so frontend ProductStudio receives them
    .select('name slug description basePrice tags isActive variants')
    .lean();
    res.json(products);
});
// --- END RE-INTRODUCED ---


// MODIFIED: getShopData function (remains unchanged from previous correct version)
// This serves the ShopPage (flat list with defaultImage and basePrice)
const getShopData = asyncHandler(async (req, res) => {
    const allProducts = await Product.find({
        isActive: true,
        'variants.sizes.inStock': true
    })
    .select('name slug description variants basePrice')
    .lean();

    const productsForShop = allProducts.map(product => {
        if (!product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
            return null;
        }

        const displayVariant = product.variants.find(v => v.isDefaultDisplay === true) || product.variants[0];
        if (!displayVariant) {
            return null;
        }

        const primaryImage = displayVariant.imageSet?.find(img => img.isPrimary === true) || displayVariant.imageSet?.[0];
        if (!primaryImage?.url) {
            return null;
        }

        return {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            basePrice: product.basePrice,
            defaultImage: primaryImage.url
        };
    }).filter(p => p !== null);

    res.json(productsForShop);
});


const getProductBySlug = asyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
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
    getAllActiveProducts, // <--- ADD THIS EXPORT
    getShopData,
    getProductBySlug,
};
