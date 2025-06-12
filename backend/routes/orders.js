import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Order from '../models/Order.js';
import asyncHandler from 'express-async-handler';

const router = express.Router();

// @desc    Get logged in user's orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  try {
    // MODIFIED: This now correctly populates the designId within each orderItem
    // to fetch the associated image data.
    const orders = await Order.find({ user: req.user._id })
      .populate({
        path: 'orderItems',
        populate: {
          path: 'designId',
          model: 'Design',
          select: 'imageDataUrl' // Ensure we get the image URL from the design
        }
      })
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error.message);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

router.get('/myorders', protect, getMyOrders);

// @desc    Get a single order by ID (for user, ensure it belongs to them)
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
    try {
        // MODIFIED: Also populate the items and designs for the single order view
        const order = await Order.findById(req.params.id).populate({
            path: 'orderItems',
            populate: {
                path: 'designId',
                model: 'Design',
                select: 'imageDataUrl prompt'
            }
        });

        if (order) {
            // Check if the order belongs to the logged-in user or if the user is an admin
            if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
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

router.get('/:id', protect, getOrderById);

export default router;
