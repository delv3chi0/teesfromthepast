import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Order from '../models/Order.js';
import asyncHandler from 'express-async-handler'; // Import asyncHandler

const router = express.Router();

// @desc    Get logged in user's orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
    // MODIFIED: This now populates all the necessary data for each order item
    const orders = await Order.find({ user: req.user._id })
        .populate({
            path: 'orderItems',
            populate: {
                path: 'designId',
                select: 'imageDataUrl' // Ensure we get the image URL from the design
            }
        })
        .sort({ createdAt: -1 });

    res.json(orders);
});

router.route('/myorders').get(protect, getMyOrders);


// @desc    Get a single order by ID (for user, ensure it belongs to them)
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate({
        path: 'orderItems',
        populate: {
            path: 'designId',
            select: 'imageDataUrl prompt'
        }
    });

    if (order) {
        // Check if the order belongs to the logged-in user or if the user is an admin
        if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            res.status(401);
            throw new Error('Not authorized to view this order');
        }
        res.json(order);
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

router.route('/:id').get(protect, getOrderById);


export default router;
