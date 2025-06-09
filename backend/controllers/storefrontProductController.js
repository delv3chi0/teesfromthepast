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
  if (!mongoose.Types.ObjectId.isValid(productTypeId)) {
    res.status(400);
    throw new Error('Invalid Product Type ID.');
  }
  const products = await Product.find({ productType: productTypeId, isActive: true, 'variants.0': { $exists: true } })
    .select('name description basePrice variants productType')
    .lean();

  if (!products.length) {
    return res.json([]);
  }
  
  const productsWithCleanedVariants = products.map(product => {
    if (!product.variants || product.variants.length === 0) {
      return { ...product, variants: [] };
    }
    const newFormatVariants = product.variants.map(colorVariant => {
        const availableSizes = (colorVariant.sizes || []).filter(size => size.inStock).map(size => ({
            size: size.size, sku: size.sku, priceModifier: size.priceModifier
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
  });

  res.json(productsWithCleanedVariants);
});

const getShopData = asyncHandler(async (req, res) => {
    const productTypes = await ProductType.find({ isActive: true }).sort('name').lean();
    const productPromises = productTypes.map(type => {
        return Product.aggregate([
            { $match: { isActive: true, productType: type._id } },
            {
                $project: {
                    name: 1, slug: 1, basePrice: 1,
                    defaultVariant: { $arrayElemAt: [ { $filter: { input: '$variants', as: 'v', cond: { $eq: ['$$v.isDefaultDisplay', true] } } }, 0 ] }
                }
            },
            {
                $project: {
                    name: 1, slug: 1, basePrice: 1,
                    defaultImage: {
                       $let: {
                           vars: { primaryImage: { $arrayElemAt: [ { $filter: { input: '$defaultVariant.imageSet', as: 'img', cond: { $eq: ['$$img.isPrimary', true] } } }, 0] } },
                           in: '$$primaryImage.url'
                       }
                    }
                }
            }
        ]).then(products => ({
            categoryId: type._id,
            categoryName: type.name,
            products: products.filter(p => p.defaultImage) // Only include products that have a default image set
        }));
    });
    
    const categoriesWithProducts = (await Promise.all(productPromises)).filter(cat => cat.products.length > 0);
    res.json(categoriesWithProducts);
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
  getActiveProductTypes,
  getActiveProductsByType,
  getShopData,
  getProductBySlug,
};
