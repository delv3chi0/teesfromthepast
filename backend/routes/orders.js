// backend/routes/orders.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Order from '../models/Order.js';

const router = express.Router();

// @desc    Get logged in user's orders
// @route   GET /api/orders/myorders
// @access  Private
router.get('/myorders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }); // Sort by newest first
    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error.message);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// @desc    Get a single order by ID (for user, ensure it belongs to them)
// @route   GET /api/orders/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
  
      if (order) {
        // Check if the order belongs to the logged-in user
        if (order.user.toString() !== req.user._id.toString()) {
          return res.status(401).json({ message: 'Not authorized to view this order' });
        }
        res.json(order);
      } else {
        res.status(404).json({ message: 'Order not found' });
      }
    } catch (error) {
      console.error('Error fetching order by ID:', error.message);
      if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Order not found' });
      }
      res.status(500).json({ message: 'Failed to fetch order' });
    }
  });

export default router;
