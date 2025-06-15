// backend/routes/orders.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Order from '../models/Order.js'; // Ensure this path and name are correct
import asyncHandler from 'express-async-handler'; // Used for async error handling
import Design from '../models/Design.js'; // Ensure Design model is imported if used in populate
import Product from '../models/Product.js'; // Ensure Product model is imported if used in populate


const router = express.Router();

// @desc    Get logged in user's orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate({ // Populate orderItems to access nested properties
                path: 'orderItems',
                populate: [ // Use an array for multiple nested populates within orderItems
                    {
                        path: 'designId', // Populate the design for the image
                        model: 'Design', // Specify the model if not directly inferred
                        select: 'imageDataUrl prompt' // Also get prompt for potential tooltips on frontend
                    },
                    {
                        path: 'productId', // Populate the product for its name
                        model: 'Product', // Specify the model if not directly inferred
                        select: 'name' // Just need the name for display on MyOrdersPage
                    }
                ]
            })
            // Optionally populate the user linked to the order itself
            .populate('user', 'username email') // Just getting basic user info for the order document
            .sort({ createdAt: -1 }) // Sort by newest first
            .lean(); // Use .lean() to convert Mongoose documents to plain JavaScript objects for performance and easier manipulation

        // Before sending, ensure fields match frontend expectations (productName, priceAtPurchase)
        const formattedOrders = orders.map(order => ({
            ...order,
            orderItems: order.orderItems.map(item => ({
                ...item,
                productName: item.name || item.productId?.name, // Use item.name from orderItemSchema, fallback to populated product.name
                priceAtPurchase: item.price, // Use item.price from orderItemSchema
                // quantity is already item.quantity
                // designId is populated
            })),
            // totalAmount is already in the main order document
        }));


        res.json(formattedOrders);
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
        // MODIFIED: Also populate productId for single order view consistency
        const order = await Order.findById(req.params.id).populate({
            path: 'orderItems',
            populate: [
                {
                    path: 'designId',
                    model: 'Design',
                    select: 'imageDataUrl prompt'
                },
                {
                    path: 'productId', // Populate product for single order view
                    model: 'Product',
                    select: 'name'
                }
            ]
        });

        if (order) {
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
