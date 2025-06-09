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

const getActiveProductsByType = asyncHandler(async (req, res) => {
  const { productTypeId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productTypeId)) {
    res.status(400);
    throw new Error('Invalid Product Type ID.');
  }
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
  
  const productsWithCleanedVariants = products.map(product => {
    if (!product.variants || product.variants.length === 0) {
      return { ...product, variants: [] };
    }
    const isNewFormat = product.variants[0].sizes !== undefined;

    if (isNewFormat) {
      const newFormatVariants = product.variants.map(colorVariant => {
        const availableSizes = colorVariant.sizes.filter(size => size.inStock).map(size => ({
          size: size.size,
          sku: size.sku,
          priceModifier: size.priceModifier
        }));
        
        if (availableSizes.length > 0) {
          // For new format, send the whole imageSet. The primary image will be chosen on the frontend.
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
      // OLD FORMAT: Gracefully handle flat variants
      const oldFormatVariants = product.variants
        .filter(variant => variant.stock > 0)
        .map(variant => ({
          sku: variant.sku,
          colorName: variant.colorName,
          colorHex: variant.colorHex,
          size: variant.size,
          priceModifier: variant.priceModifier,
          // === THE FIX IS HERE: Ensure imageMockupFront is always included for old data ===
          imageMockupFront: variant.imageMockupFront,
          imageSet: [{ url: variant.imageMockupFront, isPrimary: true }] // Create a compatible imageSet
        }));
      
      return { ...product, variants: oldFormatVariants };
    }
  });

  res.json(productsWithCleanedVariants);
});

const getShopData = asyncHandler(async (req, res) => {
    const products = await Product.aggregate([
        { $match: { isActive: true, 'variants.0': { $exists: true } } },
        { $unwind: '$variants' },
        { $match: { 'variants.isDefaultDisplay': true, 'variants.sizes': { $elemMatch: { inStock: true } } } },
        {
            $project: {
                name: 1, slug: 1, basePrice: 1, productType: 1,
                defaultImage: {
                    $let: {
                        vars: { primaryImage: { $arrayElemAt: [ { $filter: { input: '$variants.imageSet', as: 'image', cond: { $eq: ['$$image.isPrimary', true] } } }, 0] } },
                        in: '$$primaryImage.url'
                    }
                }
            }
        },
        { $group: { _id: '$productType', products: { $push: '$$ROOT' } } },
        { $lookup: { from: 'producttypes', localField: '_id', foreignField: '_id', as: 'categoryInfo' } },
        { $unwind: '$categoryInfo' },
        { $match: { 'categoryInfo.isActive': true } },
        { $project: { _id: 0, categoryName: '$categoryInfo.name', categoryId: '$categoryInfo._id', products: 1 } },
        { $sort: { categoryName: 1 } }
    ]);
    res.json(products);
});

const getProductBySlug = asyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!product) {
        res.status(404); throw new Error('Product not found');
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
  getActiveProductTypes,
  getActiveProductsByType,
  getShopData,
  getProductBySlug,
};
