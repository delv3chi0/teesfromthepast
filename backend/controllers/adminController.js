// backend/controllers/adminController.js
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Design from '../models/Design.js';
import Product from '../models/Product.js';

/**
 * DASHBOARD SUMMARY
 * - Returns BOTH legacy names (totalRevenue, totalOrders, newUserCount, recentOrders)
 *   and newer names (totalRevenueCents, newUsers7d) so the UI is always happy.
 */
const getDashboardSummary = asyncHandler(async (_req, res) => {
  // Count only PAID orders for revenue (Succeeded/Paid), but show ALL orders count.
  const [paidAgg, totalOrders, newUsers7d, recentOrders] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: { $in: ['Succeeded', 'Paid'] } } },
      { $group: { _id: null, totalRevenueCents: { $sum: '$totalAmount' } } },
    ]),
    Order.countDocuments({}), // all orders placed
    User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
    Order.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('_id user createdAt totalAmount paymentStatus orderStatus orderItems')
      .populate({ path: 'user', select: 'username email' })
      .lean(),
  ]);

  const totalRevenueCents = paidAgg?.[0]?.totalRevenueCents || 0;

  // Respond with BOTH naming styles:
  return res.json({
    // Newer names (keep if other parts rely on them)
    totalRevenueCents,
    totalOrders,
    newUsers7d,
    recentOrders,

    // Legacy names your React Dashboard reads today:
    // React does ($summary.totalRevenue / 100).toFixed(2)
    totalRevenue: totalRevenueCents,
    // React reads summary.newUserCount
    newUserCount: newUsers7d,
  });
});

/* ===========================
   USER MANAGEMENT (unchanged)
   =========================== */
const getAllUsersAdmin = asyncHandler(async (_req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users || []);
});

const getUserByIdAdmin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

const updateUserAdmin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.username = req.body.username || user.username;
  user.email = req.body.email || user.email;
  user.firstName = req.body.firstName !== undefined ? req.body.firstName : user.firstName;
  user.lastName = req.body.lastName !== undefined ? req.body.lastName : user.lastName;

  if (req.body.isAdmin !== undefined) {
    // prevent self-demotion
    if (req.user._id.toString() === user._id.toString() && user.isAdmin && req.body.isAdmin === false) {
      res.status(400);
      throw new Error('Admins cannot remove their own admin status.');
    }
    user.isAdmin = req.body.isAdmin;
  }

  if (req.body.newPassword) {
    user.password = req.body.newPassword;
  }

  const updatedUser = await user.save();
  const userToSend = { ...updatedUser.toObject() };
  delete userToSend.password;
  res.json(userToSend);
});

const deleteUserAdmin = asyncHandler(async (req, res) => {
  if (req.user._id.toString() === req.params.id) {
    res.status(400);
    throw new Error('Admins cannot delete their own account.');
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  await User.deleteOne({ _id: user._id });
  res.json({ message: 'User removed successfully' });
});

/* ===========================
   ORDER MANAGEMENT (unchanged)
   =========================== */
const getAllOrdersAdmin = asyncHandler(async (_req, res) => {
  const orders = await Order.find({})
    .populate('user', 'id username email')
    .sort({ createdAt: -1 });
  res.json(orders || []);
});

const deleteOrderAdmin = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  await Order.deleteOne({ _id: req.params.id });
  res.json({ message: 'Order removed successfully' });
});

const getOrderByIdAdmin = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'username email firstName lastName')
    .populate('orderItems.designId', 'imageDataUrl prompt');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  res.json(order);
});

const updateOrderStatusAdmin = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
  if (!status || !allowedStatuses.includes(status)) {
    res.status(400);
    throw new Error('Invalid status.');
  }
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  order.orderStatus = status;
  const updatedOrder = await order.save();
  res.json(updatedOrder);
});

/* ===========================
   DESIGN MANAGEMENT (unchanged)
   =========================== */
const getAllDesignsAdmin = asyncHandler(async (_req, res) => {
  const designs = await Design.find({})
    .populate('user', 'id username email')
    .sort({ createdAt: -1 });
  res.json(designs || []);
});

const deleteDesignAdmin = asyncHandler(async (req, res) => {
  const design = await Design.findById(req.params.id);
  if (!design) {
    res.status(404);
    throw new Error('Design not found');
  }
  await Design.deleteOne({ _id: req.params.id });
  res.json({ message: 'Design removed successfully' });
});

/* ===========================
   PRODUCT MANAGEMENT (category removed)
   =========================== */
const createProductAdmin = asyncHandler(async (req, res) => {
  const { name, description, basePrice, tags, isActive, variants } = req.body;

  if (variants) {
    if (!Array.isArray(variants)) {
      res.status(400);
      throw new Error('Variants must be an array.');
    }
    if (variants.length > 0 && variants.filter(v => v.isDefaultDisplay).length !== 1) {
      res.status(400);
      throw new Error('Exactly one variant must be marked as the default display.');
    }
  }

  const product = new Product({ name, description, basePrice, tags, isActive, variants });
  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

const getProductsAdmin = asyncHandler(async (_req, res) => {
  const products = await Product.find({}).select('-variants').sort({ name: 1 }).lean();
  res.json(products);
});

const getProductByIdAdmin = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  res.json(product);
});

const updateProductAdmin = asyncHandler(async (req, res) => {
  const { name, description, basePrice, tags, isActive, variants } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (variants) {
    if (!Array.isArray(variants)) {
      res.status(400);
      throw new Error('Variants must be an array.');
    }
    if (variants.length > 0 && variants.filter(v => v.isDefaultDisplay).length !== 1) {
      res.status(400);
      throw new Error('Exactly one variant must be marked as the default display.');
    }
  }

  product.name = name;
  product.description = description;
  product.basePrice = basePrice;
  product.tags = tags;
  product.isActive = isActive;
  product.variants = variants;

  const updatedProduct = await product.save();
  res.json(updatedProduct);
});

const deleteProductAdmin = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  await Product.deleteOne({ _id: req.params.id });
  res.json({ message: 'Product removed' });
});

export {
  getDashboardSummary,
  getAllUsersAdmin,
  getUserByIdAdmin,
  updateUserAdmin,
  deleteUserAdmin,
  getAllOrdersAdmin,
  deleteOrderAdmin,
  getOrderByIdAdmin,
  updateOrderStatusAdmin,
  getAllDesignsAdmin,
  deleteDesignAdmin,
  createProductAdmin,
  getProductsAdmin,
  getProductByIdAdmin,
  updateProductAdmin,
  deleteProductAdmin,
};
