// backend/controllers/adminController.js
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Design from '../models/Design.js';
import Product from '../models/Product.js';
import { logAdminAction } from '../utils/audit.js';

// --- Dashboard ---
const getDashboardSummary = asyncHandler(async (req, res) => {
  const [totalSalesData, totalOrders, newUserCount, recentOrders] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: 'Succeeded' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
    ]),
    Order.countDocuments({}),
    User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } }),
    Order.find({}).sort({ createdAt: -1 }).limit(5).populate('user', 'username email'),
  ]);
  const totalRevenue = totalSalesData.length > 0 ? totalSalesData[0].totalRevenue : 0;
  res.json({ totalRevenue, totalOrders, newUserCount, recentOrders });
});

// --- Users ---
const getAllUsersAdmin = asyncHandler(async (_req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users || []);
});
const getUserByIdAdmin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (user) res.json(user);
  else { res.status(404); throw new Error('User not found'); }
});
const updateUserAdmin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }

  const before = {
    username: user.username, email: user.email,
    firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin,
  };

  user.username = req.body.username || user.username;
  user.email = req.body.email || user.email;
  user.firstName = req.body.firstName ?? user.firstName;
  user.lastName = req.body.lastName ?? user.lastName;
  if (req.body.isAdmin !== undefined) {
    if (req.user._id.toString() === user._id.toString() && user.isAdmin && req.body.isAdmin === false) {
      res.status(400); throw new Error('Admins cannot remove their own admin status.');
    }
    user.isAdmin = req.body.isAdmin;
  }
  if (req.body.newPassword) user.password = req.body.newPassword;

  const updatedUser = await user.save();
  const toSend = { ...updatedUser.toObject() }; delete toSend.password;

  // audit
  await logAdminAction(req, {
    action: 'USER_UPDATE',
    targetType: 'User',
    targetId: user._id,
    meta: { before, after: { username: updatedUser.username, email: updatedUser.email, firstName: updatedUser.firstName, lastName: updatedUser.lastName, isAdmin: updatedUser.isAdmin } },
  });

  res.json(toSend);
});
const deleteUserAdmin = asyncHandler(async (req, res) => {
  if (req.user._id.toString() === req.params.id) { res.status(400); throw new Error('Admins cannot delete their own account.'); }
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }
  await User.deleteOne({ _id: user._id });

  await logAdminAction(req, { action: 'USER_DELETE', targetType: 'User', targetId: user._id, meta: { email: user.email } });
  res.json({ message: 'User removed successfully' });
});

// --- Orders ---
const getAllOrdersAdmin = asyncHandler(async (_req, res) => {
  const orders = await Order.find({}).populate('user', 'id username email').sort({ createdAt: -1 });
  res.json(orders || []);
});
const deleteOrderAdmin = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404); throw new Error('Order not found'); }
  await Order.deleteOne({ _id: req.params.id });

  await logAdminAction(req, { action: 'ORDER_DELETE', targetType: 'Order', targetId: order._id, meta: { totalAmount: order.totalAmount } });
  res.json({ message: 'Order removed successfully' });
});
const getOrderByIdAdmin = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'username email firstName lastName')
    .populate('orderItems.designId', 'imageDataUrl prompt');
  if (order) res.json(order);
  else { res.status(404); throw new Error('Order not found'); }
});
const updateOrderStatusAdmin = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
  if (!status || !allowedStatuses.includes(status)) { res.status(400); throw new Error('Invalid status.'); }
  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404); throw new Error('Order not found'); }
  const before = order.orderStatus;
  order.orderStatus = status;
  const updatedOrder = await order.save();

  await logAdminAction(req, { action: 'ORDER_STATUS_UPDATE', targetType: 'Order', targetId: order._id, meta: { before, after: status } });
  res.json(updatedOrder);
});

// --- Designs ---
const getAllDesignsAdmin = asyncHandler(async (_req, res) => {
  const designs = await Design.find({})
    .populate('user', 'id username email')
    .sort({ createdAt: -1 });
  res.json(designs || []);
});
const deleteDesignAdmin = asyncHandler(async (req, res) => {
  const design = await Design.findById(req.params.id);
  if (!design) { res.status(404); throw new Error('Design not found'); }
  await Design.deleteOne({ _id: req.params.id });

  await logAdminAction(req, { action: 'DESIGN_DELETE', targetType: 'Design', targetId: design._id, meta: { prompt: design.prompt } });
  res.json({ message: 'Design removed successfully' });
});

// --- Products ---
const createProductAdmin = asyncHandler(async (req, res) => {
  const { name, description, basePrice, tags, isActive, variants } = req.body;
  if (variants) {
    if (!Array.isArray(variants)) { res.status(400); throw new Error('Variants must be an array.'); }
    if (variants.length > 0 && variants.filter(v => v.isDefaultDisplay).length !== 1) {
      res.status(400); throw new Error('Exactly one variant must be marked as the default display.');
    }
  }
  const product = new Product({ name, description, basePrice, tags, isActive, variants });
  const createdProduct = await product.save();

  await logAdminAction(req, { action: 'PRODUCT_CREATE', targetType: 'Product', targetId: createdProduct._id, meta: { name } });
  res.status(201).json(createdProduct);
});

const getProductsAdmin = asyncHandler(async (_req, res) => {
  const products = await Product.find({}).select('-variants').sort({ name: 1 }).lean();
  res.json(products);
});

const getProductByIdAdmin = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (product) res.json(product);
  else { res.status(404); throw new Error('Product not found'); }
});

const updateProductAdmin = asyncHandler(async (req, res) => {
  const { name, description, basePrice, tags, isActive, variants } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) { res.status(404); throw new Error('Product not found'); }

  const before = { name: product.name, basePrice: product.basePrice, isActive: product.isActive };
  product.name = name;
  product.description = description;
  product.basePrice = basePrice;
  product.tags = tags;
  product.isActive = isActive;
  product.variants = variants;

  const updated = await product.save();

  await logAdminAction(req, { action: 'PRODUCT_UPDATE', targetType: 'Product', targetId: product._id, meta: { before, after: { name, basePrice, isActive } } });
  res.json(updated);
});

const deleteProductAdmin = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) { res.status(404); throw new Error('Product not found'); }
  await Product.deleteOne({ _id: req.params.id });

  await logAdminAction(req, { action: 'PRODUCT_DELETE', targetType: 'Product', targetId: product._id, meta: { name: product.name } });
  res.json({ message: 'Product removed' });
});

export {
  getDashboardSummary, getAllUsersAdmin, getUserByIdAdmin, updateUserAdmin, deleteUserAdmin,
  getAllOrdersAdmin, deleteOrderAdmin, getOrderByIdAdmin, updateOrderStatusAdmin,
  getAllDesignsAdmin, deleteDesignAdmin,
  createProductAdmin, getProductsAdmin, getProductByIdAdmin, updateProductAdmin, deleteProductAdmin
};
