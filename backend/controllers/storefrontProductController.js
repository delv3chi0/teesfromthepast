import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import mongoose from 'mongoose'; // Keep if mongoose.Types.ObjectId.isValid is used, otherwise can be removed.

const getAllActiveProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({
        isActive: true,
        'variants.0': { $exists: true } // Ensure product has at least one variant
    })
    .select('name slug description basePrice tags isActive variants.colorName variants.colorHex variants.podProductId variants.isDefaultDisplay variants.imageSet.url variants.imageSet.altText variants.imageSet.isPrimary variants.sizes.size variants.sizes.sku variants.sizes.inStock variants.sizes.priceModifier variants.sizes.podVariantId variants.printAreas.placement variants.printAreas.widthInches variants.printAreas.heightInches variants.printAreas.mockupImage')
    .lean(); // .lean() makes the query faster by returning plain JavaScript objects

    res.json(products);
});


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
