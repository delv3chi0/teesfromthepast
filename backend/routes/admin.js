import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Design from '../models/Design.js';

const router = express.Router();

// Optional: simple admin gate. If you already have isAdmin middleware, replace this with it.
function adminOnly(req, res, next) {
  try {
    if (req.user?.isAdmin) return next();
    return res.status(403).json({ message: 'Admins only.' });
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

// ------------ USERS ------------
router.get('/users', protect, adminOnly, async (_req, res) => {
  const users = await User.find({}).sort({ createdAt: -1 }).select('_id username email firstName lastName isAdmin createdAt').lean();
  res.json(users);
});

router.put('/users/:id', protect, adminOnly, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });
  const update = {
    username: req.body.username,
    email: req.body.email,
    firstName: req.body.firstName ?? '',
    lastName: req.body.lastName ?? '',
    isAdmin: !!req.body.isAdmin,
  };
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'Not found' });

  Object.assign(user, update);
  if (req.body.newPassword) user.password = req.body.newPassword;
  await user.save();
  res.json({ _id: user._id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin, createdAt: user.createdAt });
});

router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });
  const u = await User.findById(id);
  if (!u) return res.status(404).json({ message: 'Not found' });
  await u.deleteOne();
  res.json({ message: 'User deleted' });
});

// ------------ ORDERS ------------
router.get('/orders', protect, adminOnly, async (_req, res) => {
  const orders = await Order.find({})
    .sort({ createdAt: -1 })
    .select('_id user createdAt totalAmount paymentStatus orderStatus orderItems')
    .populate({ path: 'user', select: 'email username' })
    .lean();
  res.json(orders);
});

router.get('/orders/:id', protect, adminOnly, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });
  const order = await Order.findById(id)
    .populate({ path: 'user', select: 'email username' })
    .populate({ path: 'orderItems.designId', select: 'prompt imageDataUrl publicUrl thumbUrl' })
    .lean();
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
});

router.put('/orders/:id/status', protect, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });
  if (!status) return res.status(400).json({ message: 'Missing status' });
  const order = await Order.findById(id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  order.orderStatus = status;
  await order.save();
  res.json({ message: 'Status updated' });
});

router.delete('/orders/:id', protect, adminOnly, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });
  const order = await Order.findById(id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  await order.deleteOne();
  res.json({ message: 'Order deleted' });
});

// Dashboard summary used by UI
router.get('/orders/summary', protect, adminOnly, async (_req, res) => {
  const [totalAgg] = await Order.aggregate([
    { $match: { paymentStatus: { $in: ['Succeeded', 'Paid'] } } },
    { $group: { _id: null, totalRevenueCents: { $sum: '$totalAmount' }, totalOrders: { $sum: 1 } } },
  ]);
  const recentOrders = await Order.find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .select('_id user createdAt totalAmount paymentStatus orderStatus orderItems')
    .populate({ path: 'user', select: 'email username' })
    .lean();

  const since = new Date(); since.setDate(since.getDate() - 7);
  const newUsers7d = await User.countDocuments({ createdAt: { $gte: since } });
  const designs7d = await Design.countDocuments({ createdAt: { $gte: since } });

  res.json({
    totalRevenueCents: totalAgg?.totalRevenueCents || 0,
    totalOrders: totalAgg?.totalOrders || 0,
    newUsers7d,
    designs7d,
    recentOrders,
  });
});

// ------------ DESIGNS ------------
router.get('/designs', protect, adminOnly, async (_req, res) => {
  const designs = await Design.find({})
    .sort({ createdAt: -1 })
    .select('_id user prompt negativePrompt imageDataUrl publicUrl thumbUrl settings isSubmittedForContest contestSubmissionMonth votes createdAt')
    .populate({ path: 'user', select: 'username email' })
    .lean();
  res.json(designs);
});

router.delete('/designs/:id', protect, adminOnly, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });

  const design = await Design.findById(id);
  if (!design) return res.status(404).json({ message: 'Design not found' });

  // Best-effort Cloudinary cleanup (same helper as your user delete route)
  try {
    if (design.publicId && global.cloudinary?.uploader?.destroy) {
      await global.cloudinary.uploader.destroy(design.publicId, { invalidate: true, resource_type: 'image' });
    }
  } catch (e) {
    console.warn('[Admin delete design] cloudinary cleanup failed:', e?.message || e);
  }

  await design.deleteOne();
  res.json({ message: 'Design deleted' });
});

export default router;
