import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Design from '../models/Design.js';
// REMOVED: import ProductCategory from '../models/ProductCategory.js'; // No longer exists
import Product from '../models/Product.js';

// --- Dashboard ---
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

// --- User Management --- (No changes needed here)
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

// --- Order Management --- (No changes needed here)
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

// --- Design Management --- (No changes needed here)
const getAllDesignsAdmin = asyncHandler(async (req, res) => {
    const designs = await Design.find({}).populate('user', 'id username email').sort({ createdAt: -1 });
    res.json(designs || []);
});
const deleteDesignAdmin = asyncHandler(async (req, res) => {
    const design = await Design.findById(req.params.id);
    if (design) { await Design.deleteOne({ _id: req.params.id }); res.json({ message: 'Design removed successfully' }); }
    else { res.status(404); throw new Error('Design not found'); }
});

// --- Category Management --- (ALL REMOVED)
// Removed: createProductCategoryAdmin
// Removed: getProductCategoriesAdmin
// Removed: getProductCategoryByIdAdmin
// Removed: updateProductCategoryAdmin
// Removed: deleteProductCategoryAdmin
// These functions are no longer relevant as ProductCategory model is removed.

// --- Product Management --- (MODIFIED to remove 'category' references)
const createProductAdmin = asyncHandler(async (req, res) => {
    // REMOVED 'category' from destructuring
    const { name, description, basePrice, tags, isActive, variants } = req.body;

    // REMOVED category validation:
    // if (!category) { res.status(400); throw new Error('Category is required.'); }
    // const categoryExists = await ProductCategory.findById(category);
    // if (!categoryExists) { res.status(400); throw new Error('Selected category does not exist.'); }

    if (variants) {
        if (!Array.isArray(variants)) { res.status(400); throw new Error('Variants must be an array.'); }
        if (variants.length > 0 && variants.filter(v => v.isDefaultDisplay).length !== 1) {
            res.status(400); throw new Error('Exactly one variant must be marked as the default display.');
        }
    }
    // REMOVED 'category' from product creation
    const product = new Product({ name, description, basePrice, tags, isActive, variants });
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
});

const getProductsAdmin = asyncHandler(async (req, res) => {
    // Removed .populate('category', 'name') as 'category' no longer exists on Product
    const products = await Product.find({}).select('-variants').sort({ name: 1 }).lean();
    res.json(products);
});

const getProductByIdAdmin = asyncHandler(async (req, res) => {
    // Removed .populate('category', 'name') as 'category' no longer exists on Product
    const product = await Product.findById(req.params.id); // Removed .populate() for category
    if (product) { res.json(product); } else { res.status(404); throw new Error('Product not found'); }
});

const updateProductAdmin = asyncHandler(async (req, res) => {
    // REMOVED 'category' from destructuring
    const { name, description, basePrice, tags, isActive, variants } = req.body;
    const product = await Product.findById(req.params.id);
    if (product) {
        if (variants) {
            if (!Array.isArray(variants)) { res.status(400); throw new Error('Variants must be an array.'); }
            if (variants.length > 0 && variants.filter(v => v.isDefaultDisplay).length !== 1) {
                res.status(400); throw new Error('Exactly one variant must be marked as the default display.');
            }
        }
        product.name = name;
        // REMOVED: product.category = category; // No longer assign category
        product.description = description;
        product.basePrice = basePrice;
        product.tags = tags;
        product.isActive = isActive;
        product.variants = variants;
        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } else {
        res.status(404); throw new Error('Product not found');
    }
});

const deleteProductAdmin = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        await Product.deleteOne({ _id: req.params.id });
        res.json({ message: 'Product removed' });
    } else {
        res.status(404); throw new Error('Product not found');
    }
});

export {
    getDashboardSummary, getAllUsersAdmin, getUserByIdAdmin, updateUserAdmin, deleteUserAdmin,
    getAllOrdersAdmin, deleteOrderAdmin, getOrderByIdAdmin, updateOrderStatusAdmin,
    getAllDesignsAdmin, deleteDesignAdmin,
    // REMOVED category-related exports: createProductCategoryAdmin, getProductCategoriesAdmin, getProductCategoryByIdAdmin, updateProductCategoryAdmin, deleteProductCategoryAdmin,
    createProductAdmin, getProductsAdmin, getProductByIdAdmin, updateProductAdmin, deleteProductAdmin
};
