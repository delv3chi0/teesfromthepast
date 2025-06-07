// backend/controllers/adminController.js
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Design from '../models/Design.js';
import ProductCategory from '../models/ProductCategory.js';
import ProductType from '../models/ProductType.js';
import Product from '../models/Product.js';

// --- USER MANAGEMENT CONTROLLERS ---
const getAllUsersAdmin = asyncHandler(async (req, res) => {
    const users = await User.find({}).select('-password');
    res.json(users || []);
});
const getUserByIdAdmin = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    if (user) { res.json(user); }
    else { res.status(404); throw new Error('User not found'); }
});
const updateUserAdmin = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;
        user.firstName = req.body.firstName !== undefined ? req.body.firstName : user.firstName;
        user.lastName = req.body.lastName !== undefined ? req.body.lastName : user.lastName;
        if (req.body.isAdmin !== undefined) {
            if (req.user._id.toString() === user._id.toString() && user.isAdmin && req.body.isAdmin === false) {
                res.status(400);
                throw new Error('Admins cannot remove their own admin status.');
            }
            user.isAdmin = req.body.isAdmin;
        }
        const updatedUser = await user.save();
        const userToSend = { ...updatedUser.toObject() };
        delete userToSend.password;
        res.json(userToSend);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});
const deleteUserAdmin = asyncHandler(async (req, res) => {
    if (req.user._id.toString() === req.params.id) {
        res.status(400);
        throw new Error('Admins cannot delete their own account.');
    }
    const user = await User.findById(req.params.id);
    if (user) {
        await User.deleteOne({ _id: user._id });
        res.json({ message: 'User removed successfully' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// --- ORDER MANAGEMENT CONTROLLERS ---
const getAllOrdersAdmin = asyncHandler(async (req, res) => {
    const orders = await Order.find({}).populate('user', 'id username email').sort({ createdAt: -1 });
    res.json(orders || []);
});
const deleteOrderAdmin = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
        await Order.deleteOne({ _id: req.params.id });
        res.json({ message: 'Order removed successfully' });
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});
const getOrderByIdAdmin = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'username email firstName lastName')
        .populate('orderItems.designId', 'imageDataUrl prompt');
    if (order) {
        res.json(order);
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

// === NEW FUNCTION START: updateOrderStatusAdmin ===
const updateOrderStatusAdmin = asyncHandler(async (req, res) => {
    const { status } = req.body;
    
    // Ensure the provided status is one of the allowed values.
    // NOTE: These values should match the `enum` in your Order.js model schema.
    const allowedStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
        res.status(400);
        throw new Error(`Invalid status. Must be one of: ${allowedStatuses.join(', ')}`);
    }

    const order = await Order.findById(req.params.id);

    if (order) {
        order.orderStatus = status;
        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});
// === NEW FUNCTION END ===


// --- DESIGN MANAGEMENT CONTROLLERS ---
const getAllDesignsAdmin = asyncHandler(async (req, res) => {
    const designs = await Design.find({}).populate('user', 'id username email').sort({ createdAt: -1 });
    res.json(designs || []);
});

// --- PRODUCT CATEGORY MANAGEMENT ---
const createProductCategoryAdmin = asyncHandler(async (req, res) => {
    const { name, description, isActive } = req.body;
    const categoryExists = await ProductCategory.findOne({ name });
    if (categoryExists) {
        res.status(400);
        throw new Error(`Product category '${name}' already exists`);
    }
    const category = new ProductCategory({ name, description, isActive: isActive !== undefined ? isActive : true });
    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
});
const getProductCategoriesAdmin = asyncHandler(async (req, res) => {
    const categories = await ProductCategory.find({}).sort({ name: 1 });
    res.json(categories);
});
const getProductCategoryByIdAdmin = asyncHandler(async (req, res) => {
    const category = await ProductCategory.findById(req.params.id);
    if (category) { res.json(category); }
    else { res.status(404); throw new Error('Product category not found'); }
});
const updateProductCategoryAdmin = asyncHandler(async (req, res) => {
    const { name, description, isActive } = req.body;
    const category = await ProductCategory.findById(req.params.id);
    if (category) {
        if (name && name !== category.name) {
            const categoryExists = await ProductCategory.findOne({ name: name, _id: { $ne: req.params.id } });
            if (categoryExists) {
                res.status(400);
                throw new Error(`Product category name '${name}' already exists.`);
            }
        }
        category.name = name || category.name;
        category.description = description !== undefined ? description : category.description;
        category.isActive = isActive !== undefined ? isActive : category.isActive;
        const updatedCategory = await category.save();
        res.json(updatedCategory);
    } else {
        res.status(404);
        throw new Error('Product category not found');
    }
});
const deleteProductCategoryAdmin = asyncHandler(async (req, res) => {
    const category = await ProductCategory.findById(req.params.id);
    if (category) {
        const productTypeUsingCategory = await ProductType.findOne({ category: req.params.id });
        if (productTypeUsingCategory) {
            res.status(400);
            throw new Error('Cannot delete category. It is currently in use by one or more product types.');
        }
        await ProductCategory.deleteOne({ _id: req.params.id });
        res.json({ message: 'Product category removed' });
    } else {
        res.status(404);
        throw new Error('Product category not found');
    }
});

// --- PRODUCT TYPE MANAGEMENT ---
const createProductTypeAdmin = asyncHandler(async (req, res) => {
    const { name, category: categoryId, description, isActive } = req.body;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        res.status(400);
        throw new Error('Invalid Product Category ID format.');
    }
    const categoryExists = await ProductCategory.findById(categoryId);
    if (!categoryExists) {
        res.status(400);
        throw new Error('Selected product category does not exist.');
    }
    const typeExists = await ProductType.findOne({ name });
    if (typeExists) {
        res.status(400);
        throw new Error(`Product type '${name}' already exists`);
    }
    const productType = new ProductType({ name, category: categoryId, description, isActive: isActive !== undefined ? isActive : true });
    const createdProductType = await productType.save();
    res.status(201).json(createdProductType);
});
const getProductTypesAdmin = asyncHandler(async (req, res) => {
    const productTypes = await ProductType.find({}).populate('category', 'name').sort({ name: 1 });
    res.json(productTypes);
});
const getProductTypeByIdAdmin = asyncHandler(async (req, res) => {
    const productType = await ProductType.findById(req.params.id).populate('category', 'name description');
    if (productType) { res.json(productType); }
    else { res.status(404); throw new Error('Product type not found'); }
});
const updateProductTypeAdmin = asyncHandler(async (req, res) => {
    const { name, category: categoryId, description, isActive } = req.body;
    const productType = await ProductType.findById(req.params.id);
    if (productType) {
        if (name && name !== productType.name) {
            const typeExists = await ProductType.findOne({ name: name, _id: { $ne: req.params.id } });
            if (typeExists) {
                res.status(400);
                throw new Error(`Product type name '${name}' already exists.`);
            }
        }
        productType.name = name || productType.name;
        if (categoryId) {
            if (!mongoose.Types.ObjectId.isValid(categoryId)) {
                res.status(400);
                throw new Error('Invalid Product Category ID format for update.');
            }
            const categoryExists = await ProductCategory.findById(categoryId);
            if (!categoryExists) {
                res.status(400);
                throw new Error('Selected product category for update does not exist.');
            }
            productType.category = categoryId;
        }
        productType.description = description !== undefined ? description : productType.description;
        productType.isActive = isActive !== undefined ? isActive : productType.isActive;
        const updatedProductType = await productType.save();
        await updatedProductType.populate('category', 'name');
        res.json(updatedProductType);
    } else {
        res.status(404);
        throw new Error('Product type not found');
    }
});
const deleteProductTypeAdmin = asyncHandler(async (req, res) => {
    const productType = await ProductType.findById(req.params.id);
    if (productType) {
        const productUsingType = await Product.findOne({ productType: req.params.id });
        if (productUsingType) {
            res.status(400);
            throw new Error('Cannot delete type. It is currently in use by one or more products.');
        }
        await ProductType.deleteOne({ _id: req.params.id });
        res.json({ message: 'Product type removed' });
    } else {
        res.status(404);
        throw new Error('Product type not found');
    }
});

// --- PRODUCT MANAGEMENT ---
const createProductAdmin = asyncHandler(async (req, res) => {
    const { name, productType: productTypeId, description, basePrice, tags, isActive, variants } = req.body;
    if (!mongoose.Types.ObjectId.isValid(productTypeId)) {
        res.status(400);
        throw new Error('Invalid Product Type ID format.');
    }
    const productTypeExists = await ProductType.findById(productTypeId);
    if (!productTypeExists) {
        res.status(400);
        throw new Error('Selected product type does not exist.');
    }
    if (variants && !Array.isArray(variants)) {
        res.status(400);
        throw new Error('Variants must be an array.');
    }
    if (variants) {
        const allSkus = [];
        for (const colorVariant of variants) {
            if (!colorVariant.colorName || !colorVariant.imageMockupFront) {
                res.status(400);
                throw new Error('Each color variant must have a colorName and imageMockupFront.');
            }
            if (!colorVariant.sizes || !Array.isArray(colorVariant.sizes)) {
                res.status(400);
                throw new Error(`Color variant '${colorVariant.colorName}' must have a 'sizes' array.`);
            }
            for (const sizeVariant of colorVariant.sizes) {
                if (sizeVariant.inStock || sizeVariant.sku) {
                    if (!sizeVariant.sku) {
                        res.status(400);
                        throw new Error(`Size '${sizeVariant.size}' for color '${colorVariant.colorName}' is in stock but has no SKU.`);
                    }
                    allSkus.push(sizeVariant.sku);
                }
            }
        }
        const uniqueSkus = new Set(allSkus);
        if (uniqueSkus.size !== allSkus.length) {
            res.status(400);
            throw new Error('Duplicate SKUs found within the submitted variants. SKUs must be unique.');
        }
        if (allSkus.length > 0) {
            const existingProductWithSku = await Product.findOne({ 'variants.sizes.sku': { $in: allSkus } });
            if (existingProductWithSku) {
                res.status(400);
                throw new Error(`One or more SKUs already exist in another product (e.g., in product '${existingProductWithSku.name}'). SKUs must be globally unique.`);
            }
        }
    }
    const product = new Product({ name, productType: productTypeId, description, basePrice, tags: tags || [], isActive: isActive !== undefined ? isActive : true, variants: variants || [] });
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
});
const getProductsAdmin = asyncHandler(async (req, res) => {
    const products = await Product.find({}).sort({ name: 1 }).lean();
    res.json(products);
});
const getProductByIdAdmin = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate({ path: 'productType', populate: { path: 'category', select: 'name' } });
    if (product) {
        res.json(product);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});
const updateProductAdmin = asyncHandler(async (req, res) => {
    const { name, productType: productTypeId, description, basePrice, tags, isActive, variants } = req.body;
    const product = await Product.findById(req.params.id);
    if (product) {
        product.name = name || product.name;
        product.description = description !== undefined ? description : product.description;
        product.basePrice = basePrice !== undefined ? basePrice : product.basePrice;
        product.tags = tags !== undefined ? tags : product.tags;
        product.isActive = isActive !== undefined ? isActive : product.isActive;
        if (productTypeId) {
            if (!mongoose.Types.ObjectId.isValid(productTypeId)) {
                res.status(400);
                throw new Error('Invalid Product Type ID format for update.');
            }
            const productTypeExists = await ProductType.findById(productTypeId);
            if (!productTypeExists) {
                res.status(400);
                throw new Error('Selected product type for update does not exist.');
            }
            product.productType = productTypeId;
        }
        if (variants !== undefined) {
            if (!Array.isArray(variants)) {
                res.status(400);
                throw new Error('Variants must be an array.');
            }
            const allSkus = [];
            for (const colorVariant of variants) {
                if (!colorVariant.colorName || !colorVariant.imageMockupFront) {
                    res.status(400);
                    throw new Error('Each color variant must have a colorName and imageMockupFront.');
                }
                for (const sizeVariant of colorVariant.sizes) {
                    if (sizeVariant.inStock || sizeVariant.sku) {
                        if (!sizeVariant.sku) {
                            res.status(400);
                            throw new Error(`Size '${sizeVariant.size}' for color '${colorVariant.colorName}' is in stock but has no SKU.`);
                        }
                        allSkus.push(sizeVariant.sku);
                    }
                }
            }
            const uniqueSkus = new Set(allSkus);
            if (uniqueSkus.size !== allSkus.length) {
                res.status(400);
                throw new Error('Duplicate SKUs found within the submitted variants for update.');
            }
            if (allSkus.length > 0) {
                const skuExistsElsewhere = await Product.findOne({ 'variants.sizes.sku': { $in: allSkus }, _id: { $ne: req.params.id } });
                if (skuExistsElsewhere) {
                    res.status(400);
                    throw new Error(`One or more SKUs already exist in another product ('${skuExistsElsewhere.name}').`);
                }
            }
            product.variants = variants;
        }
        const updatedProduct = await product.save();
        await updatedProduct.populate({ path: 'productType', select: 'name category', populate: { path: 'category', select: 'name' } });
        res.json(updatedProduct);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});
const deleteProductAdmin = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        await Product.deleteOne({ _id: req.params.id });
        res.json({ message: 'Product removed' });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

export {
    getAllUsersAdmin, getUserByIdAdmin, updateUserAdmin, deleteUserAdmin,
    getAllOrdersAdmin, deleteOrderAdmin, getOrderByIdAdmin, updateOrderStatusAdmin, // <-- Added updateOrderStatusAdmin here
    getAllDesignsAdmin,
    createProductCategoryAdmin, getProductCategoriesAdmin, getProductCategoryByIdAdmin, updateProductCategoryAdmin, deleteProductCategoryAdmin,
    createProductTypeAdmin, getProductTypesAdmin, getProductTypeByIdAdmin, updateProductTypeAdmin, deleteProductTypeAdmin,
    createProductAdmin, getProductsAdmin, getProductByIdAdmin, updateProductAdmin, deleteProductAdmin
};
