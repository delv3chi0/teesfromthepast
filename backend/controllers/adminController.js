// backend/controllers/adminController.js
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Design from '../models/Design.js';

// --- USER MANAGEMENT CONTROLLERS ---

// @desc    Get all users (admin)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsersAdmin = asyncHandler(async (req, res) => {
  console.log('[Admin Controller] GET /users - Fetching all users.');
  const users = await User.find({}).select('-password'); // Exclude password
  if (users) {
    console.log(`[Admin Controller] GET /users - Found ${users.length} users.`);
    res.json(users);
  } else {
    // This case is unlikely if the DB is responsive, more likely to return an empty array.
    console.error('[Admin Controller] GET /users - No users found (should not happen).');
    res.status(404).json({ message: 'No users found' }); // Send JSON response
  }
});

// @desc    Get user by ID (admin)
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserByIdAdmin = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  console.log(`[Admin Controller] GET /users/${userId} - Fetching user by ID.`);
  const user = await User.findById(userId).select('-password');
  if (user) {
    console.log(`[Admin Controller] GET /users/${userId} - User found: ${user.username}`);
    res.json(user);
  } else {
    console.warn(`[Admin Controller] GET /users/${userId} - User not found.`);
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user (admin)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUserAdmin = asyncHandler(async (req, res) => {
  const userIdToUpdate = req.params.id;
  console.log(`[Admin Controller] PUT /users/${userIdToUpdate} - Attempting to update user.`);
  console.log(`[Admin Controller] Request body:`, req.body);

  const user = await User.findById(userIdToUpdate);

  if (user) {
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;
    user.firstName = req.body.firstName !== undefined ? req.body.firstName : user.firstName;
    user.lastName = req.body.lastName !== undefined ? req.body.lastName : user.lastName;

    if (req.body.isAdmin !== undefined) {
      if (req.user._id.toString() === user._id.toString() && user.isAdmin && req.body.isAdmin === false) {
        console.warn(`[Admin Controller] PUT /users/${userIdToUpdate} - Admin ${req.user.username} attempted to remove their own admin status. Denied.`);
        res.status(400);
        throw new Error('Admins cannot remove their own admin status.');
      }
      user.isAdmin = req.body.isAdmin;
    }

    if (req.body.password) {
      console.warn(`[Admin Controller] PUT /users/${userIdToUpdate} - Attempt to update password via admin route ignored.`);
    }

    const updatedUser = await user.save();
    console.log(`[Admin Controller] PUT /users/${userIdToUpdate} - User ${updatedUser.username} updated successfully.`);
    
    const userToSend = { ...updatedUser.toObject() };
    delete userToSend.password;
    res.json(userToSend);
  } else {
    console.warn(`[Admin Controller] PUT /users/${userIdToUpdate} - User not found for update.`);
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Delete user (admin)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUserAdmin = asyncHandler(async (req, res) => {
  const userIdToDelete = req.params.id;
  console.log(`[Admin Controller] DELETE /users/${userIdToDelete} - Attempting to delete user.`);

  if (req.user._id.toString() === userIdToDelete) {
    console.warn(`[Admin Controller] DELETE /users/${userIdToDelete} - Admin ${req.user.username} attempted to delete their own account. Denied.`);
    res.status(400);
    throw new Error('Admins cannot delete their own account.');
  }

  const user = await User.findById(userIdToDelete);
  if (user) {
    // TODO: Handle associated data (orders, designs by this user)
    await User.deleteOne({ _id: user._id });
    console.log(`[Admin Controller] DELETE /users/${userIdToDelete} - User ${user.username} deleted successfully.`);
    res.json({ message: 'User removed successfully' });
  } else {
    console.warn(`[Admin Controller] DELETE /users/${userIdToDelete} - User not found for deletion.`);
    res.status(404);
    throw new Error('User not found');
  }
});


// --- ORDER MANAGEMENT CONTROLLERS ---

// @desc    Get all orders (admin)
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrdersAdmin = asyncHandler(async (req, res) => {
  console.log('[Admin Controller] GET /orders - Fetching all orders.');
  // Consider adding pagination for large numbers of orders
  const orders = await Order.find({})
    .populate('user', 'id username email') // Populate basic user info
    .sort({ createdAt: -1 }); // Sort by newest first
  
  if (orders) {
    console.log(`[Admin Controller] GET /orders - Found ${orders.length} orders.`);
    res.json(orders);
  } else {
    // Unlikely to be null, more likely an empty array if no orders
    console.log('[Admin Controller] GET /orders - No orders found.');
    res.json([]);
  }
});

// --- DESIGN MANAGEMENT CONTROLLERS ---

// @desc    Get all designs (admin)
// @route   GET /api/admin/designs
// @access  Private/Admin
const getAllDesignsAdmin = asyncHandler(async (req, res) => {
  console.log('[Admin Controller] GET /designs - Fetching all designs.');
  // Consider adding pagination
  const designs = await Design.find({})
    .populate('user', 'id username email') // Populate basic user info (creator)
    .sort({ createdAt: -1 });
  
  if (designs) {
    console.log(`[Admin Controller] GET /designs - Found ${designs.length} designs.`);
    res.json(designs);
  } else {
    console.log('[Admin Controller] GET /designs - No designs found.');
    res.json([]);
  }
});


export {
  getAllUsersAdmin,
  getUserByIdAdmin,
  updateUserAdmin,
  deleteUserAdmin,
  getAllOrdersAdmin,
  getAllDesignsAdmin
};
