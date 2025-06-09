// backend/middleware/adminMiddleware.js
import asyncHandler from 'express-async-handler';

const admin = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    console.log(`[Admin Middleware] User ${req.user.username} (ID: ${req.user._id}) is an admin. Granting access.`);
    next();
  } else {
    console.warn(`[Admin Middleware] Access denied. User ${req.user ? req.user.username + ' (ID: ' + req.user._id + ')' : 'Unknown/Not Logged In'} is not an admin or req.user is not set correctly.`);
    res.status(403);
    throw new Error('Not authorized as an admin');
  }
});

export { admin }; // Make sure this line is exactly like this
