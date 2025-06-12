// backend/controllers/adminController.js
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Design from '../models/Design.js';
import ProductCategory from '../models/ProductCategory.js';
import ProductType from '../models/ProductType.js';
import Product from '../models/Product.js';

const getDashboardSummary = asyncHandler(async (req, res) => {
    const [totalSalesData, totalOrders, newUserCount, recentOrders] = await Promise.all([
        Order.aggregate([ { $match: { paymentStatus: 'Succeeded' } }, { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } } ]),
        Order.countDocuments({}),
        User.countDocuments({ createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) } }),
        Order.find({}).sort({ createdAt: -1 }).limit(5).populate('user', 'username email')
    ]);
    const totalRevenue = totalSalesData.length > 0 ? totalSalesData[0].totalRevenue : 0;
    res.json({ totalRevenue, totalOrders, newUserCount, recentOrders });
});

const getAllUsersAdmin = asyncHandler(async (req, res) => {
    const users = await User.find({}).select('-password');
    res.json(users || []);
});
const getUserByIdAdmin = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    if (user) { res.json(user); } else { res.status(404); throw new Error('User not found'); }
});
const updateUserAdmin = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) { user.username = req.body.username || user.username; user.email = req.body.email || user.email; user.firstName = req.body.firstName !== undefined ? req.body.firstName : user.firstName; user.lastName = req.body.lastName !== undefined ? req.body.lastName : user.lastName; if (req.body.isAdmin !== undefined) { if (req.user._id.toString() === user._id.toString() && user.isAdmin && req.body.isAdmin === false) { res.status(400); throw new Error('Admins cannot remove their own admin status.'); } user.isAdmin = req.body.isAdmin; } const updatedUser = await user.save(); const userToSend = { ...updatedUser.toObject() }; delete userToSend.password; res.json(userToSend);
    } else { res.status(404); throw new Error('User not found'); }
});
const deleteUserAdmin = asyncHandler(async (req, res) => {
    if (req.user._id.toString() === req.params.id) { res.status(400); throw new Error('Admins cannot delete their own account.'); }
    const user = await User.findById(req.params.id);
    if (user) { await User.deleteOne({ _id: user._id }); res.json({ message: 'User removed successfully' }); } else { res.status(404); throw new Error('User not found'); }
});

const getAllOrdersAdmin = asyncHandler(async (req, res) => {
    const orders = await Order.find({}).populate('user', 'id username email').sort({ createdAt: -1 });
    res.json(orders || []);
});
const deleteOrderAdmin = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) { await Order.deleteOne({ _id: req.params.id }); res.json({ message: 'Order removed successfully' }); } else { res.status(404); throw new Error('Order not found'); }
});
const getOrderByIdAdmin = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate('user', 'username email firstName lastName').populate('orderItems.designId', 'imageDataUrl prompt');
    if (order) { res.json(order); } else { res.status(404); throw new Error('Order not found'); }
});
const updateOrderStatusAdmin = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const allowedStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!status || !allowedStatuses.includes(status)) { res.status(400); throw new Error(`Invalid status.`); }
    const order = await Order.findById(req.params.id);
    if (order) { order.orderStatus = status; const updatedOrder = await order.save(); res.json(updatedOrder); } else { res.status(404); throw new Error('Order not found'); }
});

const getAllDesignsAdmin = asyncHandler(async (req, res) => {
    const designs = await Design.find({}).populate('user', 'id username email').sort({ createdAt: -1 });
    res.json(designs || []);
});
const deleteDesignAdmin = asyncHandler(async (req, res) => {
    const design = await Design.findById(req.params.id);
    if (design) { await Design.deleteOne({ _id: req.params.id }); res.json({ message: 'Design removed successfully' }); } 
    else { res.status(404); throw new Error('Design not found'); }
});

const createProductCategoryAdmin = asyncHandler(async (req, res) => {
    const { name, description, isActive } = req.body;
    const categoryExists = await ProductCategory.findOne({ name });
    if (categoryExists) { res.status(400); throw new Error(`Product category '${name}' already exists`); }
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
    if (category) { res.json(category); } else { res.status(404); throw new Error('Product category not found'); }
});
const updateProductCategoryAdmin = asyncHandler(async (req, res) => {
    const { name, description, isActive } = req.body;
    const category = await ProductCategory.findById(req.params.id);
    if (category) {
        if (name && name !== category.name) {
            const categoryExists = await ProductCategory.findOne({ name: name, _id: { $ne: req.params.id } });
            if (categoryExists) { res.status(400); throw new Error(`Product category name '${name}' already exists.`); }
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
        if (productTypeUsingCategory) { res.status(400); throw new Error('Cannot delete category. It is currently in use by one or more product types.'); }
        await ProductCategory.deleteOne({ _id: req.params.id });
        res.json({ message: 'Product category removed' });
    } else {
        res.status(404);
        throw new Error('Product category not found');
    }
});

// FINAL CORRECTED VERSION: Description is not required.
const createProductTypeAdmin = asyncHandler(async (req, res) => {
    const { name, category, description } = req.body;

    if (!name || !category) {
        return res.status(400).json({ message: 'Name and category are required fields.' });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) { 
        return res.status(400).json({ message: 'The provided Category ID is not a valid format.' }); 
    }

    const categoryExists = await ProductCategory.findById(category);
    if (!categoryExists) {
        return res.status(404).json({ message: 'The selected category does not exist.' });
    }

    const typeExists = await ProductType.findOne({ name, category });
    if (typeExists) {
        return res.status(400).json({ message: `A product type named '${name}' already exists in this category.` });
    }

    const productType = new ProductType({
        name,
        category,
        description: description || '', // Handle optional description
    });

    const createdProduct = await productType.save();
    res.status(201).json(createdProduct);
});

// CORRECTED: Ensures the category is populated for display on the frontend
const getProductTypesAdmin = asyncHandler(async (req, res) => {
    const productTypes = await ProductType.find({}).populate('category', 'name').sort({ name: 1 });
    res.json(productTypes);
});

const getProductTypeByIdAdmin = asyncHandler(async (req, res) => {
    const productType = await ProductType.findById(req.params.id).populate('category', 'name description');
    if (productType) { res.json(productType); } else { res.status(404); throw new Error('Product type not found'); }
});
const updateProductTypeAdmin = asyncHandler(async (req, res) => {
    const { name, category: categoryId, description, isActive } = req.body;
    const productType = await ProductType.findById(req.params.id);
    if (productType) {
        if (name && name !== productType.name) {
            const typeExists = await ProductType.findOne({ name: name, _id: { $ne: req.params.id } });
            if (typeExists) { res.status(400); throw new Error(`Product type name '${name}' already exists.`); }
        }
        productType.name = name || productType.name;
        if (categoryId) {
            if (!mongoose.Types.ObjectId.isValid(categoryId)) { res.status(400); throw new Error('Invalid Product Category ID format for update.'); }
            const categoryExists = await ProductCategory.findById(categoryId);
            if (!categoryExists) { res.status(400); throw new Error('Selected product category for update does not exist.'); }
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
        if (productUsingType) { res.status(400); throw new Error('Cannot delete type. It is currently in use by one or more products.'); }
        await ProductType.deleteOne({ _id: req.params.id });
        res.json({ message: 'Product type removed' });
    } else {
        res.status(404);
        throw new Error('Product type not found');
    }
});

const createProductAdmin = asyncHandler(async (req, res) => {
    const { name, productType, description, basePrice, tags, isActive, variants } = req.body;
    if (!productType) { res.status(400); throw new Error('Product type is required.'); }
    const productTypeExists = await ProductType.findById(productType);
    if (!productTypeExists) { res.status(400); throw new Error('Selected product type does not exist.'); }
    if (variants) {
        if (!Array.isArray(variants)) { res.status(400); throw new Error('Variants must be an array.'); }
        if (variants.length > 0 && variants.filter(v => v.isDefaultDisplay).length !== 1) {
            res.status(400); throw new Error('Exactly one variant must be marked as the default display.');
        }
    }
    const product = new Product({ name, productType, description, basePrice, tags, isActive, variants });
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
});

const getProductsAdmin = asyncHandler(async (req, res) => {
    const products = await Product.find({}).select('-variants').sort({ name: 1 }).lean();
    res.json(products);
});

const getProductByIdAdmin = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate({ path: 'productType', select: 'name' });
    if (product) { res.json(product); } else { res.status(404); throw new Error('Product not found'); }
});

const updateProductAdmin = asyncHandler(async (req, res) => {
    const { name, productType, description, basePrice, tags, isActive, variants } = req.body;
    const product = await Product.findById(req.params.id);
    if (product) {
        if (variants) {
            if (!Array.isArray(variants)) { res.status(400); throw new Error('Variants must be an array.'); }
            if (variants.length > 0 && variants.filter(v => v.isDefaultDisplay).length !== 1) {
                res.status(400); throw new Error('Exactly one variant must be marked as the default display.');
            }
        }
        product.name = name;
        product.productType = productType;
        product.description = description;
        product.basePrice = basePrice;
        product.tags = tags;
        product.isActive = isActive;
        product.variants = variants;
        const updatedProduct = await product.save();
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
    getDashboardSummary, getAllUsersAdmin, getUserByIdAdmin, updateUserAdmin, deleteUserAdmin,
    getAllOrdersAdmin, deleteOrderAdmin, getOrderByIdAdmin, updateOrderStatusAdmin,
    getAllDesignsAdmin, deleteDesignAdmin,
    createProductCategoryAdmin, getProductCategoriesAdmin, getProductCategoryByIdAdmin, updateProductCategoryAdmin, deleteProductCategoryAdmin,
    createProductTypeAdmin, getProductTypesAdmin, getProductTypeByIdAdmin, updateProductTypeAdmin, deleteProductTypeAdmin,
    createProductAdmin, getProductsAdmin, getProductByIdAdmin, updateProductAdmin, deleteProductAdmin
};
