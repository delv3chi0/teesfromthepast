// backend/controllers/orderController.js
const Order = require('../models/Order'); // ADJUST PATH and ensure model name matches your file name and export
// Assuming you have a Design model if designId is a ref
const Design = require('../models/Design'); // ADJUST PATH if needed
const Product = require('../models/Product'); // ADJUST PATH if needed

// @desc    Get logged in user's orders
// @route   GET /api/orders/myorders
// @access  Private (requires authentication)
const getMyOrders = async (req, res) => {
  try {
    // Find orders where the 'user' field in the order matches the authenticated user's ID
    // req.user._id is typically set by your authentication middleware
    const orders = await Order.find({ user: req.user._id })
      .populate('user', 'username email') // Populate user details if you want to include them
      // Populate orderItems details: designId for image, productId for product details if needed
      .populate('orderItems.designId', 'imageDataUrl prompt') // Get image URL and prompt from Design model
      .populate('orderItems.productId', 'name') // Get product name if productId is a reference
      .lean(); // .lean() makes the Mongoose document a plain JS object, often faster for reading

    if (!orders) {
      return res.status(404).json({ message: 'No orders found for this user' });
    }

    // Adjust item.name and item.price to match frontend's expected structure if necessary
    const formattedOrders = orders.map(order => ({
        ...order,
        orderItems: order.orderItems.map(item => ({
            ...item,
            // Ensure productName comes from item.name (from schema) or populated product.name
            productName: item.name || item.productId?.name,
            // Ensure priceAtPurchase comes from item.price (from schema)
            priceAtPurchase: item.price,
            // Ensure quantity is correct
            quantity: item.quantity,
            // Ensure designId is populated for image display
            designId: item.designId,
        })),
        // Ensure totalAmount is handled (already in schema)
    }));


    res.json(formattedOrders); // Send the found orders as JSON
  } catch (error) {
    console.error(`Error in getMyOrders for user ${req.user?._id}: ${error.message}`);
    res.status(500).json({ message: 'Server error fetching your orders.' });
  }
};

// You might have other order-related controller functions here, e.g., createOrder, getOrderById, updateOrder, deleteOrder
// For the AdminPage, you would have a similar function that does NOT filter by req.user._id
/*
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({}) // No user filter for admin
                                .populate('user', 'username email')
                                .populate('orderItems.designId', 'imageDataUrl prompt')
                                .populate('orderItems.productId', 'name')
                                .lean();
    res.json(orders);
  } catch (error) {
    console.error(`Error in getAllOrders (Admin): ${error.message}`);
    res.status(500).json({ message: 'Server error fetching all orders.' });
  }
};
*/

module.exports = { getMyOrders /*, getAllOrders */ };
