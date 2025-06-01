// backend/routes/adminUserRoutes.js
import express from 'express';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js'; // User model
import { protect } from '../middleware/authMiddleware.js'; // Authentication middleware
import { admin } from '../middleware/adminMiddleware.js'; // Admin authorization middleware

const router = express.Router();

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
router.get(
  '/',
  protect, // Must be logged in
  admin,   // Must be an admin
  asyncHandler(async (req, res) => {
    console.log('[Admin Users Route] GET / - Fetching all users.');
    // Exclude password from the returned user objects
    const users = await User.find({}).select('-password');
    if (users) {
      console.log(`[Admin Users Route] GET / - Found ${users.length} users.`);
      res.json(users);
    } else {
      console.error('[Admin Users Route] GET / - No users found (this should not happen if DB is okay).');
      res.status(404);
      throw new Error('No users found');
    }
  })
);

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
router.get(
  '/:id',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    console.log(`[Admin Users Route] GET /${userId} - Fetching user by ID.`);
    // Exclude password
    const user = await User.findById(userId).select('-password');

    if (user) {
      console.log(`[Admin Users Route] GET /${userId} - User found: ${user.username}`);
      res.json(user);
    } else {
      console.warn(`[Admin Users Route] GET /${userId} - User not found.`);
      res.status(404);
      throw new Error('User not found');
    }
  })
);

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
router.put(
  '/:id',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const userIdToUpdate = req.params.id;
    console.log(`[Admin Users Route] PUT /${userIdToUpdate} - Attempting to update user.`);
    console.log(`[Admin Users Route] Request body:`, req.body);

    const user = await User.findById(userIdToUpdate);

    if (user) {
      // Fields that an admin can update
      user.username = req.body.username || user.username;
      user.email = req.body.email || user.email;
      user.firstName = req.body.firstName !== undefined ? req.body.firstName : user.firstName;
      user.lastName = req.body.lastName !== undefined ? req.body.lastName : user.lastName;
      
      // Explicitly handle isAdmin boolean. If undefined in req.body, don't change it.
      if (req.body.isAdmin !== undefined) {
        // Prevent admin from accidentally removing their own admin status if they are the only admin
        // or simply prevent self-update of isAdmin status via this route for safety.
        // For now, we'll allow changing isAdmin status for others.
        // A more complex check might be needed if you want to ensure at least one admin always exists.
        if (req.user._id.toString() === user._id.toString() && user.isAdmin && req.body.isAdmin === false) {
            console.warn(`[Admin Users Route] PUT /${userIdToUpdate} - Admin ${req.user.username} attempted to remove their own admin status. Denied for safety.`);
            res.status(400);
            throw new Error('Admins cannot remove their own admin status via this route.');
        }
        user.isAdmin = req.body.isAdmin;
      }

      // Password should not be updated here. If req.body.password exists, ignore it or send a warning.
      if (req.body.password) {
        console.warn(`[Admin Users Route] PUT /${userIdToUpdate} - Attempt to update password via admin route ignored.`);
        // Optionally, you could send a message back in the response if this is a common mistake.
      }

      const updatedUser = await user.save();
      console.log(`[Admin Users Route] PUT /${userIdToUpdate} - User ${updatedUser.username} updated successfully.`);
      
      // Send back user data without password
      const userToSend = { ...updatedUser.toObject() };
      delete userToSend.password;
      
      res.json(userToSend);

    } else {
      console.warn(`[Admin Users Route] PUT /${userIdToUpdate} - User not found for update.`);
      res.status(404);
      throw new Error('User not found');
    }
  })
);

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
router.delete(
  '/:id',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const userIdToDelete = req.params.id;
    console.log(`[Admin Users Route] DELETE /${userIdToDelete} - Attempting to delete user.`);

    // Prevent admin from deleting their own account
    if (req.user._id.toString() === userIdToDelete) {
      console.warn(`[Admin Users Route] DELETE /${userIdToDelete} - Admin ${req.user.username} attempted to delete their own account. Denied.`);
      res.status(400);
      throw new Error('Admins cannot delete their own account.');
    }

    const user = await User.findById(userIdToDelete);

    if (user) {
      // TODO: Consider what to do with user's associated data (designs, orders, etc.)
      // For example, you might anonymize them, reassign them, or delete them based on your app's rules.
      // This is a critical consideration for data integrity.
      // For now, we are just deleting the user document.
      
      await User.deleteOne({ _id: user._id }); // Use deleteOne or findByIdAndDelete
      console.log(`[Admin Users Route] DELETE /${userIdToDelete} - User ${user.username} deleted successfully.`);
      res.json({ message: 'User removed successfully' });
    } else {
      console.warn(`[Admin Users Route] DELETE /${userIdToDelete} - User not found for deletion.`);
      res.status(404);
      throw new Error('User not found');
    }
  })
);

export default router;
