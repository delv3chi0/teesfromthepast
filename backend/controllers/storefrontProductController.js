import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

// NEW FUNCTION: Gets a simple list of all active products
const getAllActiveProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({ isActive: true, 'variants.0': { $exists: true } })
        .select('name variants description basePrice slug') // Removed category
        .lean(); // Removed .populate('category', 'name')
    res.json(products);
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
  getAllActiveProducts,
  getProductBySlug,
};
