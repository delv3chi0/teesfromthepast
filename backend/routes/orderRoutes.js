// backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router();

// Assuming you have an authentication middleware that adds user info to req.user
const { protect } = require('../middleware/authMiddleware'); // ADJUST PATH if different

// Your controller function that fetches the orders
const { getMyOrders } = require('../controllers/orderController'); // ADJUST PATH if different

// Define the route for fetching a user's own orders
// It uses the 'protect' middleware to ensure only logged-in users can access it
// and then calls the 'getMyOrders' controller function.
router.route('/myorders').get(protect, getMyOrders);

// (OPTIONAL: Example of an admin route if you need to fetch all orders for admin)
// const { admin } = require('../middleware/authMiddleware'); // Assuming you have an admin middleware
// const { getAllOrders } = require('../controllers/orderController');
// router.route('/').get(protect, admin, getAllOrders); // Route for /api/orders (all orders)

module.exports = router;
