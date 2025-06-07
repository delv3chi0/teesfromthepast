// backend/controllers/adminController.js
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Design from '../models/Design.js';
import ProductCategory from '../models/ProductCategory.js';
import ProductType from '../models/ProductType.js';
import Product from '../models/Product.js';

// === NEW FUNCTION for Dashboard ===
const getDashboardSummary = asyncHandler(async (req, res) => {
    // Get total revenue from successful orders
    const totalSalesData = await Order.aggregate([
        { $match: { paymentStatus: 'Succeeded' } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = totalSalesData.length > 0 ? totalSalesData[0].totalRevenue : 0;

    // Get total number of orders
    const totalOrders = await Order.countDocuments({});

    // Get number of new users in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUserCount = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    // Get the 5 most recent orders
    const recentOrders = await Order.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'username email');

    res.json({
        totalRevenue,
        totalOrders,
        newUserCount,
        recentOrders,
    });
});

// --- USER MANAGEMENT CONTROLLERS ---
const getAllUsersAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const getUserByIdAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const updateUserAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const deleteUserAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });

// --- ORDER MANAGEMENT CONTROLLERS ---
const getAllOrdersAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const deleteOrderAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const getOrderByIdAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const updateOrderStatusAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });

// --- DESIGN MANAGEMENT CONTROLLERS ---
const getAllDesignsAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });

// --- PRODUCT CATEGORY MANAGEMENT ---
const createProductCategoryAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const getProductCategoriesAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const getProductCategoryByIdAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const updateProductCategoryAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const deleteProductCategoryAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });

// --- PRODUCT TYPE MANAGEMENT ---
const createProductTypeAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const getProductTypesAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const getProductTypeByIdAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const updateProductTypeAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const deleteProductTypeAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });

// --- PRODUCT MANAGEMENT ---
const createProductAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const getProductsAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const getProductByIdAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const updateProductAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });
const deleteProductAdmin = asyncHandler(async (req, res) => { /* ... no changes ... */ });

export {
    getDashboardSummary, // <-- Added new function
    getAllUsersAdmin, getUserByIdAdmin, updateUserAdmin, deleteUserAdmin,
    getAllOrdersAdmin, deleteOrderAdmin, getOrderByIdAdmin, updateOrderStatusAdmin,
    getAllDesignsAdmin,
    createProductCategoryAdmin, getProductCategoriesAdmin, getProductCategoryByIdAdmin, updateProductCategoryAdmin, deleteProductCategoryAdmin,
    createProductTypeAdmin, getProductTypesAdmin, getProductTypeByIdAdmin, updateProductTypeAdmin, deleteProductTypeAdmin,
    createProductAdmin, getProductsAdmin, getProductByIdAdmin, updateProductAdmin, deleteProductAdmin
};
